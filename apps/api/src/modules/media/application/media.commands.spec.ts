import { describe, expect, it } from 'vitest';

import { MediaCommandService } from './media.commands';
import { MediaUploadRuleError } from './media.errors';
import type { MediaAssetRepository } from './media.repository';
import type { ObjectStoragePort, StoredObjectMetadata } from './object-storage.port';

class InMemoryMediaRepository implements MediaAssetRepository {
  readonly assets = new Map<string, Parameters<MediaAssetRepository['save']>[0]>();

  async save(asset: Parameters<MediaAssetRepository['save']>[0]) {
    this.assets.set(asset.id, asset);
  }

  async findById(id: string) {
    return this.assets.get(id) ?? null;
  }

  async findByIds(ids: string[]) {
    return new Map(
      ids.flatMap((id) => {
        const asset = this.assets.get(id);
        return asset ? [[id, asset] as const] : [];
      }),
    );
  }
}

class FakeObjectStorage implements ObjectStoragePort {
  readonly presignCalls: Array<Parameters<ObjectStoragePort['createPresignedUpload']>[0]> = [];
  object: StoredObjectMetadata | null = null;

  async createPresignedUpload(input: Parameters<ObjectStoragePort['createPresignedUpload']>[0]) {
    this.presignCalls.push(input);
    return {
      url: `http://minio.test/upload/${input.storageKey}`,
      expiresInSeconds: input.expiresInSeconds,
      requiredHeaders: { 'content-type': input.contentType },
    };
  }

  async headObject() {
    return this.object;
  }

  async openObjectReadStream() {
    return null;
  }

  async putObject() {}
}

describe('MediaCommandService', () => {
  it('creates pending metadata and returns a presigned upload URL', async () => {
    const repository = new InMemoryMediaRepository();
    const storage = new FakeObjectStorage();
    const service = new MediaCommandService(repository, storage, {
      maxSizeBytes: 100_000,
      presignExpiresInSeconds: 600,
    });

    const result = await service.presignUpload({
      mediaKind: 'panorama',
      originalFilename: 'son-trang.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 12_000,
    });

    expect(result.asset.status).toBe('pending');
    expect(result.uploadUrl).toContain(result.asset.storageKey);
    expect(storage.presignCalls).toEqual([
      expect.objectContaining({
        contentType: 'image/jpeg',
        sizeBytes: 12_000,
        expiresInSeconds: 600,
      }),
    ]);
    expect(repository.assets.get(result.asset.id)).toBeDefined();
  });

  it('completes only after the storage object exists and metadata matches', async () => {
    const repository = new InMemoryMediaRepository();
    const storage = new FakeObjectStorage();
    const service = new MediaCommandService(repository, storage, {
      maxSizeBytes: 100_000,
      presignExpiresInSeconds: 600,
    });
    const pending = await service.presignUpload({
      mediaKind: 'panorama',
      originalFilename: 'son-trang.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 12_000,
    });

    storage.object = {
      contentType: 'image/jpeg',
      etag: 'etag-01',
      sizeBytes: 12_000,
    };

    const completed = await service.completeUpload(pending.asset.id);

    expect(completed.status).toBe('uploaded');
    expect(completed.etag).toBe('etag-01');
  });

  it('rejects files above the configured limit before storage is contacted', async () => {
    const repository = new InMemoryMediaRepository();
    const storage = new FakeObjectStorage();
    const service = new MediaCommandService(repository, storage, {
      maxSizeBytes: 100,
      presignExpiresInSeconds: 600,
    });

    await expectErrorCode(
      service.presignUpload({
        mediaKind: 'panorama',
        originalFilename: 'too-large.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 101,
      }),
      'MEDIA_SIZE_LIMIT_EXCEEDED',
    );
    expect(storage.presignCalls).toHaveLength(0);
  });
});

async function expectErrorCode(action: Promise<unknown>, code: string) {
  try {
    await action;
    throw new Error('Expected action to reject.');
  } catch (error) {
    expect(error).toBeInstanceOf(MediaUploadRuleError);
    expect((error as MediaUploadRuleError).code).toBe(code);
  }
}
