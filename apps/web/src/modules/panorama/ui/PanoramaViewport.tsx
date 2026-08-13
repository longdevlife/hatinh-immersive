import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { HotspotVm, RendererStatus } from '../../../shared/contracts';

import type {
  PanoramaEnginePort,
  PanoramaNode,
  PanoramaView,
} from '../domain/panorama-engine.port';

import './PanoramaViewport.css';

export interface PanoramaViewportProps {
  engine: PanoramaEnginePort;
  fallback?: ReactNode;
  hotspots?: HotspotVm[];
  initialView?: PanoramaView;
  node: PanoramaNode;
  onHotspotSelect?: (hotspotId: string) => void;
  onStatusChange?: (status: RendererStatus, nodeId?: string) => void;
  onNodeChange?: (nodeId: string, view: PanoramaView) => void;
  onViewChange?: (view: PanoramaView) => void;
  tourNodes?: PanoramaNode[];
}

function areHotspotsEqual(previous: HotspotVm[] | null, next: HotspotVm[]): boolean {
  if (!previous || previous.length !== next.length) {
    return false;
  }

  return previous.every((hotspot, index) => {
    const candidate = next[index];
    return (
      candidate !== undefined &&
      hotspot.id === candidate.id &&
      hotspot.sceneId === candidate.sceneId &&
      hotspot.type === candidate.type &&
      hotspot.yaw === candidate.yaw &&
      hotspot.pitch === candidate.pitch &&
      hotspot.label === candidate.label &&
      hotspot.content === candidate.content &&
      hotspot.mediaUrl === candidate.mediaUrl
    );
  });
}

export function PanoramaViewport({
  engine,
  fallback = <p role="alert">Không thể tải không gian toàn cảnh.</p>,
  hotspots = [],
  initialView,
  node,
  onHotspotSelect,
  onNodeChange,
  onStatusChange,
  onViewChange,
  tourNodes,
}: PanoramaViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialViewRef = useRef(initialView);
  const nodeRef = useRef(node);
  const onHotspotSelectRef = useRef(onHotspotSelect);
  const onStatusChangeRef = useRef(onStatusChange);
  const onNodeChangeRef = useRef(onNodeChange);
  const onViewChangeRef = useRef(onViewChange);
  const tourNodesRef = useRef(tourNodes);
  const mountPromiseRef = useRef<Promise<void> | null>(null);
  const lastNodeReportedByEngineRef = useRef<string | null>(null);
  const installedHotspotsRef = useRef<HotspotVm[] | null>(null);
  const [status, setStatus] = useState<RendererStatus>('loading');
  const [mountCount, setMountCount] = useState(0);
  const [destroyCount, setDestroyCount] = useState(0);

  onHotspotSelectRef.current = onHotspotSelect;
  onStatusChangeRef.current = onStatusChange;
  onNodeChangeRef.current = onNodeChange;
  initialViewRef.current = initialView;
  nodeRef.current = node;
  onViewChangeRef.current = onViewChange;
  tourNodesRef.current = tourNodes;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let cancelled = false;
    const mountNodeId = nodeRef.current.id;
    lastNodeReportedByEngineRef.current = null;
    installedHotspotsRef.current = null;
    const unsubscribeViewChanged = engine.subscribeViewChanged((view) => {
      if (!cancelled) {
        onViewChangeRef.current?.(view);
      }
    });
    const unsubscribeNodeChanged = engine.subscribeNodeChanged?.((nodeId, view) => {
      if (!cancelled) {
        lastNodeReportedByEngineRef.current = nodeId;
        const reportedNode = tourNodesRef.current?.find((tourNode) => tourNode.id === nodeId);
        const reportedView =
          view ??
          reportedNode?.initialView ??
          (nodeRef.current.id === nodeId ? nodeRef.current.initialView : undefined);
        if (reportedView) {
          onNodeChangeRef.current?.(nodeId, reportedView);
        }
      }
    });
    const unsubscribeHotspotSelected = engine.subscribeHotspotSelected?.((hotspotId) => {
      if (!cancelled) {
        onHotspotSelectRef.current?.(hotspotId);
      }
    });
    const reportStatus = (nextStatus: RendererStatus, nodeId = mountNodeId) => {
      if (cancelled) {
        return;
      }

      setStatus(nextStatus);
      onStatusChangeRef.current?.(nextStatus, nodeId);
    };

    engine.setTour?.(tourNodesRef.current ?? [nodeRef.current]);
    setMountCount((count) => count + 1);
    const mountPromise = engine.mount(container);
    mountPromiseRef.current = mountPromise;
    void mountPromise.catch(() => {
      reportStatus('error');
    });

    return () => {
      cancelled = true;
      unsubscribeViewChanged();
      unsubscribeNodeChanged?.();
      unsubscribeHotspotSelected?.();
      setDestroyCount((count) => count + 1);
      engine.destroy();
      mountPromiseRef.current = null;
      installedHotspotsRef.current = null;
    };
  }, [engine]);

  useEffect(() => {
    if (!engine.setHotspots || areHotspotsEqual(installedHotspotsRef.current, hotspots)) {
      return;
    }

    engine.setHotspots(hotspots);
    installedHotspotsRef.current = hotspots.map((hotspot) => ({ ...hotspot }));
  }, [engine, hotspots]);

  useEffect(() => {
    let cancelled = false;
    const reportStatus = (nextStatus: RendererStatus, nodeId = node.id) => {
      if (cancelled) {
        return;
      }

      setStatus(nextStatus);
      onStatusChangeRef.current?.(nextStatus, nodeId);
    };

    reportStatus('loading');

    if (lastNodeReportedByEngineRef.current === node.id) {
      reportStatus('ready');
      return undefined;
    }

    void (async () => {
      try {
        await mountPromiseRef.current;
        if (cancelled) {
          return;
        }

        await engine.loadNode(node);
        if (cancelled) {
          return;
        }

        if (initialViewRef.current) {
          engine.setView(initialViewRef.current);
        }

        reportStatus('ready');
      } catch {
        reportStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [engine, node]);

  return (
    <div
      aria-busy={status === 'loading'}
      aria-label="Không gian toàn cảnh 360 độ"
      data-renderer-status={status}
      data-e2e-panorama-mount-count={mountCount}
      data-e2e-panorama-destroy-count={destroyCount}
      role="application"
      style={{ height: '100%', width: '100%' }}
    >
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {status === 'error' ? fallback : null}
    </div>
  );
}

export default PanoramaViewport;
