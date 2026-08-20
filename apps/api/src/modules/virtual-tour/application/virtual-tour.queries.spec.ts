import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { DestinationDetail } from '../../catalog/application/destination.queries';
import type { MediaAsset } from '../../media/domain/media-asset';
import { MediaAsset as MediaAssetEntity } from '../../media/domain/media-asset';
import type { PanoramaAssetMetadata } from '../../media/application/panorama-metadata.repository';
import { VirtualTourQueryService } from './virtual-tour.queries';
import type { VirtualTourRepository } from './virtual-tour.repository';
import { SceneNode } from '../domain/scene-node';

describe('VirtualTourQueryService immersive audio read model', () => {
  it('publishes processed panorama derivatives and never the original source key', async () => {
    const destinationId = randomUUID();
    const sceneId = randomUUID();
    const result = await createMultiSceneService({
      destinationId,
      scenes: [{ id: sceneId, name: 'Processed panorama', sortOrder: 0 }],
      audio: emptyAudio(),
    });

    expect(result?.nodes[0]?.panoramaManifestUrl).toContain('/processed/panorama/');
    expect(result?.nodes[0]?.panoramaManifestUrl).toMatch(/\/manifest\.json$/);
    expect(result?.nodes[0]?.panoramaPreviewUrl).toMatch(/\/preview\.webp$/);
    expect(result?.nodes[0]?.panoramaManifestUrl).not.toContain('/original/');
  });

  it('fails closed when panorama production metadata is rejected', async () => {
    const destinationId = randomUUID();
    const sceneId = randomUUID();
    const result = await createMultiSceneService({
      destinationId,
      scenes: [{ id: sceneId, name: 'Rejected panorama', sortOrder: 0 }],
      audio: emptyAudio(),
      panoramaMetadataOverrides: new Map([
        [sceneId, { qualityStatus: 'rejected', manifestKey: null, previewKey: null }],
      ]),
    });

    expect(result?.nodes[0]).toMatchObject({
      panoramaManifestUrl: null,
      panoramaPreviewUrl: null,
    });
  });

  it.each([
    [
      'original source keys',
      {
        manifestKey: 'original/panorama/source.jpg',
        previewKey: 'original/panorama/preview.webp',
      },
    ],
    [
      'another asset derivative keys',
      {
        manifestKey: 'processed/panorama/another-asset/manifest.json',
        previewKey: 'processed/panorama/another-asset/preview.webp',
      },
    ],
  ])('fails closed for %s', async (_case, metadataOverride) => {
    const destinationId = randomUUID();
    const sceneId = randomUUID();
    const result = await createMultiSceneService({
      destinationId,
      scenes: [{ id: sceneId, name: 'Invalid derivative namespace', sortOrder: 0 }],
      audio: emptyAudio(),
      panoramaMetadataOverrides: new Map([[sceneId, metadataOverride]]),
    });

    expect(result?.nodes[0]).toMatchObject({
      panoramaManifestUrl: null,
      panoramaPreviewUrl: null,
    });
  });

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

  it('preserves distinct VI narration and transcript across scenes and isolates EN projections', async () => {
    const destinationId = randomUUID();
    const scene1 = randomUUID();
    const scene2 = randomUUID();
    const scene3 = randomUUID();

    const trackVi1 = randomUUID();
    const trackVi2 = randomUUID();
    const trackEn1 = randomUUID();
    const trackEn3 = randomUUID();

    const transcriptVi1 = randomUUID();
    const transcriptVi2 = randomUUID();
    const transcriptEn1 = randomUUID();
    const transcriptEn3 = randomUUID();

    const result = await createMultiSceneService({
      destinationId,
      scenes: [
        { id: scene1, name: 'Scene 1', sortOrder: 0 },
        { id: scene2, name: 'Scene 2', sortOrder: 1 },
        { id: scene3, name: 'Scene 3', sortOrder: 2 },
      ],
      audio: {
        destinationAmbient: null,
        sceneAmbientOverrides: [],
        narrations: [
          { sceneId: scene1, locale: 'vi', trackId: trackVi1, transcriptId: transcriptVi1 },
          { sceneId: scene1, locale: 'en', trackId: trackEn1, transcriptId: transcriptEn1 },
          { sceneId: scene2, locale: 'vi', trackId: trackVi2, transcriptId: transcriptVi2 },
          { sceneId: scene3, locale: 'en', trackId: trackEn3, transcriptId: transcriptEn3 },
        ],
        tracks: [
          audioTrack(trackVi1, 'narration', 'vi', 'published'),
          audioTrack(trackVi2, 'narration', 'vi', 'published'),
          audioTrack(trackEn1, 'narration', 'en', 'published'),
          audioTrack(trackEn3, 'narration', 'en', 'published'),
        ],
        transcripts: [
          transcript(transcriptVi1, 'vi', 'published'),
          transcript(transcriptVi2, 'vi', 'published'),
          transcript(transcriptEn1, 'en', 'published'),
          transcript(transcriptEn3, 'en', 'published'),
        ],
      },
    });

    const node1 = result?.nodes.find((node) => node.id === scene1);
    const node2 = result?.nodes.find((node) => node.id === scene2);
    const node3 = result?.nodes.find((node) => node.id === scene3);

    expect(node1?.narrationTrackIds).toEqual({ vi: trackVi1, en: trackEn1 });
    expect(node1?.transcriptIds).toEqual({ vi: transcriptVi1, en: transcriptEn1 });

    expect(node2?.narrationTrackIds).toEqual({ vi: trackVi2, en: null });
    expect(node2?.transcriptIds).toEqual({ vi: transcriptVi2, en: null });

    expect(node3?.narrationTrackIds).toEqual({ vi: null, en: trackEn3 });
    expect(node3?.transcriptIds).toEqual({ vi: null, en: transcriptEn3 });
  });

  it('projects metadata-only track with mediaAssetId null as unavailable', async () => {
    const destinationId = randomUUID();
    const sceneId = randomUUID();
    const trackId = randomUUID();

    const track = {
      ...audioTrack(trackId, 'ambient', null, 'published'),
      mediaAssetId: null,
    };

    const result = await createService({
      destinationId,
      sceneId,
      audio: {
        destinationAmbient: trackId,
        sceneAmbientOverride: null,
        narrations: [],
        tracks: [track],
        transcripts: [],
      },
    });

    const projectedTrack = result?.audioTracks.find((item) => item.id === trackId);
    expect(projectedTrack).toBeDefined();
    expect(projectedTrack?.readiness).toBe('unavailable');
    expect(projectedTrack?.src).toBeNull();
  });

  it.each(['pending', 'uploaded', 'processing'] as const)(
    'projects track with %s audio asset as unavailable',
    async (assetStatus) => {
      const destinationId = randomUUID();
      const sceneId = randomUUID();
      const trackId = randomUUID();
      const mediaAssetId = randomUUID();

      const track = {
        ...audioTrack(trackId, 'narration', 'vi', 'published'),
        mediaAssetId,
      };

      const result = await createMultiSceneService({
        destinationId,
        scenes: [{ id: sceneId, name: 'Audio scene', sortOrder: 0 }],
        audio: {
          destinationAmbient: null,
          sceneAmbientOverrides: [],
          narrations: [{ sceneId, locale: 'vi', trackId, transcriptId: null }],
          tracks: [track],
          transcripts: [],
          assetStatusMap: new Map([[mediaAssetId, assetStatus]]),
        },
      });

      const projectedTrack = result?.audioTracks.find((item) => item.id === trackId);
      expect(projectedTrack).toBeDefined();
      expect(projectedTrack?.readiness).toBe('unavailable');
      expect(projectedTrack?.src).toBeNull();
    },
  );

  it('projects track with failed audio asset as invalid', async () => {
    const destinationId = randomUUID();
    const sceneId = randomUUID();
    const trackId = randomUUID();
    const mediaAssetId = randomUUID();

    const track = {
      ...audioTrack(trackId, 'narration', 'vi', 'published'),
      mediaAssetId,
    };

    const result = await createMultiSceneService({
      destinationId,
      scenes: [{ id: sceneId, name: 'Audio scene', sortOrder: 0 }],
      audio: {
        destinationAmbient: null,
        sceneAmbientOverrides: [],
        narrations: [{ sceneId, locale: 'vi', trackId, transcriptId: null }],
        tracks: [track],
        transcripts: [],
        assetStatusMap: new Map([[mediaAssetId, 'failed']]),
      },
    });

    const projectedTrack = result?.audioTracks.find((item) => item.id === trackId);
    expect(projectedTrack).toBeDefined();
    expect(projectedTrack?.readiness).toBe('invalid');
    expect(projectedTrack?.src).toBeNull();
  });

  it('projects track with ready audio asset and valid storage key as ready with public URL', async () => {
    const destinationId = randomUUID();
    const sceneId = randomUUID();
    const trackId = randomUUID();
    const mediaAssetId = randomUUID();

    const track = {
      ...audioTrack(trackId, 'narration', 'vi', 'published'),
      mediaAssetId,
    };

    const result = await createMultiSceneService({
      destinationId,
      scenes: [{ id: sceneId, name: 'Audio scene', sortOrder: 0 }],
      audio: {
        destinationAmbient: null,
        sceneAmbientOverrides: [],
        narrations: [{ sceneId, locale: 'vi', trackId, transcriptId: null }],
        tracks: [track],
        transcripts: [],
        assetStatusMap: new Map([[mediaAssetId, 'ready']]),
      },
    });

    const projectedTrack = result?.audioTracks.find((item) => item.id === trackId);
    expect(projectedTrack).toBeDefined();
    expect(projectedTrack?.readiness).toBe('ready');
    expect(projectedTrack?.src).toMatch(/^https:\/\/cdn\.example\.test\/audio\//);
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
  return createMultiSceneService({
    destinationId: input.destinationId,
    scenes: [{ id: input.sceneId, name: 'Audio scene', sortOrder: 0 }],
    audio: {
      destinationAmbient: input.audio.destinationAmbient,
      sceneAmbientOverrides: input.audio.sceneAmbientOverride
        ? [{ sceneId: input.sceneId, trackId: input.audio.sceneAmbientOverride }]
        : [],
      narrations: input.audio.narrations.map((item) => ({
        sceneId: input.sceneId,
        ...item,
      })),
      tracks: input.audio.tracks,
      transcripts: input.audio.transcripts,
    },
  });
}

async function createMultiSceneService(input: {
  destinationId: string;
  scenes: Array<{ id: string; name: string; sortOrder: number }>;
  audio: {
    destinationAmbient: string | null;
    sceneAmbientOverrides: Array<{ sceneId: string; trackId: string }>;
    narrations: Array<{
      sceneId: string;
      locale: 'vi' | 'en';
      trackId: string | null;
      transcriptId: string | null;
    }>;
    tracks: unknown[];
    transcripts: unknown[];
    assetStatusMap?: Map<string, 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed'>;
  };
  panoramaMetadataOverrides?: Map<string, Partial<PanoramaAssetMetadata> | null>;
}) {
  const defaultSceneId = input.scenes[0]?.id ?? randomUUID();
  const destination = {
    id: input.destinationId,
    slug: 'audio-read-model-destination',
    name: 'Audio destination',
    summary: '',
    coverImageUrl: null,
    categoryLabel: null,
    defaultSceneId,
    geoPoint: { latitude: 18.3, longitude: 105.9 },
    status: 'published',
    description: '',
    categoryId: null,
    coverMediaId: null,
  } satisfies DestinationDetail;

  const sceneEntities = input.scenes.map((s) =>
    SceneNode.rehydrate({
      id: s.id,
      destinationId: input.destinationId,
      name: s.name,
      geoPoint: { latitude: 18.3, longitude: 105.9 },
      altitude: null,
      panoramaAssetId: randomUUID(),
      panoramaAssetStatus: 'ready',
      initialHeading: 0,
      initialPitch: 0,
      initialFov: 90,
      status: 'published',
      sortOrder: s.sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  const repository = {
    findScenesByDestinationId: async () => sceneEntities,
    findLinksByFromSceneIds: async () => [],
    findHotspotsBySceneIds: async () => [],
    findImmersiveAudioReadRows: async () => ({
      destinationAmbient: input.audio.destinationAmbient
        ? { destinationId: input.destinationId, trackId: input.audio.destinationAmbient }
        : null,
      sceneAmbientOverrides: input.audio.sceneAmbientOverrides,
      sceneNarrations: input.audio.narrations,
      tracks: input.audio.tracks,
      transcripts: input.audio.transcripts,
      transcriptSegments: [],
    }),
  } as unknown as VirtualTourRepository;

  const panoramaMediaAssets = new Map<string, MediaAsset>();
  const panoramaMetadata = new Map<string, PanoramaAssetMetadata>();
  for (const scene of sceneEntities) {
    const panoAssetId = scene.toPrimitives().panoramaAssetId!;
    const panoAsset = MediaAssetEntity.create({
      mediaKind: 'panorama',
      originalFilename: `scene-${scene.id}.jpg`,
      contentType: 'image/jpeg',
      sizeBytes: 100,
      storageKey: `panorama/${scene.id}.jpg`,
    });
    panoAsset.markUploaded({ etag: 'etag', sizeBytes: 100 });
    panoAsset.markProcessing();
    panoAsset.markReady();
    panoramaMediaAssets.set(panoAssetId, panoAsset);
    const override = input.panoramaMetadataOverrides?.get(scene.id);
    if (override !== null) {
      const now = new Date();
      panoramaMetadata.set(panoAssetId, {
        mediaAssetId: panoAssetId,
        projection: 'equirectangular',
        sourceWidthPx: 4096,
        sourceHeightPx: 2048,
        qualityStatus: 'accepted',
        qualityCode: null,
        manifestKey: `processed/panorama/${panoAssetId}/manifest.json`,
        previewKey: `processed/panorama/${panoAssetId}/preview.webp`,
        rights: 'customer-owned',
        rightsHolder: 'Test Owner',
        rightsReference: 'approval:test',
        sourceReference: 'delivery:test',
        version: 'test-v1',
        processedAt: now,
        createdAt: now,
        updatedAt: now,
        ...override,
      });
    }
  }

  const audioMediaAssets = (input.audio.tracks as Array<{ mediaAssetId: string | null }>).reduce(
    (assets, track) => {
      if (!track.mediaAssetId) {
        return assets;
      }
      const status = input.audio.assetStatusMap?.get(track.mediaAssetId) ?? 'ready';
      const audioAsset = MediaAssetEntity.create({
        mediaKind: 'audio',
        originalFilename: 'audio-test.mp3',
        contentType: 'audio/mpeg',
        sizeBytes: 100,
        storageKey: `audio/${track.mediaAssetId}.mp3`,
      });
      if (status !== 'pending') {
        audioAsset.markUploaded({ etag: 'audio-etag', sizeBytes: 100 });
        if (status !== 'uploaded') {
          audioAsset.markProcessing();
          if (status === 'ready') {
            audioAsset.markReady();
          } else if (status === 'failed') {
            audioAsset.markFailed('Audio processing failed');
          }
        }
      }
      assets.set(track.mediaAssetId, audioAsset);
      return assets;
    },
    new Map<string, MediaAsset>(),
  );

  const destinationQueryService = {
    findPublishedBySlug: async () => destination,
  };
  const mediaAssetRepository = {
    findByIds: async () => new Map([...panoramaMediaAssets, ...audioMediaAssets]),
  };
  const panoramaMetadataRepository = {
    findByMediaAssetId: async (id: string) => panoramaMetadata.get(id) ?? null,
    findByMediaAssetIds: async (ids: string[]) =>
      new Map(
        ids.flatMap((id) => (panoramaMetadata.has(id) ? [[id, panoramaMetadata.get(id)!]] : [])),
      ),
  };

  return new VirtualTourQueryService(
    destinationQueryService as never,
    repository,
    mediaAssetRepository as never,
    panoramaMetadataRepository as never,
    { publicOrigin: 'https://cdn.example.test' },
  ).findManifestByDestinationSlug(destination.slug);
}

function emptyAudio() {
  return {
    destinationAmbient: null,
    sceneAmbientOverrides: [],
    narrations: [],
    tracks: [],
    transcripts: [],
  };
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
