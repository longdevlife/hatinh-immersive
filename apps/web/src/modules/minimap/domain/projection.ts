import type { SceneLinkVm, SceneNodeVm } from '../../../shared/contracts';

export type MapLibreCoordinate = [longitude: number, latitude: number];

export interface MinimapNodeProperties {
  id: string;
  isCurrent: boolean;
  isVisited: boolean;
  name: string;
}

export interface MinimapRouteProperties {
  id: string;
  targetSceneId: string;
}

export interface MinimapPointFeature {
  geometry: {
    coordinates: MapLibreCoordinate;
    type: 'Point';
  };
  properties: MinimapNodeProperties;
  type: 'Feature';
}

export interface MinimapLineFeature {
  geometry: {
    coordinates: [MapLibreCoordinate, MapLibreCoordinate];
    type: 'LineString';
  };
  properties: MinimapRouteProperties;
  type: 'Feature';
}

export interface MinimapGeoJson {
  nodes: {
    features: MinimapPointFeature[];
    type: 'FeatureCollection';
  };
  route: {
    features: MinimapLineFeature[];
    type: 'FeatureCollection';
  };
}

export function normalizeHeading(heading: number): number {
  const normalized = heading % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function toMapLibreCoordinate(node: Pick<SceneNodeVm, 'lat' | 'lng'>): MapLibreCoordinate {
  return [node.lng, node.lat];
}

export function buildMinimapGeoJson(
  nodes: SceneNodeVm[],
  links: SceneLinkVm[],
  currentSceneId: string | null,
): MinimapGeoJson {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const currentNode = currentSceneId ? nodeById.get(currentSceneId) : undefined;

  return {
    nodes: {
      features: nodes.map((node) => ({
        geometry: {
          coordinates: toMapLibreCoordinate(node),
          type: 'Point' as const,
        },
        properties: {
          id: node.id,
          isCurrent: node.id === currentSceneId,
          isVisited: node.isVisited,
          name: node.name,
        },
        type: 'Feature' as const,
      })),
      type: 'FeatureCollection',
    },
    route: {
      features: currentNode
        ? links.flatMap((link) => {
            const targetNode = nodeById.get(link.targetSceneId);
            if (!targetNode) {
              return [];
            }

            return [
              {
                geometry: {
                  coordinates: [
                    toMapLibreCoordinate(currentNode),
                    toMapLibreCoordinate(targetNode),
                  ] as [MapLibreCoordinate, MapLibreCoordinate],
                  type: 'LineString' as const,
                },
                properties: {
                  id: link.id,
                  targetSceneId: link.targetSceneId,
                },
                type: 'Feature' as const,
              },
            ];
          })
        : [],
      type: 'FeatureCollection',
    },
  };
}
