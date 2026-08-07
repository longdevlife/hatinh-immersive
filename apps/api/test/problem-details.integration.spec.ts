import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';

import { configureHttpApplication } from '../src/app/app.bootstrap';
import { AppModule } from '../src/app/app.module';

describe('Problem Details errors', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureHttpApplication(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
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
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
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
