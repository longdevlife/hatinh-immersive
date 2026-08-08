import { describe, expect, it } from 'vitest';

import type { SceneLinkVm, SceneNodeVm } from '../../../shared/contracts';

import { buildMinimapGeoJson, normalizeHeading, toMapLibreCoordinate } from './projection';

const nodes: SceneNodeVm[] = [
  {
    heading: 12,
    id: 'scene-01',
    isCurrent: true,
    isVisited: true,
    lat: 18.342,
    lng: 105.9,
    name: 'Cổng di sản',
  },
  {
    heading: 45,
    id: 'scene-02',
    isCurrent: false,
    isVisited: true,
    lat: 18.343,
    lng: 105.902,
    name: 'Lối đi ven hồ',
  },
  {
    heading: 90,
    id: 'scene-03',
    isCurrent: false,
    isVisited: false,
    lat: 18.344,
    lng: 105.904,
    name: 'Nhà trưng bày',
  },
];

const links: SceneLinkVm[] = [
  {
    id: 'link-01-02',
    label: 'Đi tiếp',
    pitch: 0,
    targetSceneId: 'scene-02',
    yaw: 90,
  },
  {
    id: 'link-01-03',
    label: 'Nhà trưng bày',
    pitch: 0,
    targetSceneId: 'scene-03',
    yaw: 40,
  },
];

describe('minimap projection', () => {
  it('preserves WGS84 order as [longitude, latitude]', () => {
    expect(toMapLibreCoordinate(nodes[0]!)).toEqual([105.9, 18.342]);
  });

  it('projects visited/current nodes and outgoing scene links', () => {
    const geoJson = buildMinimapGeoJson(nodes, links, 'scene-01');

    expect(geoJson.nodes.features).toHaveLength(3);
    expect(geoJson.nodes.features[0]).toMatchObject({
      geometry: { coordinates: [105.9, 18.342] },
      properties: { id: 'scene-01', isCurrent: true, isVisited: true },
    });
    expect(geoJson.route.features).toEqual([
      expect.objectContaining({
        geometry: {
          coordinates: [
            [105.9, 18.342],
            [105.902, 18.343],
          ],
          type: 'LineString',
        },
        properties: {
          id: 'link-01-02',
          sourceSceneId: 'scene-01',
          targetSceneId: 'scene-02',
        },
        type: 'Feature',
      }),
      expect.objectContaining({
        geometry: {
          coordinates: [
            [105.9, 18.342],
            [105.904, 18.344],
          ],
          type: 'LineString',
        },
        properties: {
          id: 'link-01-03',
          sourceSceneId: 'scene-01',
          targetSceneId: 'scene-03',
        },
        type: 'Feature',
      }),
    ]);
  });

  it('normalizes heading to the map marker range', () => {
    expect(normalizeHeading(-45)).toBe(315);
    expect(normalizeHeading(725)).toBe(5);
  });
});
