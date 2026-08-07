import type { INestApplication } from '@nestjs/common';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { loadEnvironment } from '../core/config/environment';

export async function configureHttpApplication(app: INestApplication) {
  const environment = loadEnvironment();
  const fastify = app.getHttpAdapter().getInstance();

  app.setGlobalPrefix('api/v1');
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });
  await fastify.register(cors, {
    origin: environment.corsOrigins,
  });
  await fastify.register(rateLimit, {
    max: environment.rateLimitMax,
    timeWindow: environment.rateLimitWindow,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hà Tĩnh Immersive API')
    .setDescription('REST API for the Hà Tĩnh immersive tourism platform foundation.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}
