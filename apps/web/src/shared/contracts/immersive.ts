export type ImmersiveMode = 'overview3d' | 'panorama';

export type ImmersiveLocale = 'vi' | 'en';

export type RendererStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

export type NetworkQuality = 'good' | 'constrained' | 'offline';

export interface DestinationPreviewVm {
  id: string;
  slug: string;
  name: string;
  summary: string;
  coverImageUrl: string | null;
  categoryLabel: string | null;
  defaultSceneId: string | null;
  geoPoint: { latitude: number; longitude: number } | null;
}

export interface SceneNodeVm {
  id: string;
  name: string;
  lat: number;
  lng: number;
  heading: number;
  isVisited: boolean;
  isCurrent: boolean;
}

export interface SceneLinkVm {
  id: string;
  sourceSceneId?: string;
  targetSceneId: string;
  label: string | null;
  yaw: number;
  pitch: number;
}

export interface HotspotVm {
  id: string;
  sceneId?: string;
  type: 'information' | 'media' | 'audio' | 'external';
  yaw: number;
  pitch: number;
  label: string | null;
  content?: string | null;
  mediaUrl?: string | null;
}

export interface ImmersiveViewVm {
  mode: ImmersiveMode;
  destination: DestinationPreviewVm;
  currentScene: SceneNodeVm | null;
  nodes: SceneNodeVm[];
  links: SceneLinkVm[];
  hotspots: HotspotVm[];
  heading: number;
  pitch: number;
  fov: number;
  rendererStatus: RendererStatus;
  networkQuality: NetworkQuality;
}

export interface ImmersiveActions {
  onEnter3D(): void;
  onEnterPanorama(sceneId?: string): void;
  onNavigateScene(sceneId: string): void;
  onSelectHotspot(hotspotId: string): void;
  onCloseHotspot(): void;
  onOpenDestinationInfo(): void;
  onCloseDestinationInfo(): void;
  onToggleMinimap(): void;
  onRetryRenderer(): void;
}

export interface CameraTarget {
  lat: number;
  lng: number;
  altitude?: number;
  heading?: number;
  tilt?: number;
  range?: number;
}

export interface GeographicPosition {
  lat: number;
  lng: number;
  altitude?: number;
}

export interface LocationCameraPreset {
  center: GeographicPosition;
  heading: number;
  tilt: number;
  range: number;
}

export interface Map3DLocation {
  id: string;
  label: string;
  position: GeographicPosition;
  cameraPreset: LocationCameraPreset;
}

export interface ModelPlacement {
  id: string;
  url: string;
  lat: number;
  lng: number;
  altitude?: number;
  heading?: number;
  scale?: number;
}

export interface Map3DEnginePort {
  mount(container: HTMLElement): Promise<void>;
  setLocations(locations: Map3DLocation[]): Promise<void>;
  subscribeLocationSelected(listener: (locationId: string) => void): () => void;
  flyTo(preset: LocationCameraPreset): Promise<void>;
  addModel(model: ModelPlacement): Promise<void>;
  destroy(): void;
}

export interface PanoramaView {
  heading: number;
  pitch: number;
  fov: number;
}

export interface PanoramaLink {
  targetNodeId: string;
  yaw: number;
  pitch: number;
}

export interface PanoramaNode {
  id: string;
  name?: string;
  panoramaUrl: string;
  previewUrl: string | null;
  lat: number;
  lng: number;
  initialView: PanoramaView;
  links?: PanoramaLink[];
}

export interface PanoramaEnginePort {
  mount(container: HTMLElement): Promise<void>;
  setTour?(nodes: PanoramaNode[]): void;
  loadNode(node: PanoramaNode): Promise<void>;
  setView(view: PanoramaView): void;
  subscribeViewChanged(listener: (view: PanoramaView) => void): () => void;
  subscribeNodeChanged?(listener: (nodeId: string, view?: PanoramaView) => void): () => void;
  destroy(): void;
}

export interface MinimapProps {
  currentSceneId: string | null;
  heading: number;
  nodes: SceneNodeVm[];
  links: SceneLinkVm[];
  collapsed: boolean;
  onToggle(): void;
  onNodeSelect(sceneId: string): void;
}
