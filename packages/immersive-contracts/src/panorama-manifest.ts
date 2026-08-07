export const PANORAMA_MANIFEST_VERSION = 1 as const;
export const PANORAMA_MANIFEST_TYPE = 'equirectangular-tiles' as const;

export interface PanoramaTileLevel {
  width: number;
  cols: number;
  rows: number;
}

export interface PanoramaManifest {
  version: typeof PANORAMA_MANIFEST_VERSION;
  type: typeof PANORAMA_MANIFEST_TYPE;
  preview: string;
  tileUrlTemplate: string;
  levels: PanoramaTileLevel[];
}

export class PanoramaManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PanoramaManifestError';
  }
}

export function parsePanoramaManifest(value: unknown): PanoramaManifest {
  if (!isRecord(value)) {
    throw new PanoramaManifestError('Panorama manifest must be an object.');
  }

  if (value.version !== PANORAMA_MANIFEST_VERSION) {
    throw new PanoramaManifestError('Panorama manifest version is not supported.');
  }
  if (value.type !== PANORAMA_MANIFEST_TYPE) {
    throw new PanoramaManifestError('Panorama manifest type is not supported.');
  }

  const preview = readNonEmptyString(value.preview, 'preview');
  const tileUrlTemplate = readNonEmptyString(value.tileUrlTemplate, 'tileUrlTemplate');
  for (const token of ['{level}', '{col}', '{row}']) {
    if (!tileUrlTemplate.includes(token)) {
      throw new PanoramaManifestError(`Tile URL template must contain ${token}.`);
    }
  }

  if (!Array.isArray(value.levels) || value.levels.length === 0) {
    throw new PanoramaManifestError('Panorama manifest must contain at least one tile level.');
  }

  const levels: PanoramaTileLevel[] = [];
  let previousWidth = 0;
  for (const [index, rawLevel] of value.levels.entries()) {
    if (!isRecord(rawLevel)) {
      throw new PanoramaManifestError(`Panorama level ${index} must be an object.`);
    }

    const level = {
      width: readPositiveInteger(rawLevel.width, `levels[${index}].width`),
      cols: readPositiveInteger(rawLevel.cols, `levels[${index}].cols`),
      rows: readPositiveInteger(rawLevel.rows, `levels[${index}].rows`),
    };

    if (level.width <= previousWidth) {
      throw new PanoramaManifestError('Panorama levels must be ordered by ascending width.');
    }
    if (!isPowerOfTwo(level.cols) || !isPowerOfTwo(level.rows)) {
      throw new PanoramaManifestError('Panorama level columns and rows must be powers of two.');
    }
    if (level.width % level.cols !== 0 || (level.width / 2) % level.rows !== 0) {
      throw new PanoramaManifestError('Panorama level dimensions must divide evenly into tiles.');
    }

    levels.push(level);
    previousWidth = level.width;
  }

  return {
    version: PANORAMA_MANIFEST_VERSION,
    type: PANORAMA_MANIFEST_TYPE,
    preview,
    tileUrlTemplate,
    levels,
  };
}

export function isPanoramaManifest(value: unknown): value is PanoramaManifest {
  try {
    parsePanoramaManifest(value);
    return true;
  } catch {
    return false;
  }
}

export function expandPanoramaTileUrl(
  manifest: PanoramaManifest,
  column: number,
  row: number,
  levelIndex: number,
): string {
  const level = manifest.levels[levelIndex];
  if (!level) {
    throw new PanoramaManifestError(`Panorama level ${levelIndex} does not exist.`);
  }
  if (
    !Number.isInteger(column) ||
    column < 0 ||
    column >= level.cols ||
    !Number.isInteger(row) ||
    row < 0 ||
    row >= level.rows
  ) {
    throw new PanoramaManifestError('Panorama tile coordinates are outside the selected level.');
  }

  return manifest.tileUrlTemplate
    .replaceAll('{level}', String(levelIndex))
    .replaceAll('{col}', String(column))
    .replaceAll('{row}', String(row));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new PanoramaManifestError(`Panorama manifest ${name} must be a non-empty string.`);
  }
  return value;
}

function readPositiveInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new PanoramaManifestError(`Panorama manifest ${name} must be a positive integer.`);
  }
  return Number(value);
}

function isPowerOfTwo(value: number): boolean {
  return (value & (value - 1)) === 0;
}
