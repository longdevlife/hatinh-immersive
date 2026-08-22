import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { ImmersiveActions, ImmersiveLocale, ImmersiveViewVm } from '../../../shared/contracts';
import {
  Map3DChrome,
  type Map3DChromeLocation,
  type Selected3DViewpointRailProps,
} from '../../map3d';
import { MinimapViewport, type MinimapEnginePort } from '../../minimap';

import { RendererState } from './RendererState';

const MINIMAP_SESSION_STATE_KEY = 'hatinh:immersive:minimap:collapsed';

function readMinimapCollapsedPreference(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const preference = window.sessionStorage.getItem(MINIMAP_SESSION_STATE_KEY);
    return preference === null || preference === 'collapsed';
  } catch {
    return true;
  }
}

function persistMinimapCollapsedPreference(collapsed: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(MINIMAP_SESSION_STATE_KEY, collapsed ? 'collapsed' : 'expanded');
  } catch {
    // Storage can be unavailable in privacy-restricted contexts; in-memory state still works.
  }
}

export interface ExploreShellProps {
  view: ImmersiveViewVm;
  actions: ImmersiveActions;
  canEnterPanorama?: boolean;
  isSceneTransitioning?: boolean;
  locale?: ImmersiveLocale;
  map3dLocations?: Map3DChromeLocation[];
  showLocationBrowser?: boolean;
  minimapEngine?: MinimapEnginePort | null;
  minimapOpen?: boolean;
  onLanguageToggle?: () => void;
  onLocationSelected?: (locationId: string) => void;
  rendererContent?: ReactNode;
  selectedLocationId?: string | null;
  selected3DViewpointRail?: Selected3DViewpointRailProps;
  hasPanoramaTourControls?: boolean;
}

function MapLauncherIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 'var(--icon-size-base)', height: 'var(--icon-size-base)' }}
      aria-hidden="true"
    >
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
      <line x1="9" y1="3" x2="9" y2="21"></line>
      <line x1="15" y1="3" x2="15" y2="21"></line>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: '1rem', height: '1rem' }}
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

function MinimapLoadingBoundary({
  collapsed,
  onToggle,
  showToggle = true,
}: {
  collapsed: boolean;
  onToggle(): void;
  showToggle?: boolean;
}) {
  return (
    <section
      aria-label="Bản đồ tuyến tham quan"
      className={`minimap-viewport ${collapsed ? 'minimap-viewport--collapsed' : ''}`}
      data-minimap-status="loading"
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
            <MapLauncherIcon />
          </button>
        ) : null
      ) : (
        <header className="minimap-viewport__header">
          <div>
            <p className="immersive-kicker">Bản đồ hành trình</p>
            <strong>Đang tải bản đồ…</strong>
          </div>
          {showToggle ? (
            <button
              aria-expanded={true}
              aria-label="Thu gọn bản đồ"
              className="immersive-icon-button"
              type="button"
              onClick={onToggle}
            >
              <CloseIcon />
            </button>
          ) : null}
        </header>
      )}
    </section>
  );
}

