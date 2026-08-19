import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { MediaAsset, type MediaAssetProps } from '../domain/media-asset';
import type { MediaAssetRepository } from './media.repository';
import type { ObjectStoragePort, PutStoredObjectInput } from './object-storage.port';
import type { PanoramaProcessingOutput, PanoramaProcessorPort } from './panorama-processing.port';
import type { PanoramaProcessingLockPort } from './panorama-processing-lock.port';
import type {
  PanoramaAssetMetadata,
  PanoramaMetadataRepository,
} from './panorama-metadata.repository';
import { PanoramaIngestionService } from './panorama-ingestion.service';

const validInput = {
  mediaAssetId: 'panorama-asset',
  rights: 'customer-owned' as const,
  rightsHolder: 'Hà Tĩnh Tourism',
  rightsReference: 'approval-2026-08',
  sourceReference: 'customer-delivery-01',
  version: '2026-08-v1',
};

describe('PanoramaIngestionService', () => {
  it.each([
    [
      'undefined rights holder',
      { ...validInput, rightsHolder: undefined },
      'PANORAMA_RIGHTS_INCOMPLETE',
    ],
    ['null media asset id', { ...validInput, mediaAssetId: null }, 'PANORAMA_MEDIA_ASSET_REQUIRED'],
  ])('rejects %s with a stable validation code', async (_case, input, code) => {
    const context = createContext();

    await expect(context.service.process(input as never)).rejects.toMatchObject({ code });
    expect(context.storage.openCalls).toEqual([]);
    expect((context.processor as FakeProcessor).calls).toBe(0);
  });

  it('rejects incomplete rights before opening or processing the source', async () => {
    const context = createContext();

    await expect(context.service.process({ ...validInput, version: ' ' })).rejects.toThrow(
      'PANORAMA_VERSION_REQUIRED',
    );
    expect(context.storage.openCalls).toEqual([]);
    expect((context.processor as FakeProcessor).calls).toBe(0);
  });

  it('rejects non-panorama and non-processable assets', async () => {
    const image = createAsset({ mediaKind: 'image', status: 'uploaded' });
    await expect(createContext(image).service.process(validInput)).rejects.toThrow(
      'PANORAMA_MEDIA_KIND_REQUIRED',
    );

    const ready = createAsset({ status: 'ready' });
    await expect(createContext(ready).service.process(validInput)).rejects.toMatchObject({
      code: 'MEDIA_NOT_PROCESSABLE',
    });
  });

  it('marks uploaded media processing, uploads manifest last, then publishes accepted metadata', async () => {
    const context = createContext();

    const metadata = await context.service.process(validInput);

    expect(context.media.savedStatuses).toEqual(['processing', 'ready']);
    expect(context.storage.putCalls.map((call) => call.storageKey)).toEqual([
      'processed/panorama/panorama-asset/preview.webp',
      'processed/panorama/panorama-asset/tiles/0/0-0.webp',
      'processed/panorama/panorama-asset/manifest.json',
    ]);
    expect(metadata).toMatchObject({
      mediaAssetId: 'panorama-asset',
      qualityStatus: 'accepted',
      sourceWidthPx: 4096,
      sourceHeightPx: 2048,
      manifestKey: 'processed/panorama/panorama-asset/manifest.json',
      previewKey: 'processed/panorama/panorama-asset/preview.webp',
    });
    expect(context.metadata.saved.at(-1)?.qualityStatus).toBe('accepted');
  });

  it('resumes a processing asset and reuses the deterministic derivative prefix', async () => {
    const context = createContext(createAsset({ status: 'processing' }));

    await context.service.process(validInput);

    expect(context.media.savedStatuses).toEqual(['processing', 'ready']);
    expect(
      context.storage.putCalls.every((call) => call.storageKey.includes('panorama-asset')),
    ).toBe(true);
  });

  it('records a stable rejected/failure state when derivative upload fails', async () => {
    const context = createContext();
    context.storage.failKey = 'processed/panorama/panorama-asset/tiles/0/0-0.webp';

    await expect(context.service.process(validInput)).rejects.toThrow(
      'PANORAMA_DERIVATIVE_UPLOAD_FAILED',
    );

    expect(context.media.asset.status).toBe('failed');
    expect(context.metadata.saved.at(-1)).toMatchObject({
      qualityStatus: 'rejected',
      qualityCode: 'PANORAMA_DERIVATIVE_UPLOAD_FAILED',
      manifestKey: null,
      previewKey: null,
    });
  });

  it('serializes concurrent processing ownership so a stale attempt cannot overwrite success', async () => {
    const processor = new DeferredFirstProcessor();
    const context = createContext(createAsset(), processor, true);

    const first = context.service.process(validInput);
    await processor.firstStarted;
    const second = context.service.process(validInput);
    const resultsPromise = Promise.allSettled([first, second]);
    await Promise.resolve();
    processor.completeFirst();

    const results = await resultsPromise;

    expect(processor.calls).toBe(1);
    expect(results[0]?.status).toBe('fulfilled');
    expect(results[1]).toMatchObject({
      status: 'rejected',
      reason: { code: 'MEDIA_NOT_PROCESSABLE' },
    });
    expect(context.media.asset.status).toBe('ready');
    expect(context.metadata.saved.at(-1)?.qualityStatus).toBe('accepted');
  });
});

