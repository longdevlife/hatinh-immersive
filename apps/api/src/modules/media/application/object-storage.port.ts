export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface CreatePresignedUploadInput {
  contentType: string;
  expiresInSeconds: number;
  sizeBytes: number;
  storageKey: string;
}

export interface PresignedUpload {
  url: string;
  expiresInSeconds: number;
  requiredHeaders: Record<string, string>;
}

export interface StoredObjectMetadata {
  contentType: string | null;
  etag: string | null;
  sizeBytes: number;
}

export interface ObjectStoragePort {
  createPresignedUpload(input: CreatePresignedUploadInput): Promise<PresignedUpload>;
  headObject(storageKey: string): Promise<StoredObjectMetadata | null>;
}
