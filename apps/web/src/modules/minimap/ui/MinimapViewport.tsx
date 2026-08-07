import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { MinimapProps, RendererStatus } from '../../../shared/contracts';

import type { MinimapEnginePort, MinimapState } from '../domain/minimap-engine.port';

export interface MinimapViewportProps extends MinimapProps {
  engine: MinimapEnginePort;
  fallback?: ReactNode;
  onStatusChange?: (status: RendererStatus) => void;
}

export function MinimapViewport({
  collapsed,
  currentSceneId,
  engine,
  fallback = <p role="alert">Không thể tải bản đồ tuyến tham quan.</p>,
  heading,
  links,
  nodes,
  onNodeSelect,
  onStatusChange,
  onToggle,
}: MinimapViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onNodeSelectRef = useRef(onNodeSelect);
  const onStatusChangeRef = useRef(onStatusChange);
  const [status, setStatus] = useState<RendererStatus>('loading');

  onNodeSelectRef.current = onNodeSelect;
  onStatusChangeRef.current = onStatusChange;

  const state: MinimapState = { currentSceneId, heading, links, nodes };

  useEffect(() => {
    engine.setState(state);
  }, [currentSceneId, engine, heading, links, nodes]);

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
    const unsubscribe = engine.subscribeNodeSelected((sceneId) => {
      if (!cancelled) {
        onNodeSelectRef.current(sceneId);
      }
    });

    reportStatus('loading');
    void engine
      .mount(container)
      .then(() => reportStatus('ready'))
      .catch(() => reportStatus('error'));

    return () => {
      cancelled = true;
      unsubscribe();
      engine.destroy();
    };
  }, [engine]);

  return (
    <section aria-label="Bản đồ tuyến tham quan" data-renderer-status={status} role="application">
      <button
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Mở rộng bản đồ' : 'Thu gọn bản đồ'}
        type="button"
        onClick={onToggle}
      >
        {collapsed ? '+' : '−'}
      </button>
      <div
        ref={containerRef}
        aria-hidden={collapsed}
        style={{ display: collapsed ? 'none' : 'block', height: '100%', width: '100%' }}
      />
      {status === 'error' ? fallback : null}
    </section>
  );
}

export default MinimapViewport;
