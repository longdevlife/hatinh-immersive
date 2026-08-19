import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase, migrateDatabase } from './db';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive';

describe('production panorama database contract', () => {
  const client = postgres(databaseUrl, { max: 1 });
  const { db } = createDatabase(client);

  beforeAll(async () => {
    await migrateDatabase(db);
  });

  afterAll(async () => {
    await client.end({ timeout: 5 });
  });

  it.each([
    [4096, 2048],
    [8192, 4096],
  ])('accepts production panorama metadata at %ix%i', async (widthPx, heightPx) => {
    const mediaAssetId = await insertMediaAsset('panorama', 'ready');

    await expect(
      insertMetadata({ mediaAssetId, widthPx, heightPx, qualityStatus: 'accepted' }),
    ).resolves.not.toThrow();
  });

  it.each([
    ['too-small', 2048, 1024],
    ['invalid-ratio', 4096, 1800],
  ])('rejects accepted metadata with %s dimensions', async (_case, widthPx, heightPx) => {
    const mediaAssetId = await insertMediaAsset('panorama', 'ready');

    await expect(
      insertMetadata({ mediaAssetId, widthPx, heightPx, qualityStatus: 'accepted' }),
    ).rejects.toThrow();
  });

  it('rejects accepted metadata with incomplete derivative, version, or provenance fields', async () => {
    const mediaAssetId = await insertMediaAsset('panorama', 'ready');

    await expect(
      insertMetadata({
        mediaAssetId,
        widthPx: 4096,
        heightPx: 2048,
        qualityStatus: 'accepted',
        manifestKey: null,
        previewKey: null,
        version: '',
        rightsHolder: '',
        rightsReference: '',
        sourceReference: '',
      }),
    ).rejects.toThrow();
  });

  it('rejects panorama metadata owned by a non-panorama media asset', async () => {
    const mediaAssetId = await insertMediaAsset('image', 'ready');

    await expect(insertMetadata({ mediaAssetId, widthPx: 4096, heightPx: 2048 })).rejects.toThrow();
  });

  it('rejects accepted derivative keys outside the owning panorama asset namespace', async () => {
    const mediaAssetId = await insertMediaAsset('panorama', 'ready');

    await expect(
      insertMetadata({
        mediaAssetId,
        widthPx: 4096,
        heightPx: 2048,
        manifestKey: 'processed/panorama/another-asset/manifest.json',
        previewKey: 'processed/panorama/another-asset/preview.webp',
      }),
    ).rejects.toThrow();
  });

  it('rejects publishing a scene backed by a non-ready panorama', async () => {
    const mediaAssetId = await insertMediaAsset('panorama', 'processing');
    await insertMetadata({
      mediaAssetId,
      widthPx: null,
      heightPx: null,
      qualityStatus: 'pending',
      manifestKey: null,
      previewKey: null,
      processedAt: null,
    });

    await expect(insertPublishedScene(mediaAssetId)).rejects.toThrow(
      /VIRTUAL_TOUR_SCENE_PANORAMA_NOT_PUBLICATION_READY/,
    );
  });

  it('rejects changing an assigned production panorama asset to a non-panorama kind', async () => {
    const mediaAssetId = await insertMediaAsset('panorama', 'ready');
    await insertMetadata({ mediaAssetId, widthPx: 4096, heightPx: 2048 });

    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sql`
          update media_assets
          set media_kind = 'image'::media_asset_kind
          where id = ${mediaAssetId}
        `);
      }),
    ).rejects.toThrow(/PANORAMA_METADATA_MEDIA_ASSET_MUST_BE_PANORAMA/);
  });

  it.each([
    ['version', sql`version = 'mutated-v2'`],
    ['provenance', sql`rights_reference = 'approval:mutated'`],
    ['dimensions', sql`source_width_px = 8192, source_height_px = 4096`],
    [
      'derivative keys',
      sql`manifest_key = 'processed/panorama/other/manifest.json', preview_key = 'processed/panorama/other/preview.webp'`,
    ],
  ])(
    'rejects mutating %s after accepted panorama metadata becomes ready',
    async (_case, update) => {
      const mediaAssetId = await insertMediaAsset('panorama', 'ready');
      await insertMetadata({ mediaAssetId, widthPx: 4096, heightPx: 2048 });

      await expectDatabaseErrorCode(
        db.execute(
          sql`update panorama_asset_metadata set ${update} where media_asset_id = ${mediaAssetId}`,
        ),
        'PANORAMA_READY_METADATA_IMMUTABLE',
      );
    },
  );

  it('rejects deleting accepted panorama metadata after its asset becomes ready', async () => {
    const mediaAssetId = await insertMediaAsset('panorama', 'ready');
    await insertMetadata({ mediaAssetId, widthPx: 4096, heightPx: 2048 });

    await expectDatabaseErrorCode(
      db.execute(sql`delete from panorama_asset_metadata where media_asset_id = ${mediaAssetId}`),
      'PANORAMA_READY_METADATA_IMMUTABLE',
    );
  });

  it('rejects ready to processing metadata-mutation bypass in one transaction', async () => {
    const mediaAssetId = await insertMediaAsset('panorama', 'ready');
    await insertMetadata({ mediaAssetId, widthPx: 4096, heightPx: 2048 });

    await expectDatabaseErrorCode(
      db.transaction(async (tx) => {
        await tx.execute(sql`
          update media_assets
          set status = 'processing'::media_asset_status
          where id = ${mediaAssetId}
        `);
        await tx.execute(sql`
          update panorama_asset_metadata
          set version = 'bypassed-v2'
          where media_asset_id = ${mediaAssetId}
        `);
        await tx.execute(sql`
          update media_assets
          set status = 'ready'::media_asset_status
          where id = ${mediaAssetId}
        `);
      }),
      'PANORAMA_READY_ASSET_IMMUTABLE',
    );
  });

  async function insertMediaAsset(mediaKind: 'panorama' | 'image', status: 'processing' | 'ready') {
    const id = randomUUID();
    await db.execute(sql`
      insert into media_assets
        (id, media_kind, original_filename, content_type, size_bytes, storage_key, status)
      values
        (
          ${id},
          ${mediaKind}::media_asset_kind,
          'panorama-test.webp',
          'image/webp',
          4096,
          ${`test/panorama/${id}.webp`},
          ${status}::media_asset_status
        )
    `);
    return id;
  }

  async function expectDatabaseErrorCode(promise: Promise<unknown>, code: string) {
    try {
      await promise;
    } catch (error) {
      let current: unknown = error;
      while (current instanceof Error) {
        if (current.message.includes(code)) return;
        current = current.cause;
      }
      throw error;
    }
    throw new Error(`Expected database error ${code}`);
  }

  async function insertMetadata(input: {
    mediaAssetId: string;
    widthPx: number | null;
    heightPx: number | null;
    qualityStatus?: 'pending' | 'accepted' | 'rejected';
    manifestKey?: string | null;
    previewKey?: string | null;
    rightsHolder?: string;
    rightsReference?: string;
    sourceReference?: string;
    version?: string;
    processedAt?: string | null;
  }) {
    return db.execute(sql`
      insert into panorama_asset_metadata
        (
          media_asset_id, projection, source_width_px, source_height_px,
          quality_status, quality_code, manifest_key, preview_key, rights,
          rights_holder, rights_reference, source_reference, version, processed_at
        )
      values
        (
          ${input.mediaAssetId},
          'equirectangular'::panorama_projection,
          ${input.widthPx},
          ${input.heightPx},
          ${input.qualityStatus ?? 'accepted'}::panorama_quality_status,
          null,
          ${input.manifestKey === undefined ? `processed/panorama/${input.mediaAssetId}/manifest.json` : input.manifestKey},
          ${input.previewKey === undefined ? `processed/panorama/${input.mediaAssetId}/preview.webp` : input.previewKey},
          'customer-owned'::panorama_rights,
          ${input.rightsHolder ?? 'Test Owner'},
          ${input.rightsReference ?? 'approval:test'},
          ${input.sourceReference ?? 'delivery:test'},
          ${input.version ?? 'test-v1'},
          ${input.processedAt === undefined ? new Date().toISOString() : input.processedAt}
        )
    `);
  }

  async function insertPublishedScene(mediaAssetId: string) {
    const destinationId = randomUUID();
    await db.execute(sql`
      insert into catalog_destinations (id, slug, status)
      values (${destinationId}, ${`panorama-db-${destinationId}`}, 'published')
    `);

    return db.transaction(async (tx) => {
      await tx.execute(sql`
        insert into virtual_tour_scenes
          (
            id, destination_id, name, geo_point, panorama_asset_id,
            panorama_asset_status, status
          )
        values
          (
            ${randomUUID()}, ${destinationId}, 'Panorama DB test',
            st_setsrid(st_point(105.9, 18.3), 4326), ${mediaAssetId},
            'ready'::panorama_asset_status, 'published'::virtual_tour_scene_status
          )
      `);
    });
  }
});
