import { describe, expect, it } from 'vitest';

import type { PanoramaNode, SceneLinkVm } from '../../../shared/contracts';
import {
  buildPanoramaTourPresentationVm,
  getPanoramaRenderableNodes,
  getPanoramaTourLinks,
  isPanoramaSceneUsable,
  resolvePanoramaSceneForAnchor,
  resolveTourNavigationTarget,
  resolveTourSceneId,
  validatePanoramaTourGraph,
} from './panorama-tour';

const nodes: PanoramaNode[] = [
  {
    id: 'gate',
    name: 'Cổng Sơn Trang',
    panoramaUrl: '/demo/360/gate/manifest.json',
    previewUrl: '/demo/360/gate/preview.webp',
    lat: 18.3421,
    lng: 105.9032,
    initialView: { heading: 0, pitch: 0, fov: 88 },
    mediaQuality: 'ready',
    mediaRights: 'demo-only',
  },
  {
    id: 'culture',
    name: 'Không gian Văn hóa',
    panoramaUrl: '/demo/360/culture/manifest.json',
    previewUrl: null,
    lat: 18.3423,
    lng: 105.9034,
    initialView: { heading: 90, pitch: 0, fov: 88 },
    mediaQuality: 'missing',
  },
];

const links: SceneLinkVm[] = [
  {
    id: 'gate:culture',
    sourceSceneId: 'gate',
    targetSceneId: 'culture',
    label: 'Đi tới Văn hóa',
    yaw: 90,
    pitch: 0,
  },
];

describe('Sơn Trang panorama tour model', () => {
  it('normalizes stale API links after media-only nodes are removed', () => {
    const staleLink: SceneLinkVm = {
      id: 'gate:missing',
      sourceSceneId: 'gate',
      targetSceneId: 'missing',
      label: 'Đi tới điểm chưa có media',
      yaw: 180,
      pitch: 0,
    };

    expect(getPanoramaTourLinks(nodes, [...links, staleLink])).toEqual([]);

    const usableNodes = nodes.map((node) =>
      node.id === 'culture'
        ? { ...node, mediaQuality: 'ready' as const, mediaRights: 'demo-only' as const }
        : node,
    );
    expect(getPanoramaTourLinks(usableNodes, [...links, staleLink])).toEqual(links);
  });

  it('sanitizes node links before renderer consumption', () => {
    const renderableNodes = [
      { ...nodes[0]!, links: [{ targetNodeId: 'missing', yaw: 10, pitch: -2 }] },
      {
        ...nodes[1]!,
        mediaQuality: 'ready' as const,
        mediaRights: 'demo-only' as const,
        links: [],
      },
      { ...nodes[1]!, id: 'missing', mediaQuality: 'missing' as const, links: [] },
    ];

    expect(getPanoramaRenderableNodes(renderableNodes)).toEqual([
      { ...renderableNodes[0]!, links: [] },
      renderableNodes[1],
    ]);
  });

  it('validates a graph and rejects links to unknown scenes', () => {
    expect(validatePanoramaTourGraph(nodes, links)).toEqual({ valid: true, issues: [] });
    expect(
      validatePanoramaTourGraph(nodes, [
        ...links,
        { ...links[0]!, id: 'bad', targetSceneId: 'unknown' },
      ]),
    ).toEqual({
      valid: false,
      issues: ['LINK_TARGET_NOT_FOUND:bad:unknown'],
    });
  });

  it('resolves valid, invalid and missing deep-linked scenes deterministically', () => {
    const usableNodes = nodes.map((node) =>
      node.id === 'culture'
        ? { ...node, mediaQuality: 'ready' as const, mediaRights: 'demo-only' as const }
        : node,
    );

    expect(resolveTourSceneId(usableNodes, 'gate', 'culture')).toBe('culture');
    expect(resolveTourSceneId(nodes, 'gate', 'unknown')).toBe('gate');
    expect(resolveTourSceneId(nodes, 'unknown', null)).toBe('gate');
    expect(resolveTourSceneId(nodes, 'culture', 'culture')).toBe('gate');
  });

  it('maps an anchor to a scene only when its media is usable', () => {
    expect(resolvePanoramaSceneForAnchor({ panoramaSceneId: 'gate' }, nodes)?.id).toBe('gate');
    expect(resolvePanoramaSceneForAnchor({ panoramaSceneId: 'culture' }, nodes)).toBeNull();
    expect(resolvePanoramaSceneForAnchor({ panoramaSceneId: null }, nodes)).toBeNull();
    expect(isPanoramaSceneUsable(nodes[0]!)).toBe(true);
    expect(isPanoramaSceneUsable(nodes[1]!)).toBe(false);
  });

  it('does not make low-resolution demo media publicly navigable', () => {
    expect(
      isPanoramaSceneUsable({
        ...nodes[0]!,
        mediaQuality: 'low-resolution',
        mediaRights: 'demo-only',
      }),
    ).toBe(false);
  });

  it('accepts only a linked, usable directional target', () => {
    expect(resolveTourNavigationTarget(nodes, links, 'gate', 'culture')).toBeNull();
    expect(
      resolveTourNavigationTarget(
        nodes.map((node) =>
          node.id === 'culture'
            ? { ...node, mediaQuality: 'ready' as const, mediaRights: 'demo-only' as const }
            : node,
        ),
        links,
        'gate',
        'culture',
      )?.id,
    ).toBe('culture');
    expect(resolveTourNavigationTarget(nodes, links, 'culture', 'gate')).toBeNull();
  });

  it('builds a presentation VM with current scene, visited state and navigable links', () => {
    expect(
      buildPanoramaTourPresentationVm({
        nodes,
        links,
        currentSceneId: 'gate',
        visitedSceneIds: ['gate'],
        status: 'ready',
        isTransitioning: false,
      }),
    ).toEqual({
      currentSceneId: 'gate',
      status: 'ready',
      isTransitioning: false,
      scenes: [
        {
          id: 'gate',
          label: 'Cổng Sơn Trang',
          isCurrent: true,
          isVisited: true,
          mediaQuality: 'ready',
          canNavigate: true,
        },
        {
          id: 'culture',
          label: 'Không gian Văn hóa',
          isCurrent: false,
          isVisited: false,
          mediaQuality: 'missing',
          canNavigate: false,
        },
      ],
      hotspots: [
        {
          id: 'gate:culture',
          label: 'Đi tới Văn hóa',
          targetSceneId: 'culture',
          yaw: 90,
          pitch: 0,
          canNavigate: false,
        },
      ],
    });
  });
});
