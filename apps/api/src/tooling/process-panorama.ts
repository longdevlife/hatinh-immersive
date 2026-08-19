import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';

import { AppModule } from '../app/app.module';
import {
  PanoramaIngestionService,
  type ProcessPanoramaInput,
} from '../modules/media/application/panorama-ingestion.service';
import { VirtualTourCommandService } from '../modules/virtual-tour/application/virtual-tour.commands';

export interface PanoramaProcessArgs extends ProcessPanoramaInput {
  sceneId: string | null;
}

export function parsePanoramaProcessArgs(args: string[]): PanoramaProcessArgs {
  const { values } = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    options: {
      asset: { type: 'string' },
      rights: { type: 'string' },
      'rights-holder': { type: 'string' },
      'rights-reference': { type: 'string' },
      'source-reference': { type: 'string' },
      version: { type: 'string' },
      scene: { type: 'string' },
    },
  });

  const mediaAssetId = requiredUuid(values.asset, 'PANORAMA_MEDIA_ASSET_REQUIRED');
  const rights = values.rights;
  if (rights !== 'customer-owned' && rights !== 'licensed') {
    throw new Error('PANORAMA_RIGHTS_INVALID');
  }

  return {
    mediaAssetId,
    rights,
    rightsHolder: required(values['rights-holder'], 'PANORAMA_RIGHTS_HOLDER_REQUIRED'),
    rightsReference: required(values['rights-reference'], 'PANORAMA_RIGHTS_REFERENCE_REQUIRED'),
    sourceReference: required(values['source-reference'], 'PANORAMA_SOURCE_REFERENCE_REQUIRED'),
    version: required(values.version, 'PANORAMA_VERSION_REQUIRED'),
    sceneId: values.scene ? requiredUuid(values.scene, 'PANORAMA_SCENE_ID_INVALID') : null,
  };
}

interface PanoramaProcessDependencies {
  ingestion: Pick<PanoramaIngestionService, 'findReadyResult' | 'process'>;
  commands: Pick<VirtualTourCommandService, 'assignPanoramaToScene'>;
}

export async function runPanoramaProcess(
  input: PanoramaProcessArgs,
  dependencies: PanoramaProcessDependencies,
) {
  const metadata =
    (await dependencies.ingestion.findReadyResult(input)) ??
    (await dependencies.ingestion.process(input));
  let assignedSceneId: string | null = null;
  if (input.sceneId) {
    assignedSceneId = (
      await dependencies.commands.assignPanoramaToScene(input.sceneId, input.mediaAssetId)
    ).id;
  }
  return {
    mediaAssetId: metadata.mediaAssetId,
    qualityStatus: metadata.qualityStatus,
    dimensions: { width: metadata.sourceWidthPx, height: metadata.sourceHeightPx },
    manifestKey: metadata.manifestKey,
    previewKey: metadata.previewKey,
    sceneId: assignedSceneId,
  };
}

async function main() {
  const input = parsePanoramaProcessArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const ingestion = app.get(PanoramaIngestionService);
    const commands = app.get(VirtualTourCommandService);
    const result = await runPanoramaProcess(input, { ingestion, commands });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await app.close();
  }
}

function required(value: string | undefined, code: string) {
  if (!value?.trim()) throw new Error(code);
  return value.trim();
}

function requiredUuid(value: string | undefined, code: string) {
  const normalized = required(value, code);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
  ) {
    throw new Error(code);
  }
  return normalized;
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
