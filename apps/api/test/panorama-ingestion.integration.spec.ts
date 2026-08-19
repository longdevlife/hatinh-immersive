import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import sharp from 'sharp';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { configureHttpApplication } from '../src/app/app.bootstrap';
import { AppModule } from '../src/app/app.module';
import { createDatabase, migrateDatabase } from '../src/core/database/db';
import { adminInject, configureTestBootstrap, loginAsAdmin } from './auth-test.utils';
import { PanoramaIngestionService } from '../src/modules/media/application/panorama-ingestion.service';
import {
  OBJECT_STORAGE,
  type ObjectStoragePort,
} from '../src/modules/media/application/object-storage.port';
import {
  PANORAMA_METADATA_REPOSITORY,
  type PanoramaMetadataRepository,
} from '../src/modules/media/application/panorama-metadata.repository';
import {
  MEDIA_ASSET_REPOSITORY,
  type MediaAssetRepository,
} from '../src/modules/media/application/media.repository';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive';

configureTestBootstrap();

describe('Panorama MinIO ingestion integration', () => {
  let app: NestFastifyApplication;
  let adminCookie: string;
  let ingestionService: PanoramaIngestionService;
  let storage: ObjectStoragePort;
  let metadataRepository: PanoramaMetadataRepository;
  let mediaRepository: MediaAssetRepository;

  const client = postgres(databaseUrl, { max: 1 });
  const { db } = createDatabase(client);

  beforeAll(async () => {
    await migrateDatabase(db);
    await db.execute(
      sql`truncate table panorama_asset_metadata, media_assets restart identity cascade`,
    );

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureHttpApplication(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    adminCookie = await loginAsAdmin(app);
    ingestionService = app.get(PanoramaIngestionService);
    storage = app.get(OBJECT_STORAGE);
    metadataRepository = app.get(PANORAMA_METADATA_REPOSITORY);
    mediaRepository = app.get(MEDIA_ASSET_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
    await client.end({ timeout: 5 });
  });

  it('uploads test 4096x2048 image, retains original in MinIO, produces derivative-relative manifest and ready tiles', async () => {
    const panoramaBuffer = await createTestPanorama(4096, 2048);

    // 1. Request presigned upload
    const presignResponse = await adminInject(app, adminCookie, {
      method: 'POST',
      url: '/api/v1/admin/media/presign',
      payload: {
        mediaKind: 'panorama',
        originalFilename: 'test-pano-4096.jpg',
        contentType: 'image/jpeg',
        sizeBytes: panoramaBuffer.byteLength,
      },
    });

    expect(presignResponse.statusCode).toBe(201);
    const presigned = presignResponse.json();
    const assetId = presigned.asset.id;
    expect(presigned.asset.status).toBe('pending');
    expect(presigned.uploadUrl).toContain('59000');

    // 2. Direct upload to MinIO S3
    const uploadResponse = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: presigned.requiredHeaders,
      body: panoramaBuffer,
    });
    expect(uploadResponse.ok).toBe(true);

    // 3. Complete metadata upload
    const completeResponse = await adminInject(app, adminCookie, {
      method: 'POST',
      url: `/api/v1/admin/media/${assetId}/complete-upload`,
    });
    expect(completeResponse.statusCode).toBe(200);
    expect(completeResponse.json().status).toBe('uploaded');

    // 4. Ingest and tile the panorama
    const metadata = await ingestionService.process({
      mediaAssetId: assetId,
      rights: 'customer-owned',
      rightsHolder: 'Hà Tĩnh Test Tourism',
      rightsReference: 'REF-4096-TEST',
      sourceReference: 'SRC-4096-TEST',
      version: 'v1.0',
    });

    // 5. Verify metadata output & media asset readiness
    expect(metadata).toMatchObject({
      mediaAssetId: assetId,
      qualityStatus: 'accepted',
      qualityCode: null,
      sourceWidthPx: 4096,
      sourceHeightPx: 2048,
      manifestKey: `processed/panorama/${assetId}/manifest.json`,
      previewKey: `processed/panorama/${assetId}/preview.webp`,
    });

    const updatedMediaAsset = await mediaRepository.findById(assetId);
    expect(updatedMediaAsset?.status).toBe('ready');

    // 6. Verify original source is retained in MinIO
    const originalStream = await storage.openObjectReadStream(updatedMediaAsset!.storageKey);
    expect(originalStream).not.toBeNull();
    if (originalStream) {
      const originalBytes = await streamToBuffer(originalStream);
      expect(originalBytes.byteLength).toBe(panoramaBuffer.byteLength);
    }

    // 7. Verify preview and manifest exist in MinIO
    const previewStream = await storage.openObjectReadStream(metadata.previewKey!);
    expect(previewStream).not.toBeNull();

    const manifestStream = await storage.openObjectReadStream(metadata.manifestKey!);
    expect(manifestStream).not.toBeNull();
    const manifestBytes = await streamToBuffer(manifestStream!);
    const manifestJson = JSON.parse(manifestBytes.toString('utf-8'));

    // 8. Verify manifest paths are derivative-relative
    expect(manifestJson.preview).toBe('preview.webp');
    expect(manifestJson.tileUrlTemplate).toBe('tiles/{level}/{col}-{row}.webp');
    expect(manifestJson.levels.length).toBeGreaterThan(0);

    // 9. Verify representative tile exists in MinIO
    const representativeTileKey = `processed/panorama/${assetId}/tiles/0/0-0.webp`;
    const tileStream = await storage.openObjectReadStream(representativeTileKey);
    expect(tileStream).not.toBeNull();
  }, 60_000);

  it('rejects low-resolution 2048x1024 panorama with fail-closed status and no published manifest', async () => {
    const lowResBuffer = await createTestPanorama(2048, 1024);

    // 1. Presign upload
    const presignResponse = await adminInject(app, adminCookie, {
      method: 'POST',
      url: '/api/v1/admin/media/presign',
      payload: {
        mediaKind: 'panorama',
        originalFilename: 'test-pano-2048.jpg',
        contentType: 'image/jpeg',
        sizeBytes: lowResBuffer.byteLength,
      },
    });
    expect(presignResponse.statusCode).toBe(201);
    const presigned = presignResponse.json();
    const assetId = presigned.asset.id;

    // 2. Direct upload to MinIO
    const uploadResponse = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: presigned.requiredHeaders,
      body: lowResBuffer,
    });
    expect(uploadResponse.ok).toBe(true);

    // 3. Complete upload
    await adminInject(app, adminCookie, {
      method: 'POST',
      url: `/api/v1/admin/media/${assetId}/complete-upload`,
    });

    // 4. Attempt ingestion -> must reject fail-closed
    await expect(
      ingestionService.process({
        mediaAssetId: assetId,
        rights: 'customer-owned',
        rightsHolder: 'Hà Tĩnh Test Tourism',
        rightsReference: 'REF-2048-TEST',
        sourceReference: 'SRC-2048-TEST',
        version: 'v1.0',
      }),
    ).rejects.toThrow('PANORAMA_DIMENSIONS_TOO_SMALL');

    // 5. Verify media asset is marked failed
    const failedAsset = await mediaRepository.findById(assetId);
    expect(failedAsset?.status).toBe('failed');

    // 6. Verify panorama metadata records rejected state without manifest/preview keys
    const savedMetadata = await metadataRepository.findByMediaAssetId(assetId);
    expect(savedMetadata).toMatchObject({
      qualityStatus: 'rejected',
      qualityCode: 'PANORAMA_DIMENSIONS_TOO_SMALL',
      manifestKey: null,
      previewKey: null,
    });
  }, 60_000);
});

async function createTestPanorama(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 50, g: 120, b: 180 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
