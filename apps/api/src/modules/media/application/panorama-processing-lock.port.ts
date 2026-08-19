export const PANORAMA_PROCESSING_LOCK = Symbol('PANORAMA_PROCESSING_LOCK');

export interface PanoramaProcessingLockPort {
  withLock<T>(mediaAssetId: string, work: () => Promise<T>): Promise<T>;
}
