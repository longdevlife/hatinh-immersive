import type {
  PanoramaMediaQuality,
  PanoramaNode,
  RendererStatus,
  SceneLinkVm,
} from '../../../shared/contracts';

export interface PanoramaTourSceneItemVm {
  id: string;
  label: string;
  isCurrent: boolean;
  isVisited: boolean;
  mediaQuality: PanoramaMediaQuality;
  canNavigate: boolean;
}

export interface PanoramaTourHotspotVm {
  id: string;
  label: string;
  targetSceneId: string;
  yaw: number;
  pitch: number;
  canNavigate: boolean;
}

export interface PanoramaTourPresentationVm {
  currentSceneId: string | null;
  status: RendererStatus;
  isTransitioning: boolean;
  scenes: PanoramaTourSceneItemVm[];
  hotspots: PanoramaTourHotspotVm[];
}

export interface PanoramaTourPresentationActions {
  onBack(): void;
  onSelectScene(sceneId: string): void;
  onSelectHotspot(hotspotId: string): void;
  onRetry(): void;
}

export interface PanoramaTourGraphValidation {
  valid: boolean;
  issues: string[];
}

export interface PanoramaAnchorLike {
  panoramaSceneId?: string | null;
}

const DEFAULT_MEDIA_QUALITY: PanoramaMediaQuality = 'ready';

export function isPanoramaSceneUsable(node: PanoramaNode): boolean {
  return (node.mediaQuality ?? DEFAULT_MEDIA_QUALITY) === 'ready';
}

/**
 * API manifests can retain links to published scenes whose panorama media
 * was not returned. Keep the scene graph strict, but remove those stale
 * edges before the panorama-only graph is validated or rendered.
 */
export function getPanoramaTourLinks(
  nodes: readonly PanoramaNode[],
  links: readonly SceneLinkVm[],
): SceneLinkVm[] {
  const nodeIds = new Set(nodes.filter(isPanoramaSceneUsable).map((node) => node.id));
  return links.filter(
    (link) =>
      Boolean(link.sourceSceneId) &&
      nodeIds.has(link.sourceSceneId!) &&
      nodeIds.has(link.targetSceneId),
  );
}

export function getPanoramaRenderableNodes(nodes: readonly PanoramaNode[]): PanoramaNode[] {
  const usableNodeIds = new Set(nodes.filter(isPanoramaSceneUsable).map((node) => node.id));

  return nodes.filter(isPanoramaSceneUsable).map((node) => ({
    ...node,
    ...(node.links
      ? { links: node.links.filter((link) => usableNodeIds.has(link.targetNodeId)) }
      : {}),
  }));
}

export function validatePanoramaTourGraph(
  nodes: readonly PanoramaNode[],
  links: readonly SceneLinkVm[],
): PanoramaTourGraphValidation {
  const issues: string[] = [];
  const nodeIds = new Set<string>();

  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      issues.push(`DUPLICATE_NODE:${node.id}`);
    }
    nodeIds.add(node.id);
  }

  const linkIds = new Set<string>();
  for (const link of links) {
    if (linkIds.has(link.id)) {
      issues.push(`DUPLICATE_LINK:${link.id}`);
    }
    linkIds.add(link.id);

    if (!link.sourceSceneId || !nodeIds.has(link.sourceSceneId)) {
      issues.push(`LINK_SOURCE_NOT_FOUND:${link.id}:${link.sourceSceneId ?? ''}`);
    }
    if (!nodeIds.has(link.targetSceneId)) {
      issues.push(`LINK_TARGET_NOT_FOUND:${link.id}:${link.targetSceneId}`);
    }
  }

  return { valid: issues.length === 0, issues };
}

export function resolveTourSceneId(
  nodes: readonly PanoramaNode[],
  initialSceneId: string | null,
  requestedSceneId: string | null,
): string | null {
  if (
    requestedSceneId &&
    nodes.some((node) => node.id === requestedSceneId && isPanoramaSceneUsable(node))
  ) {
    return requestedSceneId;
  }
  if (
    initialSceneId &&
    nodes.some((node) => node.id === initialSceneId && isPanoramaSceneUsable(node))
  ) {
    return initialSceneId;
  }
  return nodes.find(isPanoramaSceneUsable)?.id ?? null;
}

export function resolvePanoramaSceneForAnchor(
  anchor: PanoramaAnchorLike,
  nodes: readonly PanoramaNode[],
): PanoramaNode | null {
  if (!anchor.panoramaSceneId) {
    return null;
  }

  const node = nodes.find((candidate) => candidate.id === anchor.panoramaSceneId);
  return node && isPanoramaSceneUsable(node) ? node : null;
}

export function resolveTourNavigationTarget(
  nodes: readonly PanoramaNode[],
  links: readonly SceneLinkVm[],
  currentSceneId: string | null,
  targetSceneId: string,
): PanoramaNode | null {
  const target = nodes.find((node) => node.id === targetSceneId);
  if (!target || !isPanoramaSceneUsable(target)) {
    return null;
  }

  if (!currentSceneId) {
    return target;
  }

  return links.some(
    (link) => link.sourceSceneId === currentSceneId && link.targetSceneId === targetSceneId,
  )
    ? target
    : null;
}

export function buildPanoramaTourPresentationVm({
  nodes,
  links,
  currentSceneId,
  visitedSceneIds,
  status,
  isTransitioning,
}: {
  nodes: readonly PanoramaNode[];
  links: readonly SceneLinkVm[];
  currentSceneId: string | null;
  visitedSceneIds: readonly string[];
  status: RendererStatus;
  isTransitioning: boolean;
}): PanoramaTourPresentationVm {
  const visited = new Set(visitedSceneIds);
  const scenes = nodes.map((node) => ({
    id: node.id,
    label: node.name ?? node.id,
    isCurrent: node.id === currentSceneId,
    isVisited: visited.has(node.id),
    mediaQuality: node.mediaQuality ?? DEFAULT_MEDIA_QUALITY,
    canNavigate: isPanoramaSceneUsable(node),
  }));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const hotspots = links
    .filter((link) => link.sourceSceneId === currentSceneId)
    .map((link) => ({
      id: link.id,
      label: link.label ?? nodeById.get(link.targetSceneId)?.name ?? link.targetSceneId,
      targetSceneId: link.targetSceneId,
      yaw: link.yaw,
      pitch: link.pitch,
      canNavigate: Boolean(
        nodeById.get(link.targetSceneId) &&
        isPanoramaSceneUsable(nodeById.get(link.targetSceneId)!),
      ),
    }));

  return { currentSceneId, status, isTransitioning, scenes, hotspots };
}