export function ExploreShell({
  view,
  actions,
  canEnterPanorama = true,
  isSceneTransitioning = false,
  locale = 'vi',
  map3dLocations,
  showLocationBrowser = true,
  minimapEngine = null,
  minimapOpen,
  rendererContent,
  onLanguageToggle,
  onLocationSelected,
  selectedLocationId = null,
  selected3DViewpointRail,
  hasPanoramaTourControls = false,
}: ExploreShellProps) {
  const isPanorama = view.mode === 'panorama';
  const hasMap3DChrome = !isPanorama && map3dLocations !== undefined;
  const isUnavailablePanoramaTour =
    isPanorama && hasPanoramaTourControls && view.rendererStatus === 'unavailable';
  const hasScopedSelected3D = selected3DViewpointRail !== undefined;
  const [isInfoOpen, setIsInfoOpen] = useState(view.mode === 'overview3d' && !hasMap3DChrome);
  const [isMinimapCollapsed, setIsMinimapCollapsed] = useState(() =>
    minimapOpen === undefined ? readMinimapCollapsedPreference() : !minimapOpen,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const infoPanelRef = useRef<HTMLElement>(null);
  const topInfoTriggerRef = useRef<HTMLButtonElement>(null);
  const infoTriggerRef = useRef<HTMLElement | null>(null);
  const currentSceneName = view.currentScene?.name ?? 'Toàn cảnh điểm đến';

  useEffect(() => {
    setIsInfoOpen(view.mode === 'overview3d' && !hasMap3DChrome);
  }, [hasMap3DChrome, view.mode]);

  useEffect(() => {
    if (minimapOpen !== undefined) {
      setIsMinimapCollapsed(!minimapOpen);
    }
  }, [minimapOpen]);

  useEffect(() => {
    if (!isInfoOpen) {
      return undefined;
    }

    infoPanelRef.current?.focus({ preventScroll: true });

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      setIsInfoOpen(false);
      actions.onCloseDestinationInfo();
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      infoTriggerRef.current?.focus({ preventScroll: true });
      infoTriggerRef.current = null;
    };
  }, [actions, isInfoOpen]);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  function openInfo(trigger?: HTMLElement) {
    infoTriggerRef.current =
      trigger ??
      topInfoTriggerRef.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setIsInfoOpen(true);
    actions.onOpenDestinationInfo();
  }

  function closeInfo() {
    setIsInfoOpen(false);
    actions.onCloseDestinationInfo();
  }

  function toggleMinimap() {
    setIsMinimapCollapsed((collapsed) => {
      const nextCollapsed = !collapsed;
      persistMinimapCollapsedPreference(nextCollapsed);
      return nextCollapsed;
    });
    actions.onToggleMinimap();
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      setIsFullscreen(false);
    }
  }

  async function shareLocation() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: view.destination.name,
          text: view.destination.summary,
          url: window.location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // Sharing is optional; the immersive journey remains usable.
    }
  }

  return (
    <main
      className={`explore-shell explore-shell--${view.mode}`}
      aria-label={`Khám phá ${view.destination.name}`}
    >
      <section
        className="explore-shell__viewport"
        aria-label={
          isPanorama
            ? `Không gian 360 độ tại ${currentSceneName}`
            : `Không gian 3D tại ${view.destination.name}`
        }
      >
        <div className="explore-shell__atmosphere" aria-hidden="true" />
        <p className="sr-only">
          Không gian trải nghiệm đang được kết nối. Các điều khiển bên dưới vẫn có thể sử dụng bằng
          bàn phím.
        </p>
        {isPanorama || hasMap3DChrome ? (
          <h1 className="sr-only">{isPanorama ? currentSceneName : view.destination.name}</h1>
        ) : null}
        {isPanorama ? (
          <div className="explore-shell__horizon" aria-hidden="true" />
        ) : (
          <div className="explore-shell__terrain" aria-hidden="true" />
        )}
        <div className="explore-shell__renderer-slot" data-testid="immersive-renderer-slot">
          {hasMap3DChrome ? (
            <Map3DChrome
              isFullscreen={isFullscreen}
              isInfoOpen={isInfoOpen}
              language={locale}
              locations={map3dLocations ?? []}
              networkQuality={view.networkQuality}
              selectedLocationId={selectedLocationId}
              {...(selected3DViewpointRail ? { viewpointRail: selected3DViewpointRail } : {})}
              showLocationBrowser={showLocationBrowser}
              destinationLabel={view.destination.name}
              onShare={() => void shareLocation()}
              onShowInfo={openInfo}
              onReturnToDestination={actions.onReturnToDestination}
              onToggleFullscreen={() => void toggleFullscreen()}
              {...(canEnterPanorama && !selected3DViewpointRail
                ? { onEnter360: () => actions.onEnterPanorama() }
                : {})}
              {...(onLanguageToggle ? { onLanguageToggle } : {})}
              {...(onLocationSelected ? { onLocationSelected } : {})}
            >
              {rendererContent}
            </Map3DChrome>
          ) : (
            rendererContent
          )}
        </div>
        {!isPanorama && !hasMap3DChrome ? (
          <div className="overview-marker" aria-label={`Điểm đến ${view.destination.name}`}>
            <span className="overview-marker__pin" aria-hidden="true">
              ⌖
            </span>
            <strong>{view.destination.name}</strong>
          </div>
        ) : null}
        {!isUnavailablePanoramaTour ? (
          <RendererState
            mode={view.mode}
            status={view.rendererStatus}
            onRetry={actions.onRetryRenderer}
            onFallback={
              isPanorama || !canEnterPanorama
                ? actions.onReturnToDestination
                : () => actions.onEnterPanorama()
            }
            fallbackLabel={isPanorama ? `Quay lại ${view.destination.name}` : 'Mở trải nghiệm 360°'}
            returnLabel={`Quay lại ${view.destination.name}`}
            isTransitioning={isPanorama && isSceneTransitioning}
            showFallback={isPanorama || (!hasScopedSelected3D && canEnterPanorama)}
            {...(isPanorama ? {} : { onReturnToDestination: actions.onReturnToDestination })}
          />
        ) : null}
      </section>

      {!hasMap3DChrome && !isPanorama ? (
        <header className="immersive-topbar">
          <a className="immersive-topbar__brand" href="/" aria-label="Trang chủ Hà Tĩnh Immersive">
            Hà Tĩnh <span>/</span> Immersive
          </a>
          <div className="immersive-topbar__actions">
            {view.networkQuality !== 'good' ? (
              <span className={`network-quality network-quality--${view.networkQuality}`}>
                {view.networkQuality === 'offline' ? 'Ngoại tuyến' : 'Kết nối yếu'}
              </span>
            ) : null}
            <button
              ref={topInfoTriggerRef}
              className="immersive-button immersive-button--quiet"
              type="button"
              onClick={() => openInfo()}
              aria-controls="destination-info-panel"
              aria-expanded={isInfoOpen}
              aria-label="Thông tin"
            >
              <span aria-hidden="true">i</span>
              <span className="sr-only">Thông tin</span>
            </button>
          </div>
        </header>
      ) : null}

      {!hasMap3DChrome && !isPanorama ? (
        <section className="scene-identity" aria-live="polite">
          <p className="immersive-kicker">{view.destination.categoryLabel}</p>
          <h1>{view.destination.name}</h1>
        </section>
      ) : null}

      {isPanorama && !isUnavailablePanoramaTour ? (
        <div className="explore-shell__minimap">
          {minimapEngine ? (
            <MinimapViewport
              currentSceneId={view.currentScene?.id ?? null}
              heading={view.heading}
              nodes={view.nodes}
              links={view.links}
              collapsed={isMinimapCollapsed}
              engine={minimapEngine}
              showToggle={!hasPanoramaTourControls}
              onToggle={toggleMinimap}
              onNodeSelect={actions.onNavigateScene}
            />
          ) : (
            <MinimapLoadingBoundary
              collapsed={isMinimapCollapsed}
              onToggle={toggleMinimap}
              showToggle={!hasPanoramaTourControls}
            />
          )}
        </div>
      ) : null}

      {isPanorama ? (
        hasPanoramaTourControls ? null : (
          <div
            className="explore-shell__controls"
            role="region"
            aria-label="Điều khiển trải nghiệm"
          >
            <button
              className="immersive-button--back"
              type="button"
              onClick={actions.onReturnToDestination}
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
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Quay lại {view.destination.name}
            </button>
          </div>
        )
      ) : hasMap3DChrome ? null : (
        <div className="explore-shell__controls" role="region" aria-label="Điều khiển trải nghiệm">
          {canEnterPanorama ? (
            <button
              className="immersive-button immersive-button--primary"
              type="button"
              onClick={() => actions.onEnterPanorama()}
            >
              Khám phá 360°
            </button>
          ) : (
            <p className="immersive-readiness-note">360° đang được chuẩn bị</p>
          )}
        </div>
      )}

      <aside
        ref={infoPanelRef}
        id="destination-info-panel"
        className={`info-panel ${isInfoOpen ? 'info-panel--open' : ''}`}
        aria-hidden={!isInfoOpen}
        aria-labelledby="destination-info-title"
        inert={!isInfoOpen}
        role="dialog"
        tabIndex={-1}
      >
        <div className="info-panel__handle" aria-hidden="true" />
        <div className="info-panel__header">
          <p className="immersive-kicker">{view.destination.categoryLabel}</p>
          <button
            className="immersive-icon-button"
            type="button"
            onClick={closeInfo}
            aria-label="Đóng thông tin"
          >
            ×
          </button>
        </div>
        <h2 id="destination-info-title">{view.destination.name}</h2>
        <p>{view.destination.summary}</p>
        {!isPanorama && !hasMap3DChrome && canEnterPanorama ? (
          <button
            className="immersive-button immersive-button--primary"
            type="button"
            onClick={() => actions.onEnterPanorama()}
          >
            Khám phá 360°
          </button>
        ) : null}
        {!isPanorama && !hasMap3DChrome && !canEnterPanorama ? (
          <p className="immersive-readiness-note">360° đang được chuẩn bị</p>
        ) : null}
      </aside>
    </main>
  );
}
