import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app/app.module';
import { configureHttpApplication } from './app/app.bootstrap';
import { loadEnvironment } from './core/config/environment';

async function bootstrap() {
  const environment = loadEnvironment();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  await configureHttpApplication(app);
  await app.listen(environment.port, environment.host);
}

void bootstrap();
