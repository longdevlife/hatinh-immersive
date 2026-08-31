import type {
  PanoramaMediaQuality,
  PanoramaNode,
  RendererStatus,
  SceneLinkVm,
} from '../../../shared/contracts';
import type { PanoramaRuntimeMediaPolicy } from '../../panorama';

export interface PanoramaTourSceneItemVm {
  id: string;
  label: string;
  role: PanoramaTourSceneRole;
  isCurrent: boolean;
  isVisited: boolean;
  mediaQuality: PanoramaMediaQuality;
  canNavigate: boolean;
}

export type PanoramaTourSceneRole = 'major-stop' | 'connector';

export interface PanoramaTourPresentationVm {
  currentSceneId: string | null;
  status: RendererStatus;
  isTransitioning: boolean;
  scenes: PanoramaTourSceneItemVm[];
}

export interface PanoramaTourPresentationActions {
  onBack(): void;
  onSelectScene(sceneId: string): void;
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

const MAJOR_STOP_SCENE_IDS = new Set([
  'gate',
  'culture',
  'ecology',
  'spiritual',
  'son-trang-gate',
  'son-trang-culture',
  'son-trang-ecology',
  'son-trang-spiritual',
]);

export function getPanoramaTourSceneRole(sceneId: string): PanoramaTourSceneRole {
  return MAJOR_STOP_SCENE_IDS.has(sceneId) ? 'major-stop' : 'connector';
}

export function isPanoramaSceneUsable(
  node: PanoramaNode,
  policy: PanoramaRuntimeMediaPolicy = 'public',
): boolean {
  if (policy === 'demo') {
    return (
      node.panoramaUrl !== null &&
      node.mediaQuality !== 'missing' &&
      node.mediaQuality !== 'invalid'
    );
  }

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
  policy: PanoramaRuntimeMediaPolicy = 'public',
): SceneLinkVm[] {
  const nodeIds = new Set(
    nodes.filter((node) => isPanoramaSceneUsable(node, policy)).map((node) => node.id),
  );
  return links.filter(
    (link) =>
      Boolean(link.sourceSceneId) &&
      nodeIds.has(link.sourceSceneId!) &&
      nodeIds.has(link.targetSceneId),
  );
}

export function getPanoramaRenderableNodes(
  nodes: readonly PanoramaNode[],
  policy: PanoramaRuntimeMediaPolicy = 'public',
): PanoramaNode[] {
  const usableNodeIds = new Set(
    nodes.filter((node) => isPanoramaSceneUsable(node, policy)).map((node) => node.id),
  );

  return nodes
    .filter((node) => isPanoramaSceneUsable(node, policy))
    .map((node) => ({
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
  policy: PanoramaRuntimeMediaPolicy = 'public',
): string | null {
  if (
    requestedSceneId &&
    nodes.some((node) => node.id === requestedSceneId && isPanoramaSceneUsable(node, policy))
  ) {
    return requestedSceneId;
  }
  if (
    initialSceneId &&
    nodes.some((node) => node.id === initialSceneId && isPanoramaSceneUsable(node, policy))
  ) {
    return initialSceneId;
  }
  return nodes.find((node) => isPanoramaSceneUsable(node, policy))?.id ?? null;
}

export function resolvePanoramaSceneForAnchor(
  anchor: PanoramaAnchorLike,
  nodes: readonly PanoramaNode[],
  policy: PanoramaRuntimeMediaPolicy = 'public',
): PanoramaNode | null {
  if (!anchor.panoramaSceneId) {
    return null;
  }

  const node = nodes.find((candidate) => candidate.id === anchor.panoramaSceneId);
  return node && isPanoramaSceneUsable(node, policy) ? node : null;
}

export function resolveTourNavigationTarget(
  nodes: readonly PanoramaNode[],
  links: readonly SceneLinkVm[],
  currentSceneId: string | null,
  targetSceneId: string,
  policy: PanoramaRuntimeMediaPolicy = 'public',
): PanoramaNode | null {
  const target = nodes.find((node) => node.id === targetSceneId);
  if (!target || !isPanoramaSceneUsable(target, policy)) {
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
  currentSceneId,
  visitedSceneIds,
  status,
  isTransitioning,
  policy = 'public',
}: {
  nodes: readonly PanoramaNode[];
  currentSceneId: string | null;
  visitedSceneIds: readonly string[];
  status: RendererStatus;
  isTransitioning: boolean;
  policy?: PanoramaRuntimeMediaPolicy;
}): PanoramaTourPresentationVm {
  const visited = new Set(visitedSceneIds);
  const scenes = nodes.map((node) => ({
    id: node.id,
    label: node.name ?? node.id,
    role: getPanoramaTourSceneRole(node.id),
    isCurrent: node.id === currentSceneId,
    isVisited: visited.has(node.id),
    mediaQuality: node.mediaQuality ?? DEFAULT_MEDIA_QUALITY,
    canNavigate: isPanoramaSceneUsable(node, policy),
  }));
  return { currentSceneId, status, isTransitioning, scenes };
}
