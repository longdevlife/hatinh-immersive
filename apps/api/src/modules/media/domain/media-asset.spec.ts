import { describe, expect, it } from 'vitest';

import { MediaAsset, MediaAssetStateError } from './media-asset';

const baseInput = {
  originalFilename: 'son-trang-01.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 12_000,
  storageKey: 'media/asset-01/original.jpg',
  mediaKind: 'panorama' as const,
};

describe('MediaAsset', () => {
  it('models the upload lifecycle from pending to uploaded and processing-ready', () => {
    const asset = MediaAsset.create({ ...baseInput, id: 'asset-01' });

    expect(asset.toPrimitives()).toMatchObject({
      id: 'asset-01',
      status: 'pending',
      mediaKind: 'panorama',
    });

    asset.markUploaded({ etag: 'etag-01', sizeBytes: baseInput.sizeBytes });
    expect(asset.status).toBe('uploaded');

    asset.markProcessing();
    expect(asset.status).toBe('processing');

    asset.markReady();
    expect(asset.status).toBe('ready');
    expect(asset.toPrimitives()).toMatchObject({
      etag: 'etag-01',
      readyAt: expect.any(Date),
    });
  });

  it('rejects invalid lifecycle transitions and mismatched completed metadata', () => {
    const asset = MediaAsset.create({ ...baseInput, id: 'asset-02' });

    expect(() => asset.markProcessing()).toThrow(MediaAssetStateError);
    expectErrorCode(
      () => asset.markUploaded({ etag: 'etag-02', sizeBytes: 1 }),
      'MEDIA_SIZE_MISMATCH',
    );

    asset.markUploaded({ etag: 'etag-02', sizeBytes: baseInput.sizeBytes });
    expect(() => asset.markUploaded({ etag: 'etag-02', sizeBytes: baseInput.sizeBytes })).toThrow(
      MediaAssetStateError,
    );
  });

  it('allows a failed upload to be retried only by creating a new asset', () => {
    const asset = MediaAsset.create({ ...baseInput, id: 'asset-03' });

    asset.markFailed('UPLOAD_TIMEOUT');
    expect(asset.status).toBe('failed');
    expect(asset.failureCode).toBe('UPLOAD_TIMEOUT');
    expect(() => asset.markUploaded({ etag: 'etag-03', sizeBytes: baseInput.sizeBytes })).toThrow(
      MediaAssetStateError,
    );
  });

  it('begins processing from uploaded and resumes processing as a no-op', () => {
    const asset = MediaAsset.create({ ...baseInput, id: 'asset-04' });
    asset.markUploaded({ etag: 'etag-04', sizeBytes: baseInput.sizeBytes });

    asset.beginOrResumeProcessing();
    const firstUpdatedAt = asset.toPrimitives().updatedAt;
    expect(asset.status).toBe('processing');

    asset.beginOrResumeProcessing();
    expect(asset.status).toBe('processing');
    expect(asset.toPrimitives().updatedAt).toEqual(firstUpdatedAt);
  });

  it('rejects processing a ready asset because production output is immutable', () => {
    const asset = MediaAsset.create({ ...baseInput, id: 'asset-05' });
    asset.markUploaded({ etag: 'etag-05', sizeBytes: baseInput.sizeBytes });
    asset.markReady();

    expectErrorCode(() => asset.beginOrResumeProcessing(), 'MEDIA_NOT_PROCESSABLE');
  });
});

function expectErrorCode(action: () => void, code: string) {
  try {
    action();
    throw new Error('Expected action to throw.');
  } catch (error) {
    expect(error).toBeInstanceOf(MediaAssetStateError);
    expect((error as MediaAssetStateError).code).toBe(code);
  }
}
