import { Inject, Injectable } from '@nestjs/common';

import { MediaAssetStateError } from '../domain/media-asset';
import { panoramaDerivativePrefix } from '../domain/panorama-derivative';
import { MEDIA_ASSET_REPOSITORY, type MediaAssetRepository } from './media.repository';
import { OBJECT_STORAGE, type ObjectStoragePort } from './object-storage.port';
import {
  PANORAMA_METADATA_REPOSITORY,
  type PanoramaAssetMetadata,
  type PanoramaMetadataRepository,
  type PanoramaRights,
} from './panorama-metadata.repository';
import {
  PANORAMA_PROCESSOR,
  type PanoramaProcessingOutput,
  type PanoramaProcessorPort,
} from './panorama-processing.port';

export interface ProcessPanoramaInput {
  mediaAssetId: string;
  rights: PanoramaRights;
  rightsHolder: string;
  rightsReference: string;
  sourceReference: string;
  version: string;
}

export class PanoramaIngestionError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'PanoramaIngestionError';
  }
}

@Injectable()
export class PanoramaIngestionService {
  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaRepository: MediaAssetRepository,
    @Inject(PANORAMA_METADATA_REPOSITORY)
    private readonly metadataRepository: PanoramaMetadataRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(PANORAMA_PROCESSOR) private readonly processor: PanoramaProcessorPort,
  ) {}

  async process(input: ProcessPanoramaInput): Promise<PanoramaAssetMetadata> {
    const normalized = validateInput(input);
    const asset = await this.mediaRepository.findById(normalized.mediaAssetId);
    if (!asset) throw new PanoramaIngestionError('PANORAMA_MEDIA_ASSET_NOT_FOUND');
    if (asset.mediaKind !== 'panorama') {
      throw new PanoramaIngestionError('PANORAMA_MEDIA_KIND_REQUIRED');
    }

    asset.beginOrResumeProcessing();
    await this.mediaRepository.save(asset);
    let output: PanoramaProcessingOutput | null = null;

    try {
      const source = await this.storage.openObjectReadStream(asset.storageKey);
      if (!source) throw new PanoramaIngestionError('PANORAMA_SOURCE_NOT_FOUND');
      output = await this.processor.process({
        assetId: asset.id,
        source,
        sourceContentType: asset.contentType,
      });

      const prefix = panoramaDerivativePrefix(asset.id);
      await this.putDerivative(`${prefix}/preview.webp`, 'image/webp', output.preview);
      for (const tile of output.tiles) {
        await this.putDerivative(`${prefix}/${tile.keySuffix}`, tile.contentType, tile.body);
      }
      await this.putDerivative(`${prefix}/manifest.json`, 'application/json', output.manifest);

      const metadata = createMetadata(normalized, output, {
        qualityStatus: 'accepted',
        qualityCode: null,
        manifestKey: `${prefix}/manifest.json`,
        previewKey: `${prefix}/preview.webp`,
      });
      await this.metadataRepository.save(metadata);
      asset.markReady();
      await this.mediaRepository.save(asset);
      return metadata;
    } catch (error) {
      const code = toFailureCode(error);
      if (asset.status === 'processing') {
        asset.markFailed(code);
        await this.metadataRepository.save(
          createMetadata(normalized, output, {
            qualityStatus: 'rejected',
            qualityCode: code,
            manifestKey: null,
            previewKey: null,
          }),
        );
        await this.mediaRepository.save(asset);
      }
      throw new PanoramaIngestionError(code);
    }
  }

  private async putDerivative(storageKey: string, contentType: string, body: Uint8Array) {
    try {
      await this.storage.putObject({
        storageKey,
        contentType,
        body,
        cacheControl: 'public, max-age=31536000, immutable',
      });
    } catch {
      throw new PanoramaIngestionError('PANORAMA_DERIVATIVE_UPLOAD_FAILED');
    }
  }
}

function validateInput(input: ProcessPanoramaInput): ProcessPanoramaInput {
  const required: Array<[keyof ProcessPanoramaInput, string]> = [
    ['mediaAssetId', 'PANORAMA_MEDIA_ASSET_REQUIRED'],
    ['rightsHolder', 'PANORAMA_RIGHTS_INCOMPLETE'],
    ['rightsReference', 'PANORAMA_RIGHTS_INCOMPLETE'],
    ['sourceReference', 'PANORAMA_SOURCE_REFERENCE_REQUIRED'],
    ['version', 'PANORAMA_VERSION_REQUIRED'],
  ];
  for (const [field, code] of required) {
    const value = input[field];
    if (typeof value !== 'string' || !value.trim()) throw new PanoramaIngestionError(code);
  }
  if (!['customer-owned', 'licensed'].includes(input.rights)) {
    throw new PanoramaIngestionError('PANORAMA_RIGHTS_INCOMPLETE');
  }
  return {
    ...input,
    mediaAssetId: input.mediaAssetId.trim(),
    rightsHolder: input.rightsHolder.trim(),
    rightsReference: input.rightsReference.trim(),
    sourceReference: input.sourceReference.trim(),
    version: input.version.trim(),
  };
}

function createMetadata(
  input: ProcessPanoramaInput,
  output: PanoramaProcessingOutput | null,
  state: Pick<
    PanoramaAssetMetadata,
    'qualityStatus' | 'qualityCode' | 'manifestKey' | 'previewKey'
  >,
): PanoramaAssetMetadata {
  const now = new Date();
  return {
    mediaAssetId: input.mediaAssetId,
    projection: 'equirectangular',
    sourceWidthPx: output?.widthPx ?? null,
    sourceHeightPx: output?.heightPx ?? null,
    ...state,
    rights: input.rights,
    rightsHolder: input.rightsHolder,
    rightsReference: input.rightsReference,
    sourceReference: input.sourceReference,
    version: input.version,
    processedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function toFailureCode(error: unknown): string {
  if (
    error instanceof PanoramaIngestionError ||
    error instanceof MediaAssetStateError ||
    (error instanceof Error && error.name === 'PanoramaProcessingError')
  ) {
    return 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'PANORAMA_PROCESSING_FAILED';
  }
  return 'PANORAMA_PROCESSING_FAILED';
}
