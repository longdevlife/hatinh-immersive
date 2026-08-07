import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { MediaAsset, type MediaAssetKind, type MediaAssetProps } from '../domain/media-asset';
import {
  MediaAssetNotFoundError,
  MediaObjectMissingError,
  MediaUploadRuleError,
} from './media.errors';
import { MEDIA_ASSET_REPOSITORY, type MediaAssetRepository } from './media.repository';
import { OBJECT_STORAGE, type ObjectStoragePort } from './object-storage.port';

export const MEDIA_UPLOAD_POLICY = Symbol('MEDIA_UPLOAD_POLICY');

export interface MediaUploadPolicy {
  maxSizeBytes: number;
  presignExpiresInSeconds: number;
}

export interface PresignUploadInput {
  mediaKind: MediaAssetKind;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
}

export interface PresignUploadResult {
  asset: MediaAssetProps;
  requiredHeaders: Record<string, string>;
  uploadUrl: string;
  expiresInSeconds: number;
}

const supportedContentTypes = new Set([
  'audio/mpeg',
  'audio/wav',
  'image/jpeg',
  'image/png',
  'image/webp',
  'model/gltf+json',
  'model/gltf-binary',
]);

@Injectable()
export class MediaCommandService {
  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly repository: MediaAssetRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(MEDIA_UPLOAD_POLICY) private readonly policy: MediaUploadPolicy,
  ) {}

  async presignUpload(input: PresignUploadInput): Promise<PresignUploadResult> {
    this.assertUploadAllowed(input);

    const id = randomUUID();
    const asset = MediaAsset.create({
      id,
      mediaKind: input.mediaKind,
      originalFilename: input.originalFilename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      storageKey: `original/${id}/${toSafeFilename(input.originalFilename)}`,
    });
    await this.repository.save(asset);

    const upload = await this.storage.createPresignedUpload({
      contentType: asset.toPrimitives().contentType,
      expiresInSeconds: this.policy.presignExpiresInSeconds,
      sizeBytes: asset.toPrimitives().sizeBytes,
      storageKey: asset.toPrimitives().storageKey,
    });

    return {
      asset: asset.toPrimitives(),
      requiredHeaders: upload.requiredHeaders,
      uploadUrl: upload.url,
      expiresInSeconds: upload.expiresInSeconds,
    };
  }

  async completeUpload(id: string): Promise<MediaAssetProps> {
    const asset = await this.repository.findById(id);
    if (!asset) {
      throw new MediaAssetNotFoundError(id);
    }

    const object = await this.storage.headObject(asset.toPrimitives().storageKey);
    if (!object || object.etag === null) {
      throw new MediaObjectMissingError();
    }
    if (object.sizeBytes !== asset.toPrimitives().sizeBytes) {
      throw new MediaUploadRuleError(
        'MEDIA_SIZE_MISMATCH',
        'Uploaded object size does not match the presigned upload request.',
      );
    }
    if (
      object.contentType !== null &&
      object.contentType.toLowerCase() !== asset.toPrimitives().contentType
    ) {
      throw new MediaUploadRuleError(
        'MEDIA_CONTENT_TYPE_MISMATCH',
        'Uploaded object content type does not match the presigned upload request.',
      );
    }

    asset.markUploaded({ etag: object.etag, sizeBytes: object.sizeBytes });
    await this.repository.save(asset);
    return asset.toPrimitives();
  }

  private assertUploadAllowed(input: PresignUploadInput) {
    if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) {
      throw new MediaUploadRuleError(
        'MEDIA_SIZE_INVALID',
        'Media size must be a positive integer.',
      );
    }
    if (input.sizeBytes > this.policy.maxSizeBytes) {
      throw new MediaUploadRuleError(
        'MEDIA_SIZE_LIMIT_EXCEEDED',
        `Media size cannot exceed ${this.policy.maxSizeBytes} bytes.`,
      );
    }
    if (!supportedContentTypes.has(input.contentType.trim().toLowerCase())) {
      throw new MediaUploadRuleError(
        'MEDIA_CONTENT_TYPE_UNSUPPORTED',
        `Content type ${input.contentType} is not supported for direct upload.`,
      );
    }
  }
}

function toSafeFilename(filename: string): string {
  const lastSegment = filename.trim().replaceAll('\\', '/').split('/').at(-1) ?? 'upload';
  const safe = lastSegment.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  return safe.slice(0, 160) || 'upload';
}
