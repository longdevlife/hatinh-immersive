import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parsePanoramaManifest } from '@hatinh/immersive-contracts';

import { DEMO_DESTINATIONS, getDemoManifest } from './demo-catalog';

describe('Hà Tĩnh demo catalog', () => {
  it('contains four uniquely addressable destinations with valid curated cameras', () => {
    expect(DEMO_DESTINATIONS).toHaveLength(4);
    expect(new Set(DEMO_DESTINATIONS.map(({ preview }) => preview.slug)).size).toBe(4);
    expect(new Set(DEMO_DESTINATIONS.map(({ location }) => location.id)).size).toBe(4);

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

  it('includes the Sơn Trang focus destination in the deterministic catalog', () => {
    expect(DEMO_DESTINATIONS.map(({ preview }) => preview.slug)).toContain('son-trang-co-dam');
    expect(getDemoManifest('son-trang-co-dam').defaultSceneId).toBe('son-trang-gate');
  });

  it('maps every destination to an entry scene and a valid scene-link graph', () => {
    for (const { preview } of DEMO_DESTINATIONS) {
      const manifest = getDemoManifest(preview.slug);
      const nodeIds = new Set(manifest.nodes.map(({ id }) => id));

      expect(manifest.destination.slug).toBe(preview.slug);
      expect(manifest.nodes.length).toBeGreaterThan(1);
      expect(manifest.defaultSceneId).not.toBeNull();
      expect(nodeIds).toContain(manifest.defaultSceneId);
      expect(manifest.panoramaNodes.every(({ id }) => nodeIds.has(id))).toBe(true);
      for (const link of manifest.links) {
        expect(link.sourceSceneId !== undefined && nodeIds.has(link.sourceSceneId)).toBe(true);
        expect(nodeIds).toContain(link.targetSceneId);
      }
    }
  });

  it('keeps the Thiên Cầm walk nodes within natural walking distance', () => {
    const nodes = getDemoManifest('bien-thien-cam').nodes;

    for (let index = 1; index < nodes.length; index += 1) {
      const previous = nodes[index - 1]!;
      const current = nodes[index]!;
      const distance = distanceMeters(previous.lat, previous.lng, current.lat, current.lng);
      expect(distance).toBeGreaterThanOrEqual(5);
      expect(distance).toBeLessThanOrEqual(15);
    }
  });

  it('does not point synthetic scene thumbnails at non-existent public files', () => {
    const manifest = getDemoManifest('son-trang-co-dam', 'synthetic');

    expect(manifest.panoramaNodes).toHaveLength(8);
    expect(manifest.panoramaNodes.every((node) => node.thumbnailUrl === null)).toBe(true);
    expect(
      manifest.panoramaNodes.every((node) =>
        Boolean(node.panoramaUrl?.startsWith('/demo/360/son-trang-tour/')),
      ),
    ).toBe(true);
  });

  it('keeps unavailable public scenes in the Nguyễn Du and Đồng Lộc tour graphs', () => {
    for (const slug of ['khu-luu-niem-nguyen-du', 'nga-ba-dong-loc']) {
      const manifest = getDemoManifest(slug, 'public');

      expect(manifest.panoramaNodes).toHaveLength(4);
      expect(manifest.panoramaNodes.filter((node) => node.panoramaUrl === null)).toHaveLength(3);
      expect(
        manifest.panoramaNodes
          .filter((node) => node.panoramaUrl === null)
          .every((node) => node.mediaQuality === 'missing'),
      ).toBe(true);
    }
  });

  it('keeps a mode-specific demo manifest stable for persistent renderer consumers', () => {
    expect(getDemoManifest('son-trang-co-dam', 'synthetic')).toBe(
      getDemoManifest('son-trang-co-dam', 'synthetic'),
    );
    expect(getDemoManifest('son-trang-co-dam', 'public')).toBe(
      getDemoManifest('son-trang-co-dam', 'public'),
    );
    expect(getDemoManifest('son-trang-co-dam', 'synthetic')).not.toBe(
      getDemoManifest('son-trang-co-dam', 'public'),
    );
  });

  it('rejects an unknown demo destination slug', () => {
    expect(() => getDemoManifest('khong-ton-tai')).toThrow(
      'DEMO_DESTINATION_NOT_FOUND:khong-ton-tai',
    );
  });

  it('references only committed local progressive panorama media', async () => {
    const publicRoot = path.resolve(process.cwd(), 'public');

    for (const { preview } of DEMO_DESTINATIONS) {
      const manifest = getDemoManifest(preview.slug);
      for (const node of manifest.panoramaNodes) {
        if (!node.panoramaUrl || !node.previewUrl) {
          continue;
        }
        expect(node.panoramaUrl).toMatch(/^\/demo\/360\/.*\/manifest\.json$/);
        expect(node.previewUrl).toMatch(/^\/demo\/360\/.*\/preview\.webp$/);

        const output = path.join(
          publicRoot,
          node.panoramaUrl.slice(1, node.panoramaUrl.lastIndexOf('/')),
        );
        const mediaManifest = parsePanoramaManifest(
          JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8')),
        );
        expect((await stat(path.join(output, mediaManifest.preview))).size).toBeGreaterThan(0);
        expect((await stat(path.join(output, 'tiles', '0', '0-0.webp'))).size).toBeGreaterThan(0);
      }
    }
  });
});

function distanceMeters(latA: number, lngA: number, latB: number, lngB: number): number {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(latB - latA);
  const deltaLng = toRadians(lngB - lngA);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
