import { randomUUID } from 'node:crypto';

export type MediaAssetKind = 'panorama' | 'image' | 'audio' | 'model3d';
export type MediaAssetStatus = 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed';

export interface MediaAssetProps {
  id: string;
  mediaKind: MediaAssetKind;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  status: MediaAssetStatus;
  etag: string | null;
  failureCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  uploadedAt: Date | null;
  readyAt: Date | null;
}

export interface CreateMediaAssetInput {
  id?: string;
  mediaKind: MediaAssetKind;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
}

export interface CompleteMediaAssetInput {
  etag: string;
  sizeBytes: number;
}

export class MediaAssetStateError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'MediaAssetStateError';
  }
}

export class MediaAsset {
  private constructor(private props: MediaAssetProps) {}

  static create(input: CreateMediaAssetInput): MediaAsset {
    const now = new Date();
    return new MediaAsset(
      validateProps({
        id: input.id ?? randomUUID(),
        mediaKind: input.mediaKind,
        originalFilename: input.originalFilename,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        status: 'pending',
        etag: null,
        failureCode: null,
        createdAt: now,
        updatedAt: now,
        uploadedAt: null,
        readyAt: null,
      }),
    );
  }

  static rehydrate(props: MediaAssetProps): MediaAsset {
    return new MediaAsset(validateProps(props));
  }

  get id() {
    return this.props.id;
  }

  get status() {
    return this.props.status;
  }

  get failureCode() {
    return this.props.failureCode;
  }

  markUploaded(input: CompleteMediaAssetInput) {
    this.assertStatus('pending', 'MEDIA_ALREADY_COMPLETED');
    if (input.sizeBytes !== this.props.sizeBytes) {
      throw new MediaAssetStateError(
        'MEDIA_SIZE_MISMATCH',
        'Uploaded object size does not match the presigned upload request.',
      );
    }
    if (!input.etag.trim()) {
      throw new MediaAssetStateError('MEDIA_ETAG_REQUIRED', 'Uploaded object etag is required.');
    }

    const now = new Date();
    this.props = {
      ...this.props,
      status: 'uploaded',
      etag: input.etag.trim(),
      failureCode: null,
      updatedAt: now,
      uploadedAt: now,
    };
  }

  markProcessing() {
    this.assertStatus('uploaded', 'MEDIA_NOT_UPLOADED');
    this.props = {
      ...this.props,
      status: 'processing',
      updatedAt: new Date(),
    };
  }

  markReady() {
    if (this.props.status !== 'uploaded' && this.props.status !== 'processing') {
      throw new MediaAssetStateError(
        'MEDIA_NOT_PROCESSABLE',
        `Media asset cannot become ready from ${this.props.status}.`,
      );
    }

    const now = new Date();
    this.props = {
      ...this.props,
      status: 'ready',
      failureCode: null,
      updatedAt: now,
      readyAt: now,
    };
  }

  markFailed(failureCode: string) {
    if (!['pending', 'uploaded', 'processing'].includes(this.props.status)) {
      throw new MediaAssetStateError(
        'MEDIA_NOT_FAILABLE',
        `Media asset cannot fail from ${this.props.status}.`,
      );
    }
    if (!failureCode.trim()) {
      throw new MediaAssetStateError(
        'MEDIA_FAILURE_CODE_REQUIRED',
        'Media failure code is required.',
      );
    }

    this.props = {
      ...this.props,
      status: 'failed',
      failureCode: failureCode.trim(),
      updatedAt: new Date(),
    };
  }

  toPrimitives(): MediaAssetProps {
    return {
      ...this.props,
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
      uploadedAt: this.props.uploadedAt ? new Date(this.props.uploadedAt) : null,
      readyAt: this.props.readyAt ? new Date(this.props.readyAt) : null,
    };
  }

  private assertStatus(expected: MediaAssetStatus, code: string) {
    if (this.props.status !== expected) {
      throw new MediaAssetStateError(
        code,
        `Media asset must be ${expected} before this operation; current state is ${this.props.status}.`,
      );
    }
  }
}

function validateProps(props: MediaAssetProps): MediaAssetProps {
  if (!props.id.trim() || !props.storageKey.trim()) {
    throw new MediaAssetStateError('INVALID_MEDIA', 'Media id and storage key are required.');
  }
  if (!props.originalFilename.trim() || props.originalFilename.length > 240) {
    throw new MediaAssetStateError('INVALID_MEDIA', 'Media original filename is required.');
  }
  if (!props.contentType.trim() || props.contentType.length > 160) {
    throw new MediaAssetStateError('INVALID_MEDIA', 'Media content type is required.');
  }
  if (!Number.isSafeInteger(props.sizeBytes) || props.sizeBytes <= 0) {
    throw new MediaAssetStateError('INVALID_MEDIA', 'Media size must be a positive safe integer.');
  }

  return {
    ...props,
    originalFilename: props.originalFilename.trim(),
    contentType: props.contentType.trim().toLowerCase(),
    storageKey: props.storageKey.trim(),
  };
}
