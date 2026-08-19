import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

import { createDatabase, migrateDatabase } from './db';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive';

describe('immersive audio database contract', () => {
  const client = postgres(databaseUrl, { max: 1 });
  const { db } = createDatabase(client);

  beforeAll(async () => {
    await migrateDatabase(db);
  });

  afterAll(async () => {
    await client.end({ timeout: 5 });
  });

  it('rejects a non-audio media asset assigned to an immersive track', async () => {
    const mediaAssetId = await insertMediaAsset('image');

    await expect(insertTrack({ mediaAssetId, kind: 'narration', locale: 'vi' })).rejects.toThrow();
  });

  it('rejects an ambient track with a locale', async () => {
    await expect(insertTrack({ kind: 'ambient', locale: 'vi' })).rejects.toThrow();
  });

  it('rejects an ambient track with a voice id', async () => {
    await expect(insertTrack({ kind: 'ambient', voiceId: 'voice-demo' })).rejects.toThrow();
  });

  it('rejects a narration assignment when the track locale differs', async () => {
    const { sceneId } = await insertDestinationAndScene();
    const trackId = await insertTrack({ kind: 'narration', locale: 'en' });

    await expect(insertSceneNarration({ sceneId, locale: 'vi', trackId })).rejects.toThrow();
  });

  it('rejects a transcript assignment when the transcript locale differs', async () => {
    const { sceneId } = await insertDestinationAndScene();
    const transcriptId = await insertTranscript({ locale: 'en' });

    await expect(insertSceneNarration({ sceneId, locale: 'vi', transcriptId })).rejects.toThrow();
  });

  it('rejects licensed content without a rights holder and reference', async () => {
    await expect(
      insertTrack({
        kind: 'narration',
        locale: 'vi',
        rights: 'licensed',
        rightsHolder: null,
        rightsReference: null,
      }),
    ).rejects.toThrow();
  });

  it('accepts plain transcript segments with null timing', async () => {
    const transcriptId = await insertTranscript({ locale: 'vi', timingMode: 'plain' });

    await db.execute(sql`
      insert into immersive_audio_transcript_segments
        (id, transcript_id, start_ms, end_ms, sort_order, text)
      values
        (${randomUUID()}, ${transcriptId}, null, null, 0, 'Đoạn một'),
        (${randomUUID()}, ${transcriptId}, null, null, 1, 'Đoạn hai')
    `);
  });

  it('rejects overlapping timed transcript segments', async () => {
    const transcriptId = await insertTranscript({ locale: 'vi', timingMode: 'timed' });

    await expect(
      db.execute(sql`
        insert into immersive_audio_transcript_segments
          (id, transcript_id, start_ms, end_ms, sort_order, text)
        values
          (${randomUUID()}, ${transcriptId}, 0, 2000, 0, 'Đoạn một'),
          (${randomUUID()}, ${transcriptId}, 1000, 3000, 1, 'Đoạn hai')
      `),
    ).rejects.toThrow();
  });

  it('rejects a non-final open-ended timed segment', async () => {
    const transcriptId = await insertTranscript({ locale: 'vi', timingMode: 'timed' });

    await expect(
      db.execute(sql`
        insert into immersive_audio_transcript_segments
          (id, transcript_id, start_ms, end_ms, sort_order, text)
        values
          (${randomUUID()}, ${transcriptId}, 0, null, 0, 'Đoạn mở'),
          (${randomUUID()}, ${transcriptId}, 1000, 2000, 1, 'Đoạn sau')
      `),
    ).rejects.toThrow();
  });

  it('rejects processing-to-ready media asset transition when a published track has null version', async () => {
    const mediaAssetId = await insertMediaAsset('audio', 'processing');
    await insertTrack({
      mediaAssetId,
      kind: 'narration',
      locale: 'vi',
      version: null,
    });

    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sql`
          update media_assets
          set status = 'ready'::media_asset_status
          where id = ${mediaAssetId}
        `);
      }),
    ).rejects.toThrow(/IMMERSIVE_AUDIO_PUBLISHED_READY_VERSION_REQUIRED/);
  });

  it('allows processing-to-ready media asset transition when published track has non-empty version', async () => {
    const mediaAssetId = await insertMediaAsset('audio', 'processing');
    await insertTrack({
      mediaAssetId,
      kind: 'narration',
      locale: 'vi',
      version: 'v1.0',
    });

    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sql`
          update media_assets
          set status = 'ready'::media_asset_status
          where id = ${mediaAssetId}
        `);
      }),
    ).resolves.not.toThrow();

    const [updatedAsset] = (await db.execute(sql`
      select status from media_assets where id = ${mediaAssetId}
    `)) as unknown as Array<{ status: string }>;

    expect(updatedAsset?.status).toBe('ready');
  });

  async function insertDestinationAndScene() {
    const destinationId = randomUUID();
    const sceneId = randomUUID();

    await db.execute(sql`
      insert into catalog_destinations (id, slug, status)
      values (${destinationId}, ${`immersive-audio-${destinationId}`}, 'published')
    `);
    await db.execute(sql`
      insert into virtual_tour_scenes
        (id, destination_id, name, geo_point, status)
      values
        (${sceneId}, ${destinationId}, 'Audio test scene', st_setsrid(st_point(105.9, 18.3), 4326), 'published')
    `);

    return { destinationId, sceneId };
  }

  async function insertMediaAsset(
    mediaKind: 'audio' | 'image',
    status: 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed' = 'ready',
  ) {
    const id = randomUUID();
    await db.execute(sql`
      insert into media_assets
        (id, media_kind, original_filename, content_type, size_bytes, storage_key, status)
      values
        (${id}, ${mediaKind}::media_asset_kind, 'audio-test.mp3', 'audio/mpeg', 12, ${`test/${id}.mp3`}, ${status}::media_asset_status)
    `);
    return id;
  }

  async function insertTrack(input: {
    mediaAssetId?: string | null;
    kind: 'ambient' | 'narration';
    locale?: 'vi' | 'en' | null;
    rights?: 'customer-owned' | 'licensed' | 'demo-only';
    rightsHolder?: string | null;
    rightsReference?: string | null;
    voiceId?: string | null;
    version?: string | null;
  }) {
    const id = randomUUID();
    await db.execute(sql`
      insert into immersive_audio_tracks
        (id, kind, locale, label, media_asset_id, rights, rights_holder,
         rights_holder_inherited, rights_reference, publication_status,
         duration_ms, voice_id, version)
      values
        (
          ${id},
          ${input.kind}::immersive_audio_kind,
          ${input.locale === undefined ? (input.kind === 'ambient' ? null : 'vi') : input.locale}::immersive_audio_locale,
          'Audio test track',
          ${input.mediaAssetId ?? null},
          ${input.rights ?? 'customer-owned'}::immersive_audio_rights,
          ${input.rightsHolder === undefined ? 'Test Owner' : input.rightsHolder},
          false,
          ${input.rightsReference ?? null},
          'published'::immersive_audio_publication_status,
          1000,
          ${input.voiceId ?? (input.kind === 'narration' ? 'voice-test' : null)},
          ${input.version === undefined ? 'test-v1' : input.version}
        )
    `);
    return id;
  }

  async function insertTranscript(input: { locale: 'vi' | 'en'; timingMode?: 'plain' | 'timed' }) {
    const id = randomUUID();
    await db.execute(sql`
      insert into immersive_audio_transcripts
        (id, locale, title, timing_mode, rights, rights_holder,
         rights_holder_inherited, rights_reference, publication_status)
      values
        (
          ${id},
          ${input.locale}::immersive_audio_locale,
          'Transcript test',
          ${input.timingMode ?? 'plain'}::immersive_transcript_timing_mode,
          'customer-owned'::immersive_audio_rights,
          'Test Owner',
          false,
          null,
          'published'::immersive_audio_publication_status
        )
    `);
    return id;
  }

  async function insertSceneNarration(input: {
    sceneId: string;
    locale: 'vi' | 'en';
    trackId?: string;
    transcriptId?: string;
  }) {
    await db.execute(sql`
      insert into immersive_scene_narrations
        (scene_id, locale, track_id, transcript_id)
      values
        (
          ${input.sceneId},
          ${input.locale}::immersive_audio_locale,
          ${input.trackId ?? null},
          ${input.transcriptId ?? null}
        )
    `);
  }
});
