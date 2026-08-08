import { useState, type ReactNode } from 'react';

import type { ImmersiveActions, ImmersiveViewVm } from '../../../shared/contracts';

import { AudioGuideControl, type AudioGuideStatus } from './AudioGuideControl';
import { MinimapFrame } from './MinimapFrame';
import { RendererState } from './RendererState';

export interface ExploreShellProps {
  view: ImmersiveViewVm;
  actions: ImmersiveActions;
  rendererContent?: ReactNode;
}

export function ExploreShell({ view, actions, rendererContent }: ExploreShellProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(view.mode === 'overview3d');
  const [isMinimapCollapsed, setIsMinimapCollapsed] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioGuideStatus>('idle');
  const [audioTime, setAudioTime] = useState(0);
  const isPanorama = view.mode === 'panorama';
  const currentSceneName = view.currentScene?.name ?? 'Toàn cảnh điểm đến';

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
          {rendererContent}
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
                  openInfo();
                }}
                aria-haspopup="dialog"
                aria-label={hotspot.label ?? 'Mở điểm khám phá'}
              >
                <span aria-hidden="true">+</span>
                <span className="hotspot-marker__label">{hotspot.label}</span>
              </button>
            ))}
          </div>
        ) : (
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
        />
      </section>

      <header className="immersive-topbar">
        <a className="immersive-topbar__brand" href="/" aria-label="Trang chủ Hà Tĩnh Immersive">
          Hà Tĩnh <span>/</span> Immersive
        </a>
        <div className="immersive-topbar__actions">
          <span className="mode-badge">{isPanorama ? '360° walk' : '3D overview'}</span>
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
          >
            Thông tin
          </button>
        </div>
      </header>

      <section className="scene-identity" aria-live="polite">
        <p className="immersive-kicker">
          {isPanorama ? 'Điểm đang khám phá' : view.destination.categoryLabel}
        </p>
        <h1>{isPanorama ? currentSceneName : view.destination.name}</h1>
        {isPanorama ? <p>{view.destination.name}</p> : null}
      </section>

      {isPanorama ? (
        <div className="explore-shell__minimap">
          <MinimapFrame
            currentSceneId={view.currentScene?.id ?? null}
            heading={view.heading}
            nodes={view.nodes}
            links={view.links}
            collapsed={isMinimapCollapsed}
            onToggle={toggleMinimap}
            onNodeSelect={actions.onNavigateScene}
          />
        </div>
      ) : null}

      {isPanorama ? (
        <div className="explore-shell__controls" role="region" aria-label="Điều khiển trải nghiệm">
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
          <AudioGuideControl
            status={audioStatus}
            currentTime={audioTime}
            duration={180}
            onPlay={() => setAudioStatus('playing')}
            onPause={() => setAudioStatus('paused')}
            onSeek={setAudioTime}
          />
        </div>
      ) : (
        <div className="explore-shell__controls" role="region" aria-label="Điều khiển trải nghiệm">
          <button
            className="immersive-button immersive-button--primary"
            type="button"
            onClick={() => actions.onEnterPanorama()}
          >
            Khám phá 360°
          </button>
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
        {!isPanorama ? (
          <button
            className="immersive-button immersive-button--primary"
            type="button"
            onClick={() => actions.onEnterPanorama()}
          >
            Khám phá 360°
          </button>
        ) : null}
      </aside>
    </main>
  );
}
