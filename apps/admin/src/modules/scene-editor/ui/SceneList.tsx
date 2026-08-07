import type { EditorScene } from '../model/scene-editor.types';

type SceneListProps = {
  onSelect: (sceneId: string) => void;
  scenes: EditorScene[];
  selectedSceneId?: string;
};

export function SceneList({ onSelect, scenes, selectedSceneId }: SceneListProps) {
  return (
    <section className="scene-list" aria-labelledby="scene-list-title">
      <div className="workspace-card__header">
        <div>
          <p className="editor-inspector__eyebrow">Nodes</p>
          <h2 id="scene-list-title">Scenes</h2>
        </div>
        <span className="scene-list__count">{scenes.length}</span>
      </div>
      {scenes.length === 0 ? (
        <p className="scene-list__empty">Create a scene to start mapping the journey.</p>
      ) : (
        <div className="scene-list__items">
          {scenes.map((scene) => (
            <button
              className={`scene-list__item${selectedSceneId === scene.id ? ' is-active' : ''}`}
              key={scene.id}
              type="button"
              onClick={() => onSelect(scene.id)}
            >
              <span>
                <strong>{scene.name}</strong>
                <small>{scene.panoramaUrl ? 'Panorama attached' : 'Awaiting panorama'}</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
