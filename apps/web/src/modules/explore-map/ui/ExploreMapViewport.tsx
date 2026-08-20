import { useEffect, useRef, useState } from 'react';

import type { RendererStatus } from '../../../shared/contracts';

import type { ExploreMapEnginePort } from '../domain/explore-map-engine.port';
import type {
  ExploreMapDestination,
  ExploreMapUserLocation,
  ExploreMapViewportState,
} from '../model/explore-map.types';

export interface ExploreMapViewportProps {
  engine: ExploreMapEnginePort;
  destinations: readonly ExploreMapDestination[];
  enabled?: boolean;
  selectedDestinationId: string | null;
  onDestinationSelected(destinationId: string): void;
  onStatusChange?(status: RendererStatus): void;
  userLocation?: ExploreMapUserLocation | null;
}

const DEFAULT_DESTINATION_ZOOM = 13;

export function ExploreMapViewport({
  destinations,
  enabled = true,
  engine,
  onDestinationSelected,
  onStatusChange,
  selectedDestinationId,
  userLocation,
}: ExploreMapViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onDestinationSelectedRef = useRef(onDestinationSelected);
  const onStatusChangeRef = useRef(onStatusChange);
  const [status, setStatus] = useState<RendererStatus>(enabled ? 'loading' : 'idle');

  onDestinationSelectedRef.current = onDestinationSelected;
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    const state: ExploreMapViewportState = {
      destinations,
      selectedDestinationId,
      userLocation: userLocation ?? null,
    };
    engine.setState(state);
  }, [destinations, engine, selectedDestinationId, userLocation]);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      onStatusChangeRef.current?.('idle');
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
    const unsubscribe = engine.subscribeDestinationSelected((destinationId) => {
      if (!cancelled) {
        onDestinationSelectedRef.current(destinationId);
      }
    });
    const onResize = () => engine.resize();
    let resizeObserver: ResizeObserver | null = null;

    reportStatus('loading');
    window.addEventListener('resize', onResize);
    void engine
      .mount(container)
      .then(() => {
        if (cancelled) {
          return;
        }

        engine.resize();
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(onResize);
          resizeObserver.observe(container);
        }
        reportStatus('ready');
      })
      .catch(() => reportStatus('error'));

    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      unsubscribe();
      engine.destroy();
    };
  }, [enabled, engine]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (selectedDestinationId === null) {
      void engine.fitOverview();
      return;
    }

    const selectedDestination = destinations.find(
      (destination) => destination.id === selectedDestinationId,
    );
    if (!selectedDestination) {
      return;
    }

    void engine.flyTo({
      latitude: selectedDestination.latitude,
      longitude: selectedDestination.longitude,
      zoom: DEFAULT_DESTINATION_ZOOM,
    });
  }, [destinations, enabled, engine, selectedDestinationId]);

  return (
    <section
      aria-label="Bản đồ khám phá Hà Tĩnh"
      className="explore-map-viewport"
      data-explore-map-status={status}
      data-destination-ids={destinations.map((destination) => destination.id).join(',')}
      data-selected-destination-id={selectedDestinationId ?? ''}
      role="region"
    >
      <div
        ref={containerRef}
        aria-label="Các điểm đến Hà Tĩnh"
        className="explore-map-viewport__map"
        role="group"
      />
      {status === 'loading' ? <p role="status">Đang mở bản đồ khám phá…</p> : null}
      {status === 'error' ? (
        <p role="alert">
          Không thể tải bản đồ khám phá. Bạn vẫn có thể chọn điểm đến từ danh sách.
        </p>
      ) : null}
    </section>
  );
}
