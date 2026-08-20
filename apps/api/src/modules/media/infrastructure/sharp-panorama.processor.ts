import { Injectable } from '@nestjs/common';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';

import type {
  PanoramaProcessingOutput,
  PanoramaProcessorPort,
  PanoramaTileOutput,
} from '../application/panorama-processing.port';

const TILE_SIZE = 512;
const FIRST_LEVEL_WIDTH = 1024;
const PREVIEW_WIDTH = 1024;
const WEBP_QUALITY = 82;
const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_DERIVATIVE_BYTES = 256 * 1024 * 1024;
const MAX_INPUT_PIXELS = 16_384 * 8_192;
const SUPPORTED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface PanoramaTileLevel {
  width: number;
  cols: number;
  rows: number;
}

export class PanoramaProcessingError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'PanoramaProcessingError';
  }
}

@Injectable()
export class SharpPanoramaProcessor implements PanoramaProcessorPort {
  async process(input: {
    assetId: string;
    source: NodeJS.ReadableStream;
    sourceContentType: string;
  }): Promise<PanoramaProcessingOutput> {
    if (!SUPPORTED_CONTENT_TYPES.has(input.sourceContentType.toLowerCase())) {
      throw new PanoramaProcessingError('PANORAMA_CONTENT_TYPE_UNSUPPORTED');
    }

    const temporarySource = await materializeSource(input.source);
    const source = sharp(temporarySource.path, {
      sequentialRead: true,
      limitInputPixels: MAX_INPUT_PIXELS,
    });

    try {
      const metadata = await source.metadata().catch(() => {
        throw new PanoramaProcessingError('PANORAMA_METADATA_UNREADABLE');
      });
      const widthPx = metadata.width;
      const heightPx = metadata.height;
      if (!widthPx || !heightPx) {
        throw new PanoramaProcessingError('PANORAMA_METADATA_UNREADABLE');
      }
      if (widthPx < 4096 || heightPx < 2048) {
        throw new PanoramaProcessingError('PANORAMA_DIMENSIONS_TOO_SMALL');
      }
      if (widthPx * 100 < heightPx * 195 || widthPx * 100 > heightPx * 205) {
        throw new PanoramaProcessingError('PANORAMA_ASPECT_RATIO_INVALID');
      }

      const levels = createLevels(widthPx);
      const preview = await source
        .clone()
        .resize({ width: PREVIEW_WIDTH, height: PREVIEW_WIDTH / 2, fit: 'fill' })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      const tiles = await renderTiles(source, levels, preview.byteLength);
      const manifest = await createManifest(levels);

      return {
        widthPx,
        heightPx,
        projection: 'equirectangular',
        manifest: new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`),
        preview,
        tiles,
      };
    } catch (error) {
      if (error instanceof PanoramaProcessingError) throw error;
      throw new PanoramaProcessingError('PANORAMA_PROCESSING_FAILED');
    } finally {
      source.destroy();
      await temporarySource.cleanup();
    }
  }
}

function createLevels(sourceWidth: number): PanoramaTileLevel[] {
  const levels: PanoramaTileLevel[] = [];
  for (let width = FIRST_LEVEL_WIDTH; width <= sourceWidth; width *= 2) {
    const cols = width / TILE_SIZE;
    levels.push({ width, cols, rows: cols / 2 });
  }
  return levels;
}

async function createManifest(levels: PanoramaTileLevel[]) {
  const { PANORAMA_MANIFEST_TYPE, PANORAMA_MANIFEST_VERSION, parsePanoramaManifest } =
    await import('@hatinh/immersive-contracts');
  return parsePanoramaManifest({
    version: PANORAMA_MANIFEST_VERSION,
    type: PANORAMA_MANIFEST_TYPE,
    preview: 'preview.webp',
    tileUrlTemplate: 'tiles/{level}/{col}-{row}.webp',
    levels,
  });
}

async function renderTiles(
  source: sharp.Sharp,
  levels: PanoramaTileLevel[],
  initialDerivativeBytes: number,
) {
  const output: PanoramaTileOutput[] = [];
  let derivativeBytes = initialDerivativeBytes;

  for (const [levelIndex, level] of levels.entries()) {
    const resized = source.clone().resize({
      width: level.width,
      height: level.width / 2,
      fit: 'fill',
    });
    try {
      for (let row = 0; row < level.rows; row += 1) {
        for (let column = 0; column < level.cols; column += 1) {
          const body = await resized
            .clone()
            .extract({
              left: column * TILE_SIZE,
              top: row * TILE_SIZE,
              width: TILE_SIZE,
              height: TILE_SIZE,
            })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();
          derivativeBytes += body.byteLength;
          if (derivativeBytes > MAX_DERIVATIVE_BYTES) {
            throw new PanoramaProcessingError('PANORAMA_DERIVATIVES_TOO_LARGE');
          }
          output.push({
            keySuffix: `tiles/${levelIndex}/${column}-${row}.webp`,
            contentType: 'image/webp',
            body,
          });
        }
      }
    } finally {
      resized.destroy();
    }
  }

  return output;
}

async function materializeSource(stream: NodeJS.ReadableStream) {
  const directory = await mkdtemp(join(tmpdir(), 'hatinh-panorama-'));
  const sourcePath = join(directory, 'source');
  let receivedBytes = 0;
  const limit = new Transform({
    transform(chunk: Buffer | string, _encoding, callback) {
      const bytes = typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.byteLength;
      receivedBytes += bytes;
      if (receivedBytes > MAX_SOURCE_BYTES) {
        callback(new PanoramaProcessingError('PANORAMA_SOURCE_TOO_LARGE'));
        return;
      }
      callback(null, chunk);
    },
  });
  try {
    await pipeline(stream as Readable, limit, createWriteStream(sourcePath, { flags: 'wx' }));
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    if (error instanceof PanoramaProcessingError) throw error;
    throw new PanoramaProcessingError('PANORAMA_METADATA_UNREADABLE');
  }
  return {
    path: sourcePath,
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}
