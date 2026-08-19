import type { GetImmersiveManifest200 } from '@hatinh/api-client';
import { describe, expect, it } from 'vitest';

import { getPanoramaTourLinks } from '../../panorama-tour';
import { getSceneLinks, mapImmersiveManifest } from './immersive-manifest.mapper';

function createManifestDto(): GetImmersiveManifest200 {
  return {
    ambientTrackId: 'ambient-destination',
    audioTracks: [
      {
        id: 'ambient-destination',
        type: 'ambient',
        label: 'Không gian chung',
        locale: null,
        src: 'https://cdn.example.vn/audio/ambient.mp3',
        durationMs: 120000,
        rights: 'customer-owned',
        readiness: 'ready',
        voiceId: null,
        version: 'ambient-v1',
      },
      {
        id: 'ambient-override',
        type: 'ambient',
        label: 'Sân trung tâm',
        locale: null,
        src: 'https://cdn.example.vn/audio/courtyard.mp3',
        durationMs: 90000,
        rights: 'licensed',
        readiness: 'ready',
        voiceId: null,
        version: 'courtyard-v2',
      },
      {
        id: 'narration-vi',
        type: 'narration',
        label: 'Thuyết minh tiếng Việt',
        locale: 'vi',
        src: 'https://cdn.example.vn/audio/vi.mp3',
        durationMs: 22000,
        rights: 'customer-owned',
        readiness: 'ready',
        voiceId: 'voice-vi-01',
        version: 'narration-vi-v3',
      },
    ],
    defaultSceneId: 'scene-01',
    destination: {
      categoryId: null,
      categoryLabel: 'Di sản',
      coverImageUrl: null,
      coverMediaId: null,
      defaultSceneId: 'scene-01',
      description: 'Một hành trình di sản.',
      geoPoint: { latitude: 18.3421, longitude: 105.9032 },
      id: 'destination-01',
      name: 'Sơn Trang Cổ Đạm',
      slug: 'son-trang-co-dam',
      status: 'published',
      summary: 'Hành trình di sản ở Hà Tĩnh.',
    },
    nodes: [
      {
        altitude: 12,
        destinationId: 'destination-01',
        id: 'scene-02',
        initialFov: 88,
        initialHeading: 32,
        initialPitch: 2,
        lat: 18.3424,
        lng: 105.9034,
        name: 'Sân trung tâm',
        panoramaAssetId: 'asset-02',
        panoramaAssetStatus: 'ready',
        panoramaManifestUrl: 'https://cdn.example.vn/scene-02/manifest.json',
        panoramaPreviewUrl: 'https://cdn.example.vn/scene-02/preview.webp',
        ambientOverrideTrackId: null,
        narrationTrackIds: { vi: null, en: null },
        transcriptIds: { vi: null, en: null },
        sortOrder: 1,
        status: 'published',
      },
      {
        altitude: 12,
        destinationId: 'destination-01',
        id: 'scene-01',
        initialFov: 90,
        initialHeading: 0,
        initialPitch: 0,
        lat: 18.3421,
        lng: 105.9032,
        name: 'Cổng vào',
        panoramaAssetId: 'asset-01',
        panoramaAssetStatus: 'ready',
        panoramaManifestUrl: 'https://cdn.example.vn/scene-01/manifest.json',
        panoramaPreviewUrl: null,
        ambientOverrideTrackId: 'ambient-override',
        narrationTrackIds: { vi: 'narration-vi', en: null },
        transcriptIds: { vi: 'transcript-vi', en: 'transcript-en' },
        sortOrder: 0,
        status: 'published',
      },
      {
        altitude: null,
        destinationId: 'destination-01',
        id: 'scene-03',
        initialFov: 90,
        initialHeading: 64,
        initialPitch: 1,
        lat: 18.3428,
        lng: 105.9038,
        name: 'Vườn cây',
        panoramaAssetId: null,
        panoramaAssetStatus: null,
        panoramaManifestUrl: null,
        panoramaPreviewUrl: null,
        ambientOverrideTrackId: null,
        narrationTrackIds: { vi: null, en: null },
        transcriptIds: { vi: null, en: null },
        sortOrder: 2,
        status: 'published',
      },
      {
        altitude: 13,
        destinationId: 'destination-01',
        id: 'scene-04',
        initialFov: 90,
        initialHeading: 96,
        initialPitch: 1,
        lat: 18.343,
        lng: 105.904,
        name: 'Bến nước',
        panoramaAssetId: 'asset-04',
        panoramaAssetStatus: 'ready',
        panoramaManifestUrl: 'https://cdn.example.vn/scene-04/manifest.json',
        panoramaPreviewUrl: 'https://cdn.example.vn/scene-04/preview.webp',
        ambientOverrideTrackId: null,
        narrationTrackIds: { vi: null, en: null },
        transcriptIds: { vi: null, en: null },
        sortOrder: 3,
        status: 'published',
      },
    ],
    links: [
      {
        bidirectional: true,
        fromSceneId: 'scene-01',
        id: 'link-01-02',
        pitch: -2,
        sortOrder: 0,
        toSceneId: 'scene-02',
        yaw: 18,
      },
      {
        bidirectional: true,
        fromSceneId: 'scene-02',
        id: 'link-02-03',
        pitch: 1,
        sortOrder: 1,
        toSceneId: 'scene-03',
        yaw: 120,
      },
      {
        bidirectional: true,
        fromSceneId: 'scene-02',
        id: 'link-02-04',
        pitch: 4,
        sortOrder: 2,
        toSceneId: 'scene-04',
        yaw: 240,
      },
    ],
    hotspots: [
      {
        id: 'hotspot-01',
        payload: {
          mediaUrl: 'https://cdn.example.vn/hotspots/story.webp',
          text: 'Lịch sử cổng vào.',
          title: 'Câu chuyện cổng vào',
        },
        pitch: -3,
        sceneId: 'scene-01',
        status: 'published',
        type: 'information',
        yaw: 32,
      },
    ],
    transcripts: [
      {
        id: 'transcript-vi',
        locale: 'vi',
        title: 'Cổng vào',
        timingMode: 'timed',
        rights: 'customer-owned',
        segments: [{ id: 'segment-vi-1', startMs: 0, endMs: 1200, text: 'Xin chào.' }],
      },
      {
        id: 'transcript-en',
        locale: 'en',
        title: 'Entrance',
        timingMode: 'plain',
        rights: 'licensed',
        segments: [{ id: 'segment-en-1', startMs: null, endMs: null, text: 'Welcome.' }],
      },
    ],
  };
}

