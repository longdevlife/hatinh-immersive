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
  onViewChange?: (view: PanoramaView) => void;
}

export function PanoramaViewport({
  engine,
  fallback = <p role="alert">Không thể tải không gian toàn cảnh.</p>,
  initialView,
  node,
  onStatusChange,
  onViewChange,
}: PanoramaViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialViewRef = useRef(initialView);
  const onStatusChangeRef = useRef(onStatusChange);
  const onViewChangeRef = useRef(onViewChange);
  const [status, setStatus] = useState<RendererStatus>('loading');

  onStatusChangeRef.current = onStatusChange;
  initialViewRef.current = initialView;
  onViewChangeRef.current = onViewChange;

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
        await engine.mount(container);
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
      unsubscribeViewChanged();
      engine.destroy();
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
