import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

import { configureHttpApplication } from '../src/app/app.bootstrap';
import { AppModule } from '../src/app/app.module';
import { createDatabase, migrateDatabase } from '../src/core/database/db';
import { adminInject, configureTestBootstrap, loginAsAdmin } from './auth-test.utils';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive';

configureTestBootstrap();

describe('Catalog HTTP API', () => {
  let app: NestFastifyApplication;
  let adminCookie: string;
  const client = postgres(databaseUrl, { max: 1 });
  const { db } = createDatabase(client);

  beforeAll(async () => {
    await migrateDatabase(db);
    await db.execute(sql`
      truncate table catalog_destination_translations, catalog_destinations, catalog_categories
      restart identity cascade
    `);

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

  it('creates, publishes, lists, and reads a destination through the public contract', async () => {
    const slug = `son-trang-${randomUUID().slice(0, 8)}`;
    const defaultSceneId = randomUUID();
    const createResponse = await adminInject(app, adminCookie, {
      method: 'POST',
      url: '/api/v1/admin/destinations',
      payload: {
        slug,
        geoPoint: { latitude: 18.3421, longitude: 105.9032 },
        defaultSceneId,
        translations: [
          {
            locale: 'vi',
            name: 'Sơn Trang Cổ Đạm',
            summary: 'Một điểm đến immersive của Hà Tĩnh.',
            description: 'Nội dung giới thiệu điểm đến.',
          },
        ],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json();
    expect(created).toEqual(
      expect.objectContaining({
        slug,
        status: 'draft',
        defaultSceneId,
      }),
    );

    const updatedSummary = 'Một điểm đến immersive đã được biên tập.';
    const updateResponse = await adminInject(app, adminCookie, {
      method: 'PATCH',
      url: `/api/v1/admin/destinations/${created.id}`,
      payload: {
        translations: [
          {
            locale: 'vi',
            name: 'Sơn Trang Cổ Đạm',
            summary: updatedSummary,
            description: 'Nội dung giới thiệu điểm đến đã cập nhật.',
          },
        ],
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toEqual(
      expect.objectContaining({
        status: 'draft',
        translations: [expect.objectContaining({ summary: updatedSummary })],
      }),
    );

    const publishResponse = await adminInject(app, adminCookie, {
      method: 'POST',
      url: `/api/v1/admin/destinations/${created.id}/publish`,
    });

    expect(publishResponse.statusCode).toBe(200);
    expect(publishResponse.json()).toEqual(expect.objectContaining({ status: 'published' }));

    const listResponse = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/destinations',
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          slug,
          name: 'Sơn Trang Cổ Đạm',
          summary: updatedSummary,
          categoryLabel: null,
          coverImageUrl: null,
        }),
      ]),
    );

    const detailResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'GET',
        url: `/api/v1/destinations/${slug}`,
      });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toEqual(
      expect.objectContaining({
        id: created.id,
        slug,
        status: 'published',
        defaultSceneId,
        geoPoint: { latitude: 18.3421, longitude: 105.9032 },
      }),
    );
  });
});
