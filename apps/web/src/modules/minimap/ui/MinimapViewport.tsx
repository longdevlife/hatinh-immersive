import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { MinimapProps, RendererStatus } from '../../../shared/contracts';

import type { MinimapEnginePort, MinimapState } from '../domain/minimap-engine.port';

export interface MinimapViewportProps extends MinimapProps {
  engine: MinimapEnginePort;
  fallback?: ReactNode;
  onStatusChange?: (status: RendererStatus) => void;
  showToggle?: boolean;
  variant?: 'minimap' | 'overview';
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
  showToggle = true,
  variant = 'minimap',
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
    <section
      aria-label={variant === 'overview' ? 'Bản đồ Hà Tĩnh' : 'Bản đồ tuyến tham quan'}
      className={`minimap-viewport minimap-viewport--${variant} ${collapsed ? 'minimap-viewport--collapsed' : ''}`}
      data-minimap-status={status}
      role="application"
    >
      {!collapsed && (
        <header className="minimap-viewport__header">
          <strong>
            {nodes.filter((node) => node.isVisited).length}/{nodes.length} điểm đã khám phá
          </strong>
          {showToggle && (
            <button
              aria-expanded={true}
              aria-label="Thu gọn bản đồ"
              className="minimap-viewport__toggle"
              type="button"
              onClick={onToggle}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          )}
        </header>
      )}

      {collapsed && showToggle && (
        <button
          aria-expanded={false}
          aria-label="Mở rộng bản đồ"
          className="minimap-viewport__toggle minimap-viewport__toggle--standalone"
          type="button"
          onClick={onToggle}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
        </button>
      )}
      <div
        ref={containerRef}
        aria-hidden={collapsed}
        className="minimap-viewport__map"
        role="group"
        aria-label="Các điểm của tuyến tham quan"
        style={{ display: collapsed ? 'none' : 'block' }}
      />
      {status === 'error' ? fallback : null}
    </section>
  );
}

export default MinimapViewport;
