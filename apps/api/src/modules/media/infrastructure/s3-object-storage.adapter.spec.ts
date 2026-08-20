import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { S3ObjectStorageAdapter } from './s3-object-storage.adapter';

const options = {
  endpoint: 'http://127.0.0.1:59000',
  region: 'us-east-1',
  accessKeyId: 'test',
  secretAccessKey: 'test-secret',
  bucket: 'hatinh-test',
  forcePathStyle: true,
};

describe('S3ObjectStorageAdapter panorama processing operations', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns null when the source object is missing', async () => {
    vi.spyOn(S3Client.prototype, 'send').mockRejectedValueOnce({
      $metadata: { httpStatusCode: 404 },
    });
    const adapter = new S3ObjectStorageAdapter(options);

    await expect(adapter.openObjectReadStream('original/missing.webp')).resolves.toBeNull();
  });

  it('returns the readable body from GetObject', async () => {
    const body = Readable.from([Buffer.from('panorama')]);
    const send = vi
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValueOnce({ Body: body } as never);
    const adapter = new S3ObjectStorageAdapter(options);

    await expect(adapter.openObjectReadStream('original/source.webp')).resolves.toBe(body);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetObjectCommand);
  });

  it('writes the exact derivative key, content, cache policy, and bytes', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockImplementation(async (command) => {
      if (command instanceof HeadBucketCommand || command instanceof PutObjectCommand) return {};
      throw new Error(`Unexpected command: ${command.constructor.name}`);
    });
    const adapter = new S3ObjectStorageAdapter(options);
    const body = new Uint8Array([1, 2, 3]);

    await adapter.putObject({
      storageKey: 'processed/panorama/asset/preview.webp',
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
      body,
    });

    const put = send.mock.calls
      .map(([command]) => command)
      .find((command) => command instanceof PutObjectCommand);
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect((put as PutObjectCommand).input).toEqual({
      Bucket: 'hatinh-test',
      Key: 'processed/panorama/asset/preview.webp',
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
      Body: body,
    });
  });
});
