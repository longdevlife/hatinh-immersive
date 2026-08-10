import { useEffect, useState, type ReactNode } from 'react';

import type { ImmersiveActions, ImmersiveLocale, ImmersiveViewVm } from '../../../shared/contracts';
import { Map3DChrome, type Map3DChromeLocation } from '../../map3d';
import { MinimapViewport, type MinimapEnginePort } from '../../minimap';

import { RendererState } from './RendererState';

export interface ExploreShellProps {
  view: ImmersiveViewVm;
  actions: ImmersiveActions;
  canEnterPanorama?: boolean;
  isSceneTransitioning?: boolean;
  locale?: ImmersiveLocale;
  map3dLocations?: Map3DChromeLocation[];
  minimapEngine?: MinimapEnginePort | null;
  onLanguageToggle?: () => void;
  onLocationSelected?: (locationId: string) => void;
  rendererContent?: ReactNode;
  selectedLocationId?: string | null;
}

function MinimapLoadingBoundary({ collapsed, onToggle }: { collapsed: boolean; onToggle(): void }) {
  return (
    <section
      aria-label="Bản đồ tuyến tham quan"
      className={`minimap-viewport ${collapsed ? 'minimap-viewport--collapsed' : ''}`}
      data-minimap-status="loading"
      role="application"
    >
      <header className="minimap-viewport__header">
        <div>
          <p className="immersive-kicker">Bản đồ hành trình</p>
          {!collapsed ? <strong>Đang tải bản đồ…</strong> : null}
        </div>
        <button
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Mở rộng bản đồ' : 'Thu gọn bản đồ'}
          className="immersive-icon-button"
          type="button"
          onClick={onToggle}
        >
          {collapsed ? '+' : '−'}
        </button>
      </header>
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
  minimapEngine = null,
  rendererContent,
  onLanguageToggle,
  onLocationSelected,
  selectedLocationId = null,
}: ExploreShellProps) {
  const isPanorama = view.mode === 'panorama';
  const hasMap3DChrome = !isPanorama && map3dLocations !== undefined;
  const [isInfoOpen, setIsInfoOpen] = useState(view.mode === 'overview3d' && !hasMap3DChrome);
  const [isMinimapCollapsed, setIsMinimapCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const currentSceneName = view.currentScene?.name ?? 'Toàn cảnh điểm đến';

  useEffect(() => {
    setIsInfoOpen(view.mode === 'overview3d' && !hasMap3DChrome);
  }, [hasMap3DChrome, view.mode]);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  function openInfo() {
    setIsInfoOpen(true);
    actions.onOpenDestinationInfo();
  }

  function closeInfo() {
    setIsInfoOpen(false);
    actions.onCloseDestinationInfo();
  }

  function toggleMinimap() {
    setIsMinimapCollapsed((collapsed) => !collapsed);
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
              subtitle={view.destination.categoryLabel ?? 'Hà Tĩnh'}
              title={view.destination.name}
              onShare={() => void shareLocation()}
              onShowInfo={openInfo}
              onToggleFullscreen={() => void toggleFullscreen()}
              {...(canEnterPanorama ? { onEnter360: () => actions.onEnterPanorama() } : {})}
              {...(onLanguageToggle ? { onLanguageToggle } : {})}
              {...(onLocationSelected ? { onLocationSelected } : {})}
            >
              {rendererContent}
            </Map3DChrome>
          ) : (
            rendererContent
          )}
        </div>
        {isPanorama ? (
          <div className="hotspot-layer" aria-label="Điểm khám phá trong cảnh">
            {view.hotspots.map((hotspot, index) => (
              <button
                key={hotspot.id}
                className={`hotspot-marker hotspot-marker--${hotspot.type}`}
                style={{
                  left: `${12 + ((hotspot.yaw % 360) / 360) * 76}%`,
                  top: `${42 + hotspot.pitch * 2 + (index % 2) * 7}%`,
                }}
                type="button"
                onClick={() => {
                  actions.onSelectHotspot(hotspot.id);
                }}
                aria-haspopup="dialog"
                aria-label={hotspot.label ?? 'Mở điểm khám phá'}
              >
                <span aria-hidden="true">+</span>
                <span className="hotspot-marker__label">{hotspot.label}</span>
              </button>
            ))}
          </div>
        ) : hasMap3DChrome ? null : (
          <div className="overview-marker" aria-label={`Điểm đến ${view.destination.name}`}>
            <span className="overview-marker__pin" aria-hidden="true">
              ⌖
            </span>
            <strong>{view.destination.name}</strong>
          </div>
        )}
        <RendererState
          mode={view.mode}
          status={view.rendererStatus}
          onRetry={actions.onRetryRenderer}
          onFallback={isPanorama ? actions.onEnter3D : () => actions.onEnterPanorama()}
          isTransitioning={isPanorama && isSceneTransitioning}
          showFallback={isPanorama || canEnterPanorama}
        />
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
              className="immersive-button immersive-button--quiet"
              type="button"
              onClick={openInfo}
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

      {isPanorama ? (
        <div className="explore-shell__minimap">
          {minimapEngine ? (
            <MinimapViewport
              currentSceneId={view.currentScene?.id ?? null}
              heading={view.heading}
              nodes={view.nodes}
              links={view.links}
              collapsed={isMinimapCollapsed}
              engine={minimapEngine}
              onToggle={toggleMinimap}
              onNodeSelect={actions.onNavigateScene}
            />
          ) : (
            <MinimapLoadingBoundary collapsed={isMinimapCollapsed} onToggle={toggleMinimap} />
          )}
        </div>
      ) : null}

      {isPanorama ? (
        <div className="explore-shell__controls" role="region" aria-label="Điều khiển trải nghiệm">
          <button
            className="immersive-button immersive-button--quiet"
            type="button"
            onClick={actions.onEnter3D}
          >
            Quay lại không gian 3D
          </button>
          {view.links.slice(0, 2).map((link) => (
            <button
              key={link.id}
              className="navigation-hint"
              type="button"
              onClick={() => actions.onNavigateScene(link.targetSceneId)}
            >
              <span aria-hidden="true">↑</span>
              {link.label ?? 'Di chuyển'}
            </button>
          ))}
        </div>
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
        id="destination-info-panel"
        className={`info-panel ${isInfoOpen ? 'info-panel--open' : ''}`}
        aria-hidden={!isInfoOpen}
        aria-labelledby="destination-info-title"
        inert={!isInfoOpen}
        role="dialog"
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
