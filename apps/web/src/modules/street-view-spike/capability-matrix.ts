export const STREET_VIEW_COMPARISON_DIMENSIONS = [
  'customPanoramaAddressability',
  'projectOwnedMedia',
  'sceneGraphNavigation',
  'hotspotContent',
  'tileFailureControl',
  'offlinePreservation',
] as const;

export type StreetViewComparisonDimension = (typeof STREET_VIEW_COMPARISON_DIMENSIONS)[number];
export type StreetViewCapability = 'supported' | 'limited' | 'unsupported' | 'unknown';

export interface StreetViewSpikeNode {
  customPanoramaId: string | null;
  hasProjectOwnedMedia: boolean;
  hotspotCount: number;
  id: string;
  linkCount: number;
}

export interface StreetViewCapabilityMatrixEntry {
  capabilities: Record<StreetViewComparisonDimension, StreetViewCapability>;
  nodeId: string;
  productionRenderer: 'photo-sphere-viewer';
}

export function buildStreetViewCapabilityMatrix(
  nodes: StreetViewSpikeNode[],
): StreetViewCapabilityMatrixEntry[] {
  return nodes.map((node) => ({
    nodeId: node.id,
    capabilities: {
      customPanoramaAddressability: node.customPanoramaId ? 'supported' : 'unsupported',
      projectOwnedMedia: 'unsupported',
      sceneGraphNavigation: node.linkCount > 0 ? 'limited' : 'unsupported',
      hotspotContent: node.hotspotCount > 0 ? 'limited' : 'unsupported',
      tileFailureControl: 'unknown',
      offlinePreservation: 'unsupported',
    },
    productionRenderer: 'photo-sphere-viewer',
  }));
}
