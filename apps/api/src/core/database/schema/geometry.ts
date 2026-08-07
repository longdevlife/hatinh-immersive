import { customType } from 'drizzle-orm/pg-core';

export interface GeoPoint4326 {
  latitude: number;
  longitude: number;
}

export const GEO_POINT_SRID = 4326;

function assertCoordinate(value: number, name: string, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a finite number between ${min} and ${max}`);
  }
}

function parsePointText(value: string): GeoPoint4326 | null {
  const match = value.match(
    /^\s*(?:SRID=\d+;)?POINT\s*\(\s*(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s+(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*\)\s*$/i,
  );

  if (!match) {
    return null;
  }

  return {
    longitude: Number(match[1]),
    latitude: Number(match[2]),
  };
}

function parseEwkb(value: string): GeoPoint4326 {
  if (!/^[0-9a-f]+$/i.test(value) || value.length < 42) {
    throw new Error(`Unsupported PostGIS point value: ${value}`);
  }

  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }

  const littleEndian = bytes[0] === 1;
  const view = new DataView(bytes.buffer);
  const geometryType = view.getUint32(1, littleEndian);
  const hasSrid = (geometryType & 0x20000000) !== 0;
  const baseType = geometryType & 0xffff;
  const coordinateOffset = 5 + (hasSrid ? 4 : 0);

  if (hasSrid && view.getUint32(5, littleEndian) !== GEO_POINT_SRID) {
    throw new Error(`Expected PostGIS SRID ${GEO_POINT_SRID}`);
  }

  if (baseType !== 1 || bytes.length < coordinateOffset + 16) {
    throw new Error(`Unsupported PostGIS geometry type: ${baseType}`);
  }

  return {
    longitude: view.getFloat64(coordinateOffset, littleEndian),
    latitude: view.getFloat64(coordinateOffset + 8, littleEndian),
  };
}

export const geoPoint4326 = customType<{
  data: GeoPoint4326;
  driverData: string;
}>({
  dataType: () => `geometry(Point,${GEO_POINT_SRID})`,
  toDriver: (value) => {
    assertCoordinate(value.longitude, 'longitude', -180, 180);
    assertCoordinate(value.latitude, 'latitude', -90, 90);
    return `SRID=${GEO_POINT_SRID};POINT(${value.longitude} ${value.latitude})`;
  },
  fromDriver: (value) => {
    const parsedText = parsePointText(value);
    const point = parsedText ?? parseEwkb(value);
    assertCoordinate(point.longitude, 'longitude', -180, 180);
    assertCoordinate(point.latitude, 'latitude', -90, 90);
    return point;
  },
});
