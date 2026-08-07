import type { NavigationView } from './navigation.types';

export const DEFAULT_NAVIGATION_VIEW: NavigationView = {
  heading: 0,
  pitch: 0,
  fov: 90,
};

const MIN_PITCH = -90;
const MAX_PITCH = 90;
const MIN_FOV = 30;
const MAX_FOV = 120;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeHeading(heading: number): number {
  return ((heading % 360) + 360) % 360;
}

function finiteOrCurrent(value: number | undefined, current: number): number {
  return value !== undefined && Number.isFinite(value) ? value : current;
}

function roundCameraValue(value: number): number {
  return Number(value.toFixed(3));
}

export function normalizeNavigationView(
  current: NavigationView,
  update: Partial<NavigationView>,
): NavigationView {
  const heading = finiteOrCurrent(update.heading, current.heading);
  const pitch = finiteOrCurrent(update.pitch, current.pitch);
  const fov = finiteOrCurrent(update.fov, current.fov);

  return {
    heading: roundCameraValue(normalizeHeading(heading)),
    pitch: roundCameraValue(clamp(pitch, MIN_PITCH, MAX_PITCH)),
    fov: roundCameraValue(clamp(fov, MIN_FOV, MAX_FOV)),
  };
}
