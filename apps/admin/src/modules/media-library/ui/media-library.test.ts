import { describe, expect, it, vi } from 'vitest';

import { uploadMediaFile } from '../model/media-upload';

describe('uploadMediaFile', () => {
  it('sends bytes to the presigned URL and only metadata to the API client', async () => {
    const file = new File(['panorama bytes'], 'son-trang.webp', { type: 'image/webp' });
    const put = vi.fn(async () => new Response(null, { status: 200 }));
    const presign = vi.fn(async () => ({
      data: {
        asset: {
          contentType: 'image/webp',
          createdAt: '2026-08-08T00:00:00.000Z',
          etag: null,
          failureCode: null,
          id: 'asset-01',
          mediaKind: 'panorama' as const,
          originalFilename: file.name,
          readyAt: null,
          sizeBytes: file.size,
          status: 'pending' as const,
          storageKey: 'media/asset-01',
          updatedAt: '2026-08-08T00:00:00.000Z',
          uploadedAt: null,
        },
        expiresInSeconds: 900,
        requiredHeaders: { 'x-amz-meta-media-kind': 'panorama' },
        uploadUrl: 'https://storage.example.test/upload/asset-01',
      },
      headers: new Headers(),
      status: 201 as const,
    }));
    const complete = vi.fn(async () => ({
      data: {
        contentType: 'image/webp',
        createdAt: '2026-08-08T00:00:00.000Z',
        etag: 'etag-01',
        failureCode: null,
        id: 'asset-01',
        mediaKind: 'panorama' as const,
        originalFilename: file.name,
        readyAt: null,
        sizeBytes: file.size,
        status: 'uploaded' as const,
        storageKey: 'media/asset-01',
        updatedAt: '2026-08-08T00:00:00.000Z',
        uploadedAt: '2026-08-08T00:00:00.000Z',
      },
      headers: new Headers(),
      status: 200 as const,
    }));

    await uploadMediaFile(file, { complete, presign, put });

    expect(presign).toHaveBeenCalledWith({
      contentType: 'image/webp',
      mediaKind: 'panorama',
      originalFilename: 'son-trang.webp',
      sizeBytes: file.size,
    });
    expect(put).toHaveBeenCalledWith(
      'https://storage.example.test/upload/asset-01',
      expect.objectContaining({ body: file, method: 'PUT' }),
    );
    expect(complete).toHaveBeenCalledWith('asset-01');
  });
});
