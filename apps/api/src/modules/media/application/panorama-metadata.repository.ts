export const PANORAMA_METADATA_REPOSITORY = Symbol('PANORAMA_METADATA_REPOSITORY');

export type PanoramaQualityStatus = 'pending' | 'accepted' | 'rejected';
export type PanoramaRights = 'customer-owned' | 'licensed';

export interface PanoramaAssetMetadata {
  mediaAssetId: string;
  projection: 'equirectangular';
  sourceWidthPx: number | null;
  sourceHeightPx: number | null;
  qualityStatus: PanoramaQualityStatus;
  qualityCode: string | null;
  manifestKey: string | null;
  previewKey: string | null;
  rights: PanoramaRights;
  rightsHolder: string;
  rightsReference: string;
  sourceReference: string;
  version: string;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PanoramaMetadataRepository {
  save(metadata: PanoramaAssetMetadata): Promise<void>;
  findByMediaAssetId(mediaAssetId: string): Promise<PanoramaAssetMetadata | null>;
  findByMediaAssetIds(mediaAssetIds: string[]): Promise<Map<string, PanoramaAssetMetadata>>;
}
