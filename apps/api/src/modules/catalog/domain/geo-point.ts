export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export function normalizeGeoPoint(point: GeoPoint | null | undefined): GeoPoint | null {
  if (point === null || point === undefined) {
    return null;
  }

  if (
    !Number.isFinite(point.latitude) ||
    point.latitude < -90 ||
    point.latitude > 90 ||
    !Number.isFinite(point.longitude) ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    throw new Error('geoPoint must contain valid WGS84 latitude and longitude coordinates');
  }

  return {
    latitude: point.latitude,
    longitude: point.longitude,
  };
}
