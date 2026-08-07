import type { CreateHotspotBodyStatus, CreateHotspotBodyType } from '@hatinh/api-client';

export type EditorScene = {
  id: string;
  initialFov: number;
  initialHeading: number;
  initialPitch: number;
  name: string;
  panoramaUrl?: string;
  previewUrl?: string;
};

export type PanoramaClickPosition = {
  pitch: number;
  yaw: number;
};

export type EditorHotspot = {
  id?: string;
  payload: Record<string, unknown>;
  pitch: number;
  sceneId: string;
  status?: CreateHotspotBodyStatus;
  type: CreateHotspotBodyType;
  yaw: number;
};

export type EditorHotspotDraft = Omit<EditorHotspot, 'id'> & { id?: string };
