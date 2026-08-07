import { useState } from 'react';

import type {
  EditorHotspot,
  EditorHotspotDraft,
  EditorScene,
  PanoramaClickPosition,
} from '../model/scene-editor.types';
import { HotspotInspector } from '../../hotspot-editor/ui/HotspotInspector';
import { PanoramaEditorCanvas } from './PanoramaEditorCanvas';
import { SceneInspector } from './SceneInspector';

export type SceneEditorLayoutProps = {
  hotspots: EditorHotspot[];
  onSaveHotspot: (hotspot: EditorHotspotDraft) => void;
  onSaveScene?: (
    scene: Pick<EditorScene, 'name' | 'initialFov' | 'initialHeading' | 'initialPitch'>,
  ) => void;
  scene: EditorScene;
};

export function SceneEditorLayout({
  hotspots,
  onSaveHotspot,
  onSaveScene,
  scene,
}: SceneEditorLayoutProps) {
  const [selectedHotspot, setSelectedHotspot] = useState<EditorHotspot>();
  const [selectedPosition, setSelectedPosition] = useState<PanoramaClickPosition>();

  const handlePositionSelect = (position: PanoramaClickPosition) => {
    setSelectedHotspot(undefined);
    setSelectedPosition(position);
  };

  const handleHotspotSelect = (hotspot: EditorHotspot) => {
    setSelectedHotspot(hotspot);
    setSelectedPosition({ pitch: hotspot.pitch, yaw: hotspot.yaw });
  };

  const handleSaveHotspot = (hotspot: EditorHotspotDraft) => {
    onSaveHotspot(hotspot);
    setSelectedHotspot(undefined);
    setSelectedPosition(undefined);
  };

  return (
    <div className="scene-editor-layout">
      <div className="scene-editor-layout__canvas">
        <PanoramaEditorCanvas
          hotspots={hotspots}
          onHotspotSelect={handleHotspotSelect}
          onPositionSelect={handlePositionSelect}
          scene={scene}
        />
      </div>
      <aside className="scene-editor-layout__sidebar">
        <SceneInspector {...(onSaveScene ? { onSave: onSaveScene } : {})} scene={scene} />
        {selectedPosition ? (
          <HotspotInspector
            key={selectedHotspot?.id ?? `${selectedPosition.yaw}-${selectedPosition.pitch}`}
            {...(selectedHotspot ? { hotspot: selectedHotspot } : {})}
            onCancel={() => {
              setSelectedHotspot(undefined);
              setSelectedPosition(undefined);
            }}
            onSave={handleSaveHotspot}
            position={selectedPosition}
            sceneId={scene.id}
          />
        ) : (
          <section className="editor-empty-state" aria-label="Hotspot editor guidance">
            <p className="editor-inspector__eyebrow">Hotspot editor</p>
            <h2>Select a point</h2>
            <p>Click anywhere in the panorama to add a point annotation.</p>
          </section>
        )}
      </aside>
    </div>
  );
}
