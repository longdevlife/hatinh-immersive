import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { RendererStatus } from '../../../shared/contracts';

import type { CameraTarget, Map3DEnginePort, ModelPlacement } from '../domain/map3d-engine.port';

export interface Map3DViewportProps {
  engine: Map3DEnginePort;
  fallback?: ReactNode;
  onStatusChange?: (status: RendererStatus) => void;
  model?: ModelPlacement;
  target?: CameraTarget;
}

export function Map3DViewport({
  engine,
  fallback = <p role="alert">Không thể mở không gian 3D.</p>,
  model,
  onStatusChange,
  target,
}: Map3DViewportProps) {
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

        if (target) {
          await engine.flyTo(target);
        }
        if (model) {
          await engine.addModel(model);
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
  }, [engine, model, target]);

  return (
    <div
      aria-busy={status === 'loading'}
      aria-label="Không gian bản đồ 3D"
      data-renderer-status={status}
      role="application"
      style={{ height: '100%', width: '100%' }}
    >
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {status === 'error' ? fallback : null}
    </div>
  );
}

export default Map3DViewport;
