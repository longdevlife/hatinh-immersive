import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp, { type Sharp } from 'sharp';
import {
  PANORAMA_MANIFEST_TYPE,
  PANORAMA_MANIFEST_VERSION,
  parsePanoramaManifest,
  type PanoramaManifest,
  type PanoramaTileLevel,
} from '@hatinh/immersive-contracts';

export interface GeneratePanoramaTilesOptions {
  inputPath: string;
  outputDir: string;
  tileSize?: number;
  previewWidth?: number;
  quality?: number;
}

export interface GeneratedPanorama {
  manifest: PanoramaManifest;
  manifestPath: string;
}

const DEFAULT_TILE_SIZE = 512;
const DEFAULT_PREVIEW_WIDTH = 512;
const DEFAULT_QUALITY = 82;

export async function generatePanoramaTiles(
  options: GeneratePanoramaTilesOptions,
): Promise<GeneratedPanorama> {
  const tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
  const quality = options.quality ?? DEFAULT_QUALITY;
  assertTileSize(tileSize);
  assertQuality(quality);

  const source = sharp(options.inputPath);
  try {
    const metadata = await source.metadata();
    const sourceWidth = metadata.width;
    const sourceHeight = metadata.height;
    if (!sourceWidth || !sourceHeight || sourceWidth !== sourceHeight * 2) {
      throw new Error('PANORAMA_SOURCE_MUST_BE_EQUIRECTANGULAR');
    }

    const levels = createLevels(sourceWidth, tileSize);
    const previewWidth = normalizePreviewWidth(
      options.previewWidth ?? DEFAULT_PREVIEW_WIDTH,
      sourceWidth,
    );

    await mkdir(options.outputDir, { recursive: true });
    await renderImage(source, options.outputDir, 'preview.webp', previewWidth, quality);

    for (const [levelIndex, level] of levels.entries()) {
      await renderLevel(source, options.outputDir, level, levelIndex, quality);
    }

    const manifest = parsePanoramaManifest({
      version: PANORAMA_MANIFEST_VERSION,
      type: PANORAMA_MANIFEST_TYPE,
      preview: 'preview.webp',
      tileUrlTemplate: 'tiles/{level}/{col}-{row}.webp',
      levels,
    });
    const manifestPath = path.join(options.outputDir, 'manifest.json');
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    return { manifest, manifestPath };
  } finally {
    source.destroy();
  }
}

function createLevels(sourceWidth: number, tileSize: number): PanoramaTileLevel[] {
  const maximumWidth = largestPowerOfTwoAtMost(sourceWidth);
  if (maximumWidth < tileSize) {
    throw new Error('PANORAMA_SOURCE_MUST_BE_AT_LEAST_ONE_TILE_WIDE');
  }
  const levels: PanoramaTileLevel[] = [];
  for (let width = tileSize; width <= maximumWidth; width *= 2) {
    const cols = width / tileSize;
    levels.push({
      width,
      cols,
      rows: Math.max(1, cols / 2),
    });
  }
  return levels;
}

async function renderImage(
  source: Sharp,
  outputDir: string,
  relativePath: string,
  width: number,
  quality: number,
): Promise<void> {
  const image = source.clone().resize({ width, height: width / 2, fit: 'fill' });
  try {
    await image.webp({ quality }).toFile(path.join(outputDir, relativePath));
  } finally {
    image.destroy();
  }
}

async function renderLevel(
  source: Sharp,
  outputDir: string,
  level: PanoramaTileLevel,
  levelIndex: number,
  quality: number,
): Promise<void> {
  const levelDirectory = path.join(outputDir, 'tiles', String(levelIndex));
  await mkdir(levelDirectory, { recursive: true });
  const tileWidth = level.width / level.cols;
  const tileHeight = level.width / 2 / level.rows;
  const resized = source.clone().resize({
    width: level.width,
    height: level.width / 2,
    fit: 'fill',
  });

  try {
    for (let row = 0; row < level.rows; row += 1) {
      for (let column = 0; column < level.cols; column += 1) {
        const tile = resized.clone().extract({
          left: column * tileWidth,
          top: row * tileHeight,
          width: tileWidth,
          height: tileHeight,
        });
        try {
          await tile.webp({ quality }).toFile(path.join(levelDirectory, `${column}-${row}.webp`));
        } finally {
          tile.destroy();
        }
      }
    }
  } finally {
    resized.destroy();
  }
}

function normalizePreviewWidth(width: number, fullWidth: number): number {
  if (!Number.isSafeInteger(width) || width <= 1) {
    throw new Error('PANORAMA_PREVIEW_WIDTH_INVALID');
  }
  const normalized = Math.min(width, fullWidth);
  return normalized % 2 === 0 ? normalized : normalized - 1;
}

function assertTileSize(tileSize: number): void {
  if (!Number.isSafeInteger(tileSize) || tileSize < 64 || !isPowerOfTwo(tileSize)) {
    throw new Error('PANORAMA_TILE_SIZE_MUST_BE_A_POWER_OF_TWO_AT_LEAST_64');
  }
}

function assertQuality(quality: number): void {
  if (!Number.isSafeInteger(quality) || quality < 1 || quality > 100) {
    throw new Error('PANORAMA_WEBP_QUALITY_MUST_BE_BETWEEN_1_AND_100');
  }
}

function isPowerOfTwo(value: number): boolean {
  return (value & (value - 1)) === 0;
}

function largestPowerOfTwoAtMost(value: number): number {
  let result = 1;
  while (result * 2 <= value) {
    result *= 2;
  }
  return result;
}
