import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { DestinationDetail } from '../../catalog/application/destination.queries';
import type { MediaAsset } from '../../media/domain/media-asset';
import { MediaAsset as MediaAssetEntity } from '../../media/domain/media-asset';
import { VirtualTourQueryService } from './virtual-tour.queries';
import type { VirtualTourRepository } from './virtual-tour.repository';
import { SceneNode } from '../domain/scene-node';

describe('VirtualTourQueryService immersive audio read model', () => {
  it('projects public ambient, narration, and transcript references without dangling ids', async () => {
    const destinationId = randomUUID();
    const sceneId = randomUUID();
    const readyAmbient = randomUUID();
    const readyViNarration = randomUUID();
    const draftEnNarration = randomUUID();
    const englishTranscriptOnly = randomUUID();

    const result = await createService({
      destinationId,
      sceneId,
      audio: {
        destinationAmbient: readyAmbient,
        sceneAmbientOverride: null,
        narrations: [
          { locale: 'vi', trackId: readyViNarration, transcriptId: null },
          { locale: 'en', trackId: draftEnNarration, transcriptId: englishTranscriptOnly },
        ],
        tracks: [
          audioTrack(readyAmbient, 'ambient', null, 'published'),
          audioTrack(readyViNarration, 'narration', 'vi', 'published'),
          audioTrack(draftEnNarration, 'narration', 'en', 'draft'),
        ],
        transcripts: [transcript(englishTranscriptOnly, 'en', 'published')],
      },
    });

    expect(result?.ambientTrackId).toBe(readyAmbient);
    expect(result?.audioTracks.map((track) => track.id)).toEqual(
      expect.arrayContaining([readyAmbient, readyViNarration]),
    );
    expect(result?.audioTracks.find((track) => track.id === readyAmbient)).toMatchObject({
      readiness: 'ready',
      src: expect.stringContaining('/audio/'),
    });
    expect(result?.audioTracks.some((track) => track.id === draftEnNarration)).toBe(false);
    expect(result?.nodes[0]?.narrationTrackIds).toEqual({
      vi: readyViNarration,
      en: null,
    });
    expect(result?.nodes[0]?.transcriptIds).toEqual({
      vi: null,
      en: englishTranscriptOnly,
    });
    expect(result?.transcripts.map((item) => item.id)).toEqual([englishTranscriptOnly]);
  });

  it('clears ambient and scene references when their public targets are filtered', async () => {
    const destinationId = randomUUID();
    const sceneId = randomUUID();
    const draftAmbient = randomUUID();
    const demoNarration = randomUUID();

    const result = await createService({
      destinationId,
      sceneId,
      audio: {
        destinationAmbient: draftAmbient,
        sceneAmbientOverride: draftAmbient,
        narrations: [{ locale: 'vi', trackId: demoNarration, transcriptId: null }],
        tracks: [
          audioTrack(draftAmbient, 'ambient', null, 'draft'),
          audioTrack(demoNarration, 'narration', 'vi', 'published', 'demo-only'),
        ],
        transcripts: [],
      },
    });

    expect(result?.ambientTrackId).toBeNull();
    expect(result?.audioTracks).toEqual([]);
    expect(result?.nodes[0]?.ambientOverrideTrackId).toBeNull();
    expect(result?.nodes[0]?.narrationTrackIds.vi).toBeNull();
  });
});

