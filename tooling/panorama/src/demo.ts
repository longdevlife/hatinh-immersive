import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { generatePanoramaTiles } from './pipeline.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = path.join(packageRoot, 'demo-sources');

export const DEMO_SCENES = [
  { id: 'thien-cam-boardwalk', sourcePath: path.join(sourceRoot, 'thien-cam-boardwalk.webp') },
  { id: 'thien-cam-shore', sourcePath: path.join(sourceRoot, 'thien-cam-shore.webp') },
  { id: 'thien-cam-lookout', sourcePath: path.join(sourceRoot, 'thien-cam-lookout.webp') },
  { id: 'nguyen-du-courtyard', sourcePath: path.join(sourceRoot, 'nguyen-du-courtyard.webp') },
  { id: 'dong-loc-memorial', sourcePath: path.join(sourceRoot, 'dong-loc-memorial.webp') },
] as const;

export async function generateDemoPanoramas(outputRoot: string): Promise<void> {
  for (const scene of DEMO_SCENES) {
    await generatePanoramaTiles({
      inputPath: scene.sourcePath,
      outputDir: path.join(outputRoot, scene.id),
      tileSize: 256,
      previewWidth: 512,
      quality: 72,
    });
  }
}

const defaultOutputRoot = path.resolve(packageRoot, '../../apps/web/public/demo/360');
const entryPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;

if (entryPath === import.meta.url) {
  await generateDemoPanoramas(defaultOutputRoot);
}
