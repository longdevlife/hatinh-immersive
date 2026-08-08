import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { RendererStatus } from '../../../shared/contracts';

import type {
  PanoramaEnginePort,
  PanoramaNode,
  PanoramaView,
} from '../domain/panorama-engine.port';

export interface PanoramaViewportProps {
  engine: PanoramaEnginePort;
  fallback?: ReactNode;
  initialView?: PanoramaView;
  node: PanoramaNode;
  onStatusChange?: (status: RendererStatus) => void;
  onNodeChange?: (nodeId: string) => void;
  onViewChange?: (view: PanoramaView) => void;
  tourNodes?: PanoramaNode[];
}

export function PanoramaViewport({
  engine,
  fallback = <p role="alert">Không thể tải không gian toàn cảnh.</p>,
  initialView,
  node,
  onNodeChange,
  onStatusChange,
  onViewChange,
  tourNodes,
}: PanoramaViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialViewRef = useRef(initialView);
  const nodeRef = useRef(node);
  const onStatusChangeRef = useRef(onStatusChange);
  const onNodeChangeRef = useRef(onNodeChange);
  const onViewChangeRef = useRef(onViewChange);
  const tourNodesRef = useRef(tourNodes);
  const mountPromiseRef = useRef<Promise<void> | null>(null);
  const [status, setStatus] = useState<RendererStatus>('loading');

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
    const unsubscribeViewChanged = engine.subscribeViewChanged((view) => {
      if (!cancelled) {
        onViewChangeRef.current?.(view);
      }
    });
    const unsubscribeNodeChanged = engine.subscribeNodeChanged?.((nodeId) => {
      if (!cancelled) {
        onNodeChangeRef.current?.(nodeId);
      }
    });
    const reportStatus = (nextStatus: RendererStatus) => {
      if (cancelled) {
        return;
      }

      setStatus(nextStatus);
      onStatusChangeRef.current?.(nextStatus);
    };

    engine.setTour?.(tourNodesRef.current ?? [nodeRef.current]);
    const mountPromise = engine.mount(container);
    mountPromiseRef.current = mountPromise;
    void mountPromise.catch(() => {
      reportStatus('error');
    });

    return () => {
      cancelled = true;
      unsubscribeViewChanged();
      unsubscribeNodeChanged?.();
      engine.destroy();
      mountPromiseRef.current = null;
    };
  }, [engine]);

  useEffect(() => {
    let cancelled = false;
    const reportStatus = (nextStatus: RendererStatus) => {
      if (cancelled) {
        return;
      }

      setStatus(nextStatus);
      onStatusChangeRef.current?.(nextStatus);
    };

    reportStatus('loading');

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
      role="application"
      style={{ height: '100%', width: '100%' }}
    >
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {status === 'error' ? fallback : null}
    </div>
  );
}

export default PanoramaViewport;
