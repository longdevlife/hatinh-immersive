import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { RendererStatus } from '../../../shared/contracts';

import type { PanoramaEnginePort, PanoramaNode } from '../domain/panorama-engine.port';

export interface PanoramaViewportProps {
  engine: PanoramaEnginePort;
  fallback?: ReactNode;
  node: PanoramaNode;
  onStatusChange?: (status: RendererStatus) => void;
}

export function PanoramaViewport({
  engine,
  fallback = <p role="alert">Không thể tải không gian toàn cảnh.</p>,
  node,
  onStatusChange,
}: PanoramaViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  const [status, setStatus] = useState<RendererStatus>('loading');

  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

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
        await engine.mount(container);
        if (cancelled) {
          return;
        }

        await engine.loadNode(node);
        if (cancelled) {
          return;
        }

        reportStatus('ready');
      } catch {
        reportStatus('error');
      }
    })();

    return () => {
      cancelled = true;
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
