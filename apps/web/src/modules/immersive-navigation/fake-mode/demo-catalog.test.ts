import { describe, expect, it } from 'vitest';

import { DEMO_DESTINATIONS, getDemoManifest } from './demo-catalog';

describe('Hà Tĩnh demo catalog', () => {
  it('contains three uniquely addressable destinations with valid curated cameras', () => {
    expect(DEMO_DESTINATIONS).toHaveLength(3);
    expect(new Set(DEMO_DESTINATIONS.map(({ preview }) => preview.slug)).size).toBe(3);
    expect(new Set(DEMO_DESTINATIONS.map(({ location }) => location.id)).size).toBe(3);

    for (const { location, preview } of DEMO_DESTINATIONS) {
      expect(location.position.lat).toBeGreaterThanOrEqual(-90);
      expect(location.position.lat).toBeLessThanOrEqual(90);
      expect(location.position.lng).toBeGreaterThanOrEqual(-180);
      expect(location.position.lng).toBeLessThanOrEqual(180);
      expect(location.cameraPreset.center.lat).toBe(location.position.lat);
      expect(location.cameraPreset.center.lng).toBe(location.position.lng);
      for (const value of [
        location.cameraPreset.center.altitude,
        location.cameraPreset.heading,
        location.cameraPreset.tilt,
        location.cameraPreset.range,
      ]) {
        expect(Number.isFinite(value)).toBe(true);
      }
      expect(preview.geoPoint).toEqual({
        latitude: location.position.lat,
        longitude: location.position.lng,
      });
      expect(preview.cameraPreset).toEqual(location.cameraPreset);
    }
  });

  it('maps every destination to an entry scene and a valid scene-link graph', () => {
    for (const { preview } of DEMO_DESTINATIONS) {
      const manifest = getDemoManifest(preview.slug);
      const nodeIds = new Set(manifest.nodes.map(({ id }) => id));

      expect(manifest.destination.slug).toBe(preview.slug);
      expect(manifest.defaultSceneId).not.toBeNull();
      expect(nodeIds).toContain(manifest.defaultSceneId);
      expect(manifest.panoramaNodes.map(({ id }) => id)).toEqual(
        expect.arrayContaining([...nodeIds]),
      );
      for (const link of manifest.links) {
        expect(link.sourceSceneId !== undefined && nodeIds.has(link.sourceSceneId)).toBe(true);
        expect(nodeIds).toContain(link.targetSceneId);
      }
    }
  });

  it('rejects an unknown demo destination slug', () => {
    expect(() => getDemoManifest('khong-ton-tai')).toThrow(
      'DEMO_DESTINATION_NOT_FOUND:khong-ton-tai',
    );
  });
});
