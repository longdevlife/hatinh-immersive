import type { LocationCameraPreset, Map3DLocation } from './map3d-engine.port';

export type Selected3DAnchorVerification = 'demo-unverified' | 'verified';

export interface Selected3DAnchor {
  id: string;
  destinationId: string;
  label: string;
  shortLabel?: string;
  position: {
    lat: number;
    lng: number;
    altitude?: number;
  };
  cameraPreset: LocationCameraPreset;
  panoramaSceneId?: string | null;
  verification: Selected3DAnchorVerification;
}

export function toMap3DLocation(anchor: Selected3DAnchor): Map3DLocation {
  return {
    id: anchor.id,
    label: anchor.label,
    position: anchor.position,
    cameraPreset: anchor.cameraPreset,
  };
}

export function toMap3DLocations(anchors: readonly Selected3DAnchor[]): Map3DLocation[] {
  return anchors.map(toMap3DLocation);
}

export function toDestinationMap3DLocations(
  anchors: readonly Selected3DAnchor[],
  destinationId: string,
): Map3DLocation[] {
  return toMap3DLocations(anchors.filter((anchor) => anchor.destinationId === destinationId));
}
