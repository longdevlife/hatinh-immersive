import type { ExploreMapUserLocation } from './explore-map.types';

export function buildDirectionsUrl(
  location: ExploreMapUserLocation | null | undefined,
): string | null {
  if (
    !location ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    return null;
  }

  const params = new URLSearchParams({
    api: '1',
    destination: `${location.latitude},${location.longitude}`,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
