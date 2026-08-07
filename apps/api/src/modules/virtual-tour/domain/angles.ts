export const PANORAMA_FOV_MIN = 30;
export const PANORAMA_FOV_MAX = 120;

export function normalizeYaw(yaw: number): number {
  if (!Number.isFinite(yaw)) {
    throw new Error('yaw must be a finite number');
  }

  const normalized = yaw % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function validatePitch(pitch: number): number {
  if (!Number.isFinite(pitch) || pitch < -90 || pitch > 90) {
    throw new Error('pitch must be between -90 and 90 degrees');
  }

  return pitch;
}

export function validateFov(fov: number): number {
  if (!Number.isFinite(fov) || fov < PANORAMA_FOV_MIN || fov > PANORAMA_FOV_MAX) {
    throw new Error(`fov must be between ${PANORAMA_FOV_MIN} and ${PANORAMA_FOV_MAX} degrees`);
  }

  return fov;
}
