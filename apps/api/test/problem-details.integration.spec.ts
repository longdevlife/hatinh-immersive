import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import postgres from 'postgres';

import { configureHttpApplication } from '../src/app/app.bootstrap';
import { AppModule } from '../src/app/app.module';
import { migrateDatabase, createDatabase } from '../src/core/database/db';
import { adminInject, configureTestBootstrap, loginAsAdmin } from './auth-test.utils';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive';

configureTestBootstrap();

describe('Problem Details errors', () => {
  let app: NestFastifyApplication;
  let adminCookie: string;
  const client = postgres(databaseUrl, { max: 1 });
  const { db } = createDatabase(client);

  beforeAll(async () => {
    await migrateDatabase(db);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureHttpApplication(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    adminCookie = await loginAsAdmin(app);
  });

  afterAll(async () => {
    await app.close();
    await client.end({ timeout: 5 });
  });

  it('returns the shared problem-details envelope for unknown routes', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/does-not-exist',
    });
    const body = response.json();

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(body).toEqual(
      expect.objectContaining({
        code: 'NOT_FOUND',
        instance: '/api/v1/does-not-exist',
        status: 404,
        traceId: expect.any(String),
        type: 'https://errors.example.vn/not-found',
      }),
    );
  });

  it('returns validation problem details for an invalid catalog command', async () => {
    const response = await adminInject(app, adminCookie, {
      method: 'POST',
      url: '/api/v1/admin/destinations',
      payload: { slug: 'bad slug', translations: [] },
    });
    const body = response.json();

    expect(response.statusCode).toBe(422);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(body).toEqual(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 422,
        title: 'Validation failed',
        type: 'https://errors.example.vn/validation',
        traceId: expect.any(String),
      }),
    );
  });
});
