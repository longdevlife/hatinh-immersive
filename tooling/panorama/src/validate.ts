import { access, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  expandPanoramaTileUrl,
  parsePanoramaManifest,
  type PanoramaManifest,
} from '@hatinh/immersive-contracts';

export interface ValidatePanoramaManifestOptions {
  manifestPath: string;
  minimumWidth?: number;
}

export interface ValidatedPanoramaManifest {
  manifest: PanoramaManifest;
  maximumWidth: number;
  tileCount: number;
}

const DEFAULT_MINIMUM_WIDTH = 4096;

export async function validatePanoramaManifest(
  options: ValidatePanoramaManifestOptions,
): Promise<ValidatedPanoramaManifest> {
  const minimumWidth = options.minimumWidth ?? DEFAULT_MINIMUM_WIDTH;
  if (!Number.isSafeInteger(minimumWidth) || minimumWidth < 1) {
    throw new Error('PANORAMA_MINIMUM_WIDTH_INVALID');
  }

  await access(options.manifestPath);
  const manifest = parsePanoramaManifest(
    JSON.parse(await readFile(options.manifestPath, 'utf8')) as unknown,
  );
  const maximumWidth = manifest.levels.at(-1)?.width ?? 0;
  if (maximumWidth < minimumWidth) {
    throw new Error(`PANORAMA_MAX_WIDTH_BELOW_MINIMUM: ${maximumWidth} < ${minimumWidth}`);
  }

  const manifestDirectory = await realpath(path.dirname(options.manifestPath));
  const previewPath = await resolveManifestAssetPath(manifestDirectory, manifest.preview);
  const previewStats = await stat(previewPath).catch(() => null);
  if (!previewStats?.isFile() || previewStats.size === 0) {
    throw new Error(`PANORAMA_PREVIEW_MISSING: ${manifest.preview}`);
  }

  let tileCount = 0;
  for (const [levelIndex, level] of manifest.levels.entries()) {
    for (let row = 0; row < level.rows; row += 1) {
      for (let column = 0; column < level.cols; column += 1) {
        const relativeTilePath = expandPanoramaTileUrl(manifest, column, row, levelIndex);
        const tilePath = await resolveManifestAssetPath(manifestDirectory, relativeTilePath);
        const tileStats = await stat(tilePath).catch(() => null);
        if (!tileStats?.isFile() || tileStats.size === 0) {
          throw new Error(`PANORAMA_TILE_MISSING: ${relativeTilePath}`);
        }
        tileCount += 1;
      }
    }
  }

  return { manifest, maximumWidth, tileCount };
}

async function resolveManifestAssetPath(
  manifestDirectory: string,
  relativePath: string,
): Promise<string> {
  const resolvedPath = path.resolve(manifestDirectory, relativePath);
  assertInsideManifestDirectory(manifestDirectory, resolvedPath, relativePath);

  const resolvedRealPath = await realpath(resolvedPath).catch(() => null);
  if (resolvedRealPath !== null) {
    assertInsideManifestDirectory(manifestDirectory, resolvedRealPath, relativePath);
  }
  return resolvedPath;
}

function assertInsideManifestDirectory(
  manifestDirectory: string,
  candidatePath: string,
  displayPath: string,
): void {
  const pathFromManifestDirectory = path.relative(manifestDirectory, candidatePath);
  if (
    path.isAbsolute(pathFromManifestDirectory) ||
    pathFromManifestDirectory === '..' ||
    pathFromManifestDirectory.startsWith(`..${path.sep}`)
  ) {
    throw new Error(`PANORAMA_ASSET_PATH_OUTSIDE_MANIFEST: ${displayPath}`);
  }
}
