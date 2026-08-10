import type { LocationCameraPreset } from '../contracts';

export interface ApiLocationCameraPreset {
  center: {
    lat: number;
    lng: number;
    altitude?: number | null;
  };
  heading: number;
  tilt: number;
  range: number;
}

export function toLocationCameraPreset(
  value: ApiLocationCameraPreset | null | undefined,
): LocationCameraPreset | undefined {
  if (!value) {
    return undefined;
  }

  return {
    center: {
      lat: value.center.lat,
      lng: value.center.lng,
      ...(value.center.altitude === null || value.center.altitude === undefined
        ? {}
        : { altitude: value.center.altitude }),
    },
    heading: value.heading,
    tilt: value.tilt,
    range: value.range,
  };
}
