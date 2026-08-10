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
    if (collapsed) {
      return undefined;
    }

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
  }, [collapsed, engine]);

  return (
    <section
      aria-label={variant === 'overview' ? 'Bản đồ Hà Tĩnh' : 'Bản đồ tuyến tham quan'}
      className={`minimap-viewport minimap-viewport--${variant} ${collapsed ? 'minimap-viewport--collapsed' : ''}`}
      data-minimap-status={status}
      role="application"
    >
      {collapsed ? (
        showToggle ? (
          <button
            aria-expanded={false}
            aria-label="Mở rộng bản đồ"
            className="minimap-viewport__toggle--standalone immersive-icon-button"
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
              style={{ width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' }}
            >
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
          </button>
        ) : null
      ) : (
        <>
          <header className="minimap-viewport__header">
            <div>
              <p className="immersive-kicker">Bản đồ hành trình</p>
              <strong>
                {nodes.filter((node) => node.isVisited).length}/{nodes.length} điểm đã đi
              </strong>
            </div>
            {showToggle ? (
              <button
                aria-expanded={true}
                aria-label="Thu gọn bản đồ"
                className="immersive-icon-button"
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
                  style={{ width: '1rem', height: '1rem' }}
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            ) : null}
          </header>
          <div
            ref={containerRef}
            aria-hidden={false}
            className="minimap-viewport__map"
            role="group"
            aria-label="Các điểm của tuyến tham quan"
          />
        </>
      )}
      {status === 'error' ? fallback : null}
    </section>
  );
}

export default MinimapViewport;