async function createService(input: {
  destinationId: string;
  sceneId: string;
  audio: {
    destinationAmbient: string | null;
    sceneAmbientOverride: string | null;
    narrations: Array<{ locale: 'vi' | 'en'; trackId: string | null; transcriptId: string | null }>;
    tracks: unknown[];
    transcripts: unknown[];
  };
}) {
  const destination = {
    id: input.destinationId,
    slug: 'audio-read-model-destination',
    name: 'Audio destination',
    summary: '',
    coverImageUrl: null,
    categoryLabel: null,
    defaultSceneId: input.sceneId,
    geoPoint: { latitude: 18.3, longitude: 105.9 },
    status: 'published',
    description: '',
    categoryId: null,
    coverMediaId: null,
  } satisfies DestinationDetail;
  const scene = SceneNode.rehydrate({
    id: input.sceneId,
    destinationId: input.destinationId,
    name: 'Audio scene',
    geoPoint: { latitude: 18.3, longitude: 105.9 },
    altitude: null,
    panoramaAssetId: randomUUID(),
    panoramaAssetStatus: 'ready',
    initialHeading: 0,
    initialPitch: 0,
    initialFov: 90,
    status: 'published',
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const repository = {
    findScenesByDestinationId: async () => [scene],
    findLinksByFromSceneIds: async () => [],
    findHotspotsBySceneIds: async () => [],
    findImmersiveAudioReadRows: async () => ({
      destinationAmbient: input.audio.destinationAmbient
        ? { destinationId: input.destinationId, trackId: input.audio.destinationAmbient }
        : null,
      sceneAmbientOverrides: input.audio.sceneAmbientOverride
        ? [{ sceneId: input.sceneId, trackId: input.audio.sceneAmbientOverride }]
        : [],
      sceneNarrations: input.audio.narrations.map((item) => ({
        sceneId: input.sceneId,
        ...item,
      })),
      tracks: input.audio.tracks,
      transcripts: input.audio.transcripts,
      transcriptSegments: [],
    }),
  } as unknown as VirtualTourRepository;

  const mediaAsset = MediaAssetEntity.create({
    mediaKind: 'panorama',
    originalFilename: 'scene.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 100,
    storageKey: `panorama/${input.sceneId}.jpg`,
  });
  mediaAsset.markUploaded({ etag: 'etag', sizeBytes: 100 });
  mediaAsset.markProcessing();
  mediaAsset.markReady();
  const audioMediaAssets = (input.audio.tracks as Array<{ mediaAssetId: string | null }>).reduce(
    (assets, track) => {
      if (!track.mediaAssetId) {
        return assets;
      }
      const audioAsset = MediaAssetEntity.create({
        mediaKind: 'audio',
        originalFilename: 'audio-test.mp3',
        contentType: 'audio/mpeg',
        sizeBytes: 100,
        storageKey: `audio/${track.mediaAssetId}.mp3`,
      });
      audioAsset.markUploaded({ etag: 'audio-etag', sizeBytes: 100 });
      audioAsset.markProcessing();
      audioAsset.markReady();
      assets.set(track.mediaAssetId, audioAsset);
      return assets;
    },
    new Map<string, MediaAsset>(),
  );

  const destinationQueryService = {
    findPublishedBySlug: async () => destination,
  };
  const mediaAssetRepository = {
    findByIds: async () =>
      new Map([[scene.toPrimitives().panoramaAssetId!, mediaAsset], ...audioMediaAssets]),
  };

  return new VirtualTourQueryService(
    destinationQueryService as never,
    repository,
    mediaAssetRepository as never,
    { publicOrigin: 'https://cdn.example.test' },
  ).findManifestByDestinationSlug(destination.slug);
}

function audioTrack(
  id: string,
  kind: 'ambient' | 'narration',
  locale: 'vi' | 'en' | null,
  publicationStatus: 'draft' | 'published',
  rights: 'customer-owned' | 'licensed' | 'demo-only' = 'customer-owned',
) {
  return {
    id,
    kind,
    locale,
    label: `${kind} track`,
    mediaAssetId: randomUUID(),
    rights,
    publicationStatus,
    durationMs: 1000,
    voiceId: kind === 'narration' ? 'voice-1' : null,
    version: 'v1',
  };
}

function transcript(id: string, locale: 'vi' | 'en', publicationStatus: 'draft' | 'published') {
  return {
    id,
    locale,
    title: 'Transcript',
    timingMode: 'plain',
    rights: 'customer-owned',
    publicationStatus,
  };
}
