import 'reflect-metadata';

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app/app.module';
import { configureHttpApplication } from './app/app.bootstrap';

async function exportOpenApi() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: false,
    abortOnError: false,
  });
  const outputPath = resolve(__dirname, '../../../packages/api-client/openapi.json');

  try {
    const document = await configureHttpApplication(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    await mkdir(resolve(outputPath, '..'), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(sortKeys(document), null, 2)}\n`, 'utf8');
  } finally {
    await app.close();
  }
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortKeys(entry)]),
    );
  }

  return value;
}

void exportOpenApi().catch((error: unknown) => {
  process.stderr.write(`openapi:error ${String(error)}\n`);
  process.exitCode = 1;
});