describe('mapImmersiveManifest', () => {
  it('maps server-selected localized copy and preserves a branched scene graph', () => {
    const view = mapImmersiveManifest(createManifestDto());

    expect(view.destination.name).toBe('Sơn Trang Cổ Đạm');
    expect(view.ambientTrackId).toBe('ambient-destination');
    expect(view.audioTracks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'narration-vi',
          voiceId: 'voice-vi-01',
          version: 'narration-vi-v3',
          readiness: 'ready',
        }),
      ]),
    );
    expect(view.nodes.map((node) => node.id)).toEqual([
      'scene-01',
      'scene-02',
      'scene-03',
      'scene-04',
    ]);
    expect(view.panoramaNodes.map((node) => node.id)).toEqual(['scene-01', 'scene-02', 'scene-04']);
    expect(view.panoramaNodes[0]?.previewUrl).toBe('https://cdn.example.vn/scene-01/preview.webp');
    expect(view.panoramaNodes[0]).toEqual(
      expect.objectContaining({
        ambientTrackId: 'ambient-override',
        narrationTrackIds: { vi: 'narration-vi' },
        transcripts: {
          vi: expect.objectContaining({ timingMode: 'timed' }),
          en: expect.objectContaining({ timingMode: 'plain' }),
        },
      }),
    );
    expect(view.panoramaNodes[0]?.transcripts?.en?.segments[0]).toEqual({
      id: 'segment-en-1',
      startMs: null,
      endMs: null,
      text: 'Welcome.',
    });
    expect(view.panoramaNodes[1]?.links).toEqual([
      { targetNodeId: 'scene-01', yaw: 198, pitch: -2 },
      { targetNodeId: 'scene-04', yaw: 240, pitch: 4 },
    ]);
    expect(getSceneLinks(view.links, 'scene-02').map((link) => link.targetSceneId)).toEqual([
      'scene-01',
      'scene-03',
      'scene-04',
    ]);
    expect(getSceneLinks(view.links, 'scene-02')[0]?.yaw).toBe(198);
    expect(getPanoramaTourLinks(view.panoramaNodes, view.links).map((link) => link.id)).toEqual([
      'link-01-02',
      'link-01-02:reverse',
      'link-02-04',
      'link-02-04:reverse',
    ]);
    expect(view.hotspots[0]).toEqual(
      expect.objectContaining({
        id: 'hotspot-01',
        label: 'Câu chuyện cổng vào',
        content: 'Lịch sử cổng vào.',
        mediaUrl: 'https://cdn.example.vn/hotspots/story.webp',
      }),
    );
  });

  it('uses stable copy fallbacks when localized fields are empty', () => {
    const dto = createManifestDto();
    dto.destination.name = '';
    dto.destination.summary = '';

    const view = mapImmersiveManifest(dto);

    expect(view.destination.name).toBe('son-trang-co-dam');
    expect(view.destination.summary).toBe('Một hành trình di sản.');
  });

  it('does not pass links to URL-backed scenes whose media is not ready into the panorama graph', () => {
    const dto = createManifestDto();
    const unavailableNode = dto.nodes.find((node) => node.id === 'scene-03');
    if (!unavailableNode) {
      throw new Error('TEST_SCENE_REQUIRED');
    }

    unavailableNode.panoramaManifestUrl = 'https://cdn.example.vn/scene-03/manifest.json';
    unavailableNode.panoramaAssetStatus = null;

    const view = mapImmersiveManifest(dto);

    expect(view.panoramaNodes.map((node) => node.id)).toEqual([
      'scene-01',
      'scene-02',
      'scene-03',
      'scene-04',
    ]);
    expect(view.panoramaNodes.find((node) => node.id === 'scene-02')?.links).toEqual([
      { targetNodeId: 'scene-01', yaw: 198, pitch: -2 },
      { targetNodeId: 'scene-04', yaw: 240, pitch: 4 },
    ]);
    expect(getPanoramaTourLinks(view.panoramaNodes, view.links).map((link) => link.id)).toEqual([
      'link-01-02',
      'link-01-02:reverse',
      'link-02-04',
      'link-02-04:reverse',
    ]);
  });
});
