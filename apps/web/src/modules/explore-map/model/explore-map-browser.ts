import type { ExploreMapLocationStatus, ExploreMapUserLocation } from './explore-map.types';

export const DEFAULT_GEOLOCATION_TIMEOUT_MS = 12_000;

export interface ExploreMapLocationResult {
  status: Exclude<ExploreMapLocationStatus, 'idle' | 'requesting'>;
  location?: ExploreMapUserLocation;
}

export interface ExploreMapGeolocationProvider {
  getCurrentPosition(
    success: PositionCallback,
    error?: PositionErrorCallback,
    options?: PositionOptions,
  ): void;
}

export interface ExploreMapFullscreenElement {
  requestFullscreen?: () => Promise<void>;
}

export interface ExploreMapFullscreenDocument {
  fullscreenElement: Element | null;
  fullscreenEnabled?: boolean;
  exitFullscreen?: () => Promise<void>;
}

export function requestBrowserLocation(
  geolocation: ExploreMapGeolocationProvider | undefined,
): Promise<ExploreMapLocationResult> {
  if (!geolocation) {
    return Promise.resolve({ status: 'unavailable' });
  }

  return new Promise((resolve) => {
    try {
      geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            resolve({ status: 'unavailable' });
            return;
          }

          resolve({ location: { latitude, longitude }, status: 'available' });
        },
        (error) => resolve({ status: error.code === 1 ? 'denied' : 'unavailable' }),
        { timeout: DEFAULT_GEOLOCATION_TIMEOUT_MS },
      );
    } catch {
      resolve({ status: 'unavailable' });
    }
  });
}

export function isFullscreenSupported(
  element: ExploreMapFullscreenElement | null,
  documentLike: ExploreMapFullscreenDocument,
): boolean {
  return Boolean(
    documentLike.fullscreenEnabled !== false &&
    element?.requestFullscreen &&
    documentLike.exitFullscreen,
  );
}

export async function toggleFullscreen(
  element: ExploreMapFullscreenElement | null,
  documentLike: ExploreMapFullscreenDocument,
): Promise<void> {
  if (documentLike.fullscreenEnabled === false) {
    return;
  }

  if (documentLike.fullscreenElement) {
    await documentLike.exitFullscreen?.();
    return;
  }

  await element?.requestFullscreen?.();
}
