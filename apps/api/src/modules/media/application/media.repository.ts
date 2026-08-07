import type { MediaAsset } from '../domain/media-asset';

export const MEDIA_ASSET_REPOSITORY = Symbol('MEDIA_ASSET_REPOSITORY');

export interface MediaAssetRepository {
  save(asset: MediaAsset): Promise<void>;
  findById(id: string): Promise<MediaAsset | null>;
}
