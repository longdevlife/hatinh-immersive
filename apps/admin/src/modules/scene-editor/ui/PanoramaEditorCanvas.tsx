import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';

import type {
  EditorHotspot,
  EditorScene,
  PanoramaClickPosition,
} from '../model/scene-editor.types';

type PanoramaEditorCanvasProps = {
  hotspots: EditorHotspot[];
  onHotspotSelect?: (hotspot: EditorHotspot) => void;
  onPositionSelect: (position: PanoramaClickPosition) => void;
  scene: EditorScene;
};

function toPosition(clientX: number, clientY: number, rect: DOMRect): PanoramaClickPosition {
  const relativeX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const relativeY = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));

  return {
    pitch: Number((90 - relativeY * 180).toFixed(2)),
    yaw: Number((relativeX * 360).toFixed(2)) % 360,
  };
}

function markerStyle(hotspot: EditorHotspot): CSSProperties {
  return {
    left: `${(hotspot.yaw / 360) * 100}%`,
    top: `${((90 - hotspot.pitch) / 180) * 100}%`,
  };
}

export function PanoramaEditorCanvas({
  hotspots,
  onHotspotSelect,
  onPositionSelect,
  scene,
}: PanoramaEditorCanvasProps) {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    onPositionSelect(
      toPosition(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()),
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      onPositionSelect(toPosition(rect.left + rect.width / 2, rect.top + rect.height / 2, rect));
    }
  };

  const backgroundImage = scene.previewUrl
    ? `url("${scene.previewUrl}")`
    : 'linear-gradient(135deg, #183029 0%, #3b725d 52%, #d9803c 100%)';

  return (
    <div className="panorama-editor">
      <div
        className="panorama-editor__canvas"
        role="button"
        tabIndex={0}
        aria-label="Panorama editor canvas"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{ backgroundImage }}
      >
        <span className="panorama-editor__hint">Click to place a hotspot</span>
        {hotspots.map((hotspot, index) => (
          <button
            className="panorama-editor__marker"
            key={hotspot.id ?? `${hotspot.yaw}-${hotspot.pitch}-${index}`}
            type="button"
            aria-label={`Hotspot ${index + 1}`}
            style={markerStyle(hotspot)}
            onClick={(event) => {
              event.stopPropagation();
              onHotspotSelect?.(hotspot);
            }}
          >
            <span aria-hidden="true">+</span>
          </button>
        ))}
      </div>
      <div className="panorama-editor__meta" aria-live="polite">
        <span>{scene.name}</span>
        <span>2:1 equirectangular workspace</span>
      </div>
    </div>
  );
}
