import type { SceneLinkVm, SceneNodeVm } from '../../../shared/contracts';

export interface MinimapState {
  currentSceneId: string | null;
  heading: number;
  links: SceneLinkVm[];
  nodes: SceneNodeVm[];
}

export interface MinimapEnginePort {
  mount(container: HTMLElement): Promise<void>;
  setState(state: MinimapState): void;
  subscribeNodeSelected(listener: (sceneId: string) => void): () => void;
  destroy(): void;
}