function createContext(
  asset = createAsset(),
  processor: PanoramaProcessorPort = new FakeProcessor(),
  snapshotReads = false,
) {
  const media = new InMemoryMediaRepository(asset, snapshotReads);
  const metadata = new InMemoryPanoramaMetadataRepository();
  const storage = new FakeStorage();
  return {
    media,
    metadata,
    storage,
    processor,
    service: new PanoramaIngestionService(
      media,
      metadata,
      storage,
      processor,
      new InMemoryProcessingLock(),
    ),
  };
}

function createAsset(overrides: Partial<MediaAssetProps> = {}) {
  const now = new Date('2026-08-19T00:00:00.000Z');
  return MediaAsset.rehydrate({
    id: 'panorama-asset',
    mediaKind: 'panorama',
    originalFilename: 'source.webp',
    contentType: 'image/webp',
    sizeBytes: 1024,
    storageKey: 'original/panorama-asset/source.webp',
    status: 'uploaded',
    etag: 'etag',
    failureCode: null,
    createdAt: now,
    updatedAt: now,
    uploadedAt: now,
    readyAt: null,
    ...overrides,
  });
}

class InMemoryMediaRepository implements MediaAssetRepository {
  readonly savedStatuses: string[] = [];
  constructor(
    public asset: MediaAsset,
    private readonly snapshotReads = false,
  ) {}
  async save(asset: MediaAsset) {
    this.asset = asset;
    this.savedStatuses.push(asset.status);
  }
  async findById(id: string) {
    if (id !== this.asset.id) return null;
    return this.snapshotReads ? MediaAsset.rehydrate(this.asset.toPrimitives()) : this.asset;
  }
  async findByIds(ids: string[]) {
    return ids.includes(this.asset.id) ? new Map([[this.asset.id, this.asset]]) : new Map();
  }
}

class InMemoryPanoramaMetadataRepository implements PanoramaMetadataRepository {
  readonly saved: PanoramaAssetMetadata[] = [];
  async save(metadata: PanoramaAssetMetadata) {
    this.saved.push(metadata);
  }
  async findByMediaAssetId(mediaAssetId: string) {
    return (
      this.saved
        .slice()
        .reverse()
        .find((metadata) => metadata.mediaAssetId === mediaAssetId) ?? null
    );
  }
  async findByMediaAssetIds(mediaAssetIds: string[]) {
    return new Map(
      this.saved
        .filter((metadata) => mediaAssetIds.includes(metadata.mediaAssetId))
        .map((metadata) => [metadata.mediaAssetId, metadata]),
    );
  }
}

class FakeStorage implements ObjectStoragePort {
  readonly openCalls: string[] = [];
  readonly putCalls: PutStoredObjectInput[] = [];
  failKey: string | null = null;
  async createPresignedUpload() {
    return { url: 'https://unused.test', expiresInSeconds: 60, requiredHeaders: {} };
  }
  async headObject() {
    return null;
  }
  async openObjectReadStream(storageKey: string) {
    this.openCalls.push(storageKey);
    return Readable.from(Buffer.from('source'));
  }
  async putObject(input: PutStoredObjectInput) {
    this.putCalls.push(input);
    if (input.storageKey === this.failKey) throw new Error('storage failed');
  }
}

class FakeProcessor implements PanoramaProcessorPort {
  calls = 0;
  async process(): Promise<PanoramaProcessingOutput> {
    this.calls += 1;
    return {
      widthPx: 4096,
      heightPx: 2048,
      projection: 'equirectangular',
      preview: new Uint8Array([1]),
      manifest: new Uint8Array([2]),
      tiles: [
        {
          keySuffix: 'tiles/0/0-0.webp',
          contentType: 'image/webp',
          body: new Uint8Array([3]),
        },
      ],
    };
  }
}

class DeferredFirstProcessor extends FakeProcessor {
  private releaseFirst!: () => void;
  private markFirstStarted!: () => void;
  readonly firstStarted = new Promise<void>((resolve) => {
    this.markFirstStarted = resolve;
  });

  override async process(): Promise<PanoramaProcessingOutput> {
    this.calls += 1;
    if (this.calls === 1) {
      this.markFirstStarted();
      await new Promise<void>((resolve) => {
        this.releaseFirst = resolve;
      });
    }
    return successfulProcessingOutput();
  }

  completeFirst() {
    this.releaseFirst();
  }
}

class InMemoryProcessingLock implements PanoramaProcessingLockPort {
  private readonly tails = new Map<string, Promise<void>>();

  async withLock<T>(mediaAssetId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(mediaAssetId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tails.set(
      mediaAssetId,
      previous.then(() => current),
    );
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }
}

function successfulProcessingOutput(): PanoramaProcessingOutput {
  return {
    widthPx: 4096,
    heightPx: 2048,
    projection: 'equirectangular',
    preview: new Uint8Array([1]),
    manifest: new Uint8Array([2]),
    tiles: [
      {
        keySuffix: 'tiles/0/0-0.webp',
        contentType: 'image/webp',
        body: new Uint8Array([3]),
      },
    ],
  };
}
