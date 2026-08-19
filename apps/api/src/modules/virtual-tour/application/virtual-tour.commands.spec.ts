import { describe, expect, it } from 'vitest';

import type { PanoramaAssetMetadata } from '../../media/application/panorama-metadata.repository';
import { MediaAsset, type MediaAssetProps } from '../../media/domain/media-asset';
import { SceneNode } from '../domain/scene-node';
import { VirtualTourCommandService } from './virtual-tour.commands';
import type { VirtualTourRepository } from './virtual-tour.repository';

describe('VirtualTourCommandService panorama assignment', () => {
  it.each([
    ['wrong media kind', { mediaKind: 'image' as const }, acceptedMetadata()],
    ['non-ready media', { status: 'processing' as const }, acceptedMetadata()],
    ['missing metadata', {}, null],
    ['rejected quality', {}, acceptedMetadata({ qualityStatus: 'rejected' })],
    ['missing manifest', {}, acceptedMetadata({ manifestKey: null })],
    ['missing preview', {}, acceptedMetadata({ previewKey: null })],
    ['missing version', {}, acceptedMetadata({ version: '' })],
    ['missing provenance', {}, acceptedMetadata({ rightsReference: '' })],
  ])('rejects %s', async (_case, assetOverrides, metadata) => {
    const context = createContext(createAsset(assetOverrides), metadata);

    await expect(
      context.service.assignPanoramaToScene('scene-1', 'panorama-asset'),
    ).rejects.toMatchObject({ code: 'PANORAMA_NOT_PUBLICATION_READY' });
    expect(context.repository.savedScenes).toHaveLength(0);
  });

  it('assigns only a publication-eligible production panorama', async () => {
    const context = createContext(createAsset(), acceptedMetadata());

    const scene = await context.service.assignPanoramaToScene('scene-1', 'panorama-asset');

    expect(scene.toPrimitives()).toMatchObject({
      panoramaAssetId: 'panorama-asset',
      panoramaAssetStatus: 'ready',
    });
    expect(context.repository.savedScenes).toEqual([scene]);
  });
});

function createContext(asset: MediaAsset, metadata: PanoramaAssetMetadata | null) {
  const scene = SceneNode.create({
    id: 'scene-1',
    destinationId: 'destination-1',
    name: 'Scene 1',
    geoPoint: { latitude: 18.3, longitude: 105.9 },
    initialHeading: 0,
    initialPitch: 0,
    initialFov: 90,
    sortOrder: 0,
  });
  const savedScenes: SceneNode[] = [];
  const repository = {
    savedScenes,
    async findSceneById(id: string) {
      return id === scene.id ? scene : null;
    },
    async saveScene(value: SceneNode) {
      savedScenes.push(value);
    },
  } as unknown as VirtualTourRepository & { savedScenes: SceneNode[] };
  const mediaRepository = {
    async findById(id: string) {
      return id === asset.id ? asset : null;
    },
  };
  const metadataRepository = {
    async findByMediaAssetId(id: string) {
      return id === asset.id ? metadata : null;
    },
  };
  return {
    repository,
    service: new VirtualTourCommandService(
      repository,
      mediaRepository as never,
      metadataRepository as never,
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
    status: 'ready',
    etag: 'etag',
    failureCode: null,
    createdAt: now,
    updatedAt: now,
    uploadedAt: now,
    readyAt: now,
    ...overrides,
  });
}

function acceptedMetadata(overrides: Partial<PanoramaAssetMetadata> = {}): PanoramaAssetMetadata {
  const now = new Date('2026-08-19T00:00:00.000Z');
  return {
    mediaAssetId: 'panorama-asset',
    projection: 'equirectangular',
    sourceWidthPx: 4096,
    sourceHeightPx: 2048,
    qualityStatus: 'accepted',
    qualityCode: null,
    manifestKey: 'processed/panorama/panorama-asset/manifest.json',
    previewKey: 'processed/panorama/panorama-asset/preview.webp',
    rights: 'customer-owned',
    rightsHolder: 'Hà Tĩnh Tourism',
    rightsReference: 'approval:test',
    sourceReference: 'delivery:test',
    version: 'v1',
    processedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
