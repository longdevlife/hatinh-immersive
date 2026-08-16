import type { DestinationMediaVm } from './media';

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
  media?: DestinationMediaVm;
  categoryLabel: string | null;
  defaultSceneId: string | null;
  geoPoint: { latitude: number; longitude: number } | null;
  cameraPreset?: LocationCameraPreset;
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
  type: 'information' | 'media' | 'audio' | 'scene-navigation' | 'external';
  yaw: number;
  pitch: number;
  label: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  targetSceneId?: string | null;
  audioTrackId?: string | null;
}

export type ImmersiveAudioTrackType = 'ambient' | 'narration';

export type ImmersiveAudioRights = 'customer-owned' | 'licensed' | 'demo-only';

export interface ImmersiveAudioTrack {
  id: string;
  type: ImmersiveAudioTrackType;
  label: string;
  src: string | null;
  rights: ImmersiveAudioRights;
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
  onReturnToDestination(): void;
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

export type PanoramaMediaQuality = 'ready' | 'low-resolution' | 'missing' | 'invalid';

export type PanoramaMediaRights = 'customer-owned' | 'licensed' | 'demo-only';

export interface PanoramaLink {
  targetNodeId: string;
  yaw: number;
  pitch: number;
}

export interface PanoramaNode {
  id: string;
  name?: string;
  destinationSlug?: string;
  thumbnailUrl?: string | null;
  role?: 'major-stop' | 'connector';
  /** Null means the scene is part of the tour graph but has no media yet. */
  panoramaUrl: string | null;
  previewUrl: string | null;
  /**
   * Media quality is deliberately separate from scene-graph membership and
   * rights/intended-use. A complete graph can still lack public-quality media.
   */
  mediaQuality?: PanoramaMediaQuality;
  mediaRights?: PanoramaMediaRights;
  ambientTrackId?: string | null;
  narrationTrackId?: string | null;
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
  setHotspots?(hotspots: HotspotVm[]): void;
  subscribeViewChanged(listener: (view: PanoramaView) => void): () => void;
  subscribeNodeChanged?(listener: (nodeId: string, view?: PanoramaView) => void): () => void;
  subscribeHotspotSelected?(listener: (hotspotId: string) => void): () => void;
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
