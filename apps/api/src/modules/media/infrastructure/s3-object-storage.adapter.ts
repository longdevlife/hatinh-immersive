import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, Optional } from '@nestjs/common';

import { loadEnvironment } from '../../../core/config/environment';
import type {
  CreatePresignedUploadInput,
  ObjectStoragePort,
  PresignedUpload,
  StoredObjectMetadata,
} from '../application/object-storage.port';

export interface S3ObjectStorageOptions {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}

export const S3_OBJECT_STORAGE_OPTIONS = Symbol('S3_OBJECT_STORAGE_OPTIONS');

@Injectable()
export class S3ObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;
  private bucketReady: Promise<void> | null = null;

  constructor(@Optional() @Inject(S3_OBJECT_STORAGE_OPTIONS) options?: S3ObjectStorageOptions) {
    const resolvedOptions = options ?? toDefaultOptions();
    this.bucket = resolvedOptions.bucket;
    this.client = new S3Client({
      endpoint: resolvedOptions.endpoint,
      forcePathStyle: resolvedOptions.forcePathStyle,
      region: resolvedOptions.region,
      credentials: {
        accessKeyId: resolvedOptions.accessKeyId,
        secretAccessKey: resolvedOptions.secretAccessKey,
      },
    });
  }

  async createPresignedUpload(input: CreatePresignedUploadInput): Promise<PresignedUpload> {
    await this.ensureBucket();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      ContentType: input.contentType,
      Key: input.storageKey,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });

    return {
      url,
      expiresInSeconds: input.expiresInSeconds,
      requiredHeaders: { 'content-type': input.contentType },
    };
  }

  async headObject(storageKey: string): Promise<StoredObjectMetadata | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        }),
      );

      if (result.ContentLength === undefined) {
        throw new Error('S3_OBJECT_SIZE_UNAVAILABLE');
      }

      return {
        contentType: result.ContentType ?? null,
        etag: result.ETag ?? null,
        sizeBytes: result.ContentLength,
      };
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  private async ensureBucket(): Promise<void> {
    if (!this.bucketReady) {
      this.bucketReady = this.createBucketIfMissing();
    }
    await this.bucketReady;
  }

  private async createBucketIfMissing(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }

      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (createError) {
        if (!isBucketAlreadyOwned(createError)) {
          throw createError;
        }
      }
    }
  }
}

function toDefaultOptions(): S3ObjectStorageOptions {
  const environment = loadEnvironment();
  return {
    ...environment.storage,
  };
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    '$metadata' in error &&
    typeof error.$metadata === 'object' &&
    error.$metadata !== null &&
    'httpStatusCode' in error.$metadata &&
    error.$metadata.httpStatusCode === 404
  );
}

function isBucketAlreadyOwned(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    '$metadata' in error &&
    typeof error.$metadata === 'object' &&
    error.$metadata !== null &&
    'httpStatusCode' in error.$metadata &&
    [409, 403].includes(Number(error.$metadata.httpStatusCode))
  );
}
