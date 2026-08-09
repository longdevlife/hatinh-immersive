import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { RendererStatus } from '../../../shared/contracts';

import type {
  CameraTarget,
  Map3DEnginePort,
  Map3DLocation,
  ModelPlacement,
} from '../domain/map3d-engine.port';

export interface Map3DViewportProps {
  engine: Map3DEnginePort;
  fallback?: ReactNode;
  locations?: Map3DLocation[];
  onLocationSelected?: (locationId: string) => void;
  onStatusChange?: (status: RendererStatus) => void;
  model?: ModelPlacement;
  target?: CameraTarget;
}

export function Map3DViewport({
  engine,
  fallback = <p role="alert">Không thể mở không gian 3D.</p>,
  locations,
  onLocationSelected,
  onStatusChange,
  model,
  target,
}: Map3DViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onLocationSelectedRef = useRef(onLocationSelected);
  const onStatusChangeRef = useRef(onStatusChange);
  const mountPromiseRef = useRef<Promise<void> | null>(null);
  const operationQueueRef = useRef<Promise<void> | null>(null);
  const mountedEngineRef = useRef<Map3DEnginePort | null>(null);
  const [status, setStatus] = useState<RendererStatus>('loading');

  onLocationSelectedRef.current = onLocationSelected;
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let cancelled = false;
    let unsubscribeLocationSelected: (() => void) | undefined;
    const reportStatus = (nextStatus: RendererStatus) => {
      if (cancelled) {
        return;
      }

      setStatus(nextStatus);
      onStatusChangeRef.current?.(nextStatus);
    };

    reportStatus('loading');

    const mountPromise = engine.mount(container).then(() => {
      if (cancelled) {
        return;
      }

      mountedEngineRef.current = engine;
      unsubscribeLocationSelected = engine.subscribeLocationSelected((locationId) => {
        if (!cancelled) {
          onLocationSelectedRef.current?.(locationId);
        }
      });
      reportStatus('ready');
    });
    mountPromiseRef.current = mountPromise;
    operationQueueRef.current = mountPromise;

    void mountPromise.catch(() => {
      if (!cancelled) {
        reportStatus('error');
      }
    });

    return () => {
      cancelled = true;
      unsubscribeLocationSelected?.();
      if (mountedEngineRef.current === engine) {
        mountedEngineRef.current = null;
      }
      if (mountPromiseRef.current === mountPromise) {
        mountPromiseRef.current = null;
      }
      if (operationQueueRef.current === mountPromise) {
        operationQueueRef.current = null;
      }
      engine.destroy();
    };
  }, [engine]);

  useEffect(() => {
    if (locations === undefined) {
      return undefined;
    }

    let cancelled = false;
    const mountPromise = mountPromiseRef.current;
    if (!mountPromise) {
      return undefined;
    }

    const previousOperation = operationQueueRef.current ?? mountPromise;
    const operation = previousOperation
      .then(() => {
        if (cancelled || mountedEngineRef.current !== engine) {
          return;
        }

        return engine.setLocations(locations);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
          onStatusChangeRef.current?.('error');
        }
      });
    operationQueueRef.current = operation.catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [engine, locations]);

  useEffect(() => {
    if (!target) {
      return undefined;
    }

    let cancelled = false;
    const mountPromise = mountPromiseRef.current;
    if (!mountPromise) {
      return undefined;
    }

    const previousOperation = operationQueueRef.current ?? mountPromise;
    const operation = previousOperation
      .then(() => {
        if (cancelled || mountedEngineRef.current !== engine) {
          return;
        }

        return engine.flyTo(target);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
          onStatusChangeRef.current?.('error');
        }
      });
    operationQueueRef.current = operation.catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [engine, target]);

  useEffect(() => {
    if (!model) {
      return undefined;
    }

    let cancelled = false;
    const mountPromise = mountPromiseRef.current;
    if (!mountPromise) {
      return undefined;
    }

    const previousOperation = operationQueueRef.current ?? mountPromise;
    const operation = previousOperation
      .then(() => {
        if (cancelled || mountedEngineRef.current !== engine) {
          return;
        }

        return engine.addModel(model);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
          onStatusChangeRef.current?.('error');
        }
      });
    operationQueueRef.current = operation.catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [engine, model]);

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
