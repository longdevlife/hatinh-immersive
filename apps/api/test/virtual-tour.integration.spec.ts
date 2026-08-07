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

describe('Virtual tour HTTP API', () => {
  let app: NestFastifyApplication;
  let adminCookie: string;
  const client = postgres(databaseUrl, { max: 1 });
  const { db } = createDatabase(client);

  beforeAll(async () => {
    await migrateDatabase(db);
    await db.execute(sql`
      truncate table
        virtual_tour_hotspots,
        virtual_tour_scene_links,
        virtual_tour_scenes,
        catalog_destination_translations,
        catalog_destinations,
        catalog_categories
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

  it('publishes a scene graph and serves the immersive manifest and neighbors', async () => {
    const firstSceneId = randomUUID();
    const secondSceneId = randomUUID();
    const slug = `immersive-${randomUUID().slice(0, 8)}`;

    const destinationResponse = await adminInject(app, adminCookie, {
      method: 'POST',
      url: '/api/v1/admin/destinations',
      payload: {
        slug,
        geoPoint: { latitude: 18.3421, longitude: 105.9032 },
        defaultSceneId: firstSceneId,
        translations: [
          {
            locale: 'vi',
            name: 'Không gian immersive Hà Tĩnh',
            summary: 'Một manifest thử nghiệm.',
            description: 'Mô tả thử nghiệm.',
          },
        ],
      },
    });
    expect(destinationResponse.statusCode).toBe(201);
    const createdDestination = destinationResponse.json();
    const destinationId = createdDestination.id;

    const publishDestinationResponse = await adminInject(app, adminCookie, {
      method: 'POST',
      url: `/api/v1/admin/destinations/${destinationId}/publish`,
    });
    expect(publishDestinationResponse.statusCode).toBe(200);

    for (const [id, name, sortOrder] of [
      [firstSceneId, 'Cổng vào', 0],
      [secondSceneId, 'Sân trong', 1],
    ] as const) {
      const createSceneResponse = await adminInject(app, adminCookie, {
        method: 'POST',
        url: '/api/v1/admin/scenes',
        payload: {
          id,
          destinationId,
          name,
          geoPoint: { latitude: 18.3421 + sortOrder / 1000, longitude: 105.9032 },
          panoramaAssetId: randomUUID(),
          panoramaAssetStatus: 'ready',
          initialHeading: -15,
          initialPitch: 8,
          initialFov: 88,
          sortOrder,
        },
      });
      expect(createSceneResponse.statusCode).toBe(201);

      const publishSceneResponse = await adminInject(app, adminCookie, {
        method: 'POST',
        url: `/api/v1/admin/scenes/${id}/publish`,
      });
      expect(publishSceneResponse.statusCode).toBe(200);
    }

    const linkResponse = await adminInject(app, adminCookie, {
      method: 'POST',
      url: '/api/v1/admin/scene-links',
      payload: {
        fromSceneId: firstSceneId,
        toSceneId: secondSceneId,
        yaw: -45,
        pitch: 12,
        bidirectional: true,
        sortOrder: 0,
      },
    });
    expect(linkResponse.statusCode).toBe(201);
    expect(linkResponse.json()).toEqual(expect.objectContaining({ yaw: 315, pitch: 12 }));

    const selfLinkResponse = await adminInject(app, adminCookie, {
      method: 'POST',
      url: '/api/v1/admin/scene-links',
      payload: {
        fromSceneId: firstSceneId,
        toSceneId: firstSceneId,
        yaw: 0,
        pitch: 0,
        bidirectional: false,
        sortOrder: 1,
      },
    });
    expect(selfLinkResponse.statusCode).toBe(422);
    expect(selfLinkResponse.json()).toEqual(
      expect.objectContaining({ code: 'VALIDATION_ERROR', status: 422 }),
    );

    const hotspotResponse = await adminInject(app, adminCookie, {
      method: 'POST',
      url: '/api/v1/admin/hotspots',
      payload: {
        sceneId: firstSceneId,
        type: 'information',
        yaw: 725,
        pitch: -30,
        payload: { title: 'Câu chuyện địa danh' },
        status: 'published',
      },
    });
    expect(hotspotResponse.statusCode).toBe(201);
    expect(hotspotResponse.json()).toEqual(expect.objectContaining({ yaw: 5, pitch: -30 }));

    const manifestResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'GET',
        url: `/api/v1/destinations/${slug}/immersive-manifest`,
      });
    expect(manifestResponse.statusCode).toBe(200);
    expect(manifestResponse.json()).toEqual(
      expect.objectContaining({
        defaultSceneId: firstSceneId,
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: firstSceneId, status: 'published' }),
          expect.objectContaining({ id: secondSceneId, status: 'published' }),
        ]),
        links: [expect.objectContaining({ fromSceneId: firstSceneId, toSceneId: secondSceneId })],
        hotspots: [expect.objectContaining({ sceneId: firstSceneId, yaw: 5 })],
      }),
    );

    const neighborsResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'GET',
        url: `/api/v1/scenes/${secondSceneId}/neighbors`,
      });
    expect(neighborsResponse.statusCode).toBe(200);
    expect(neighborsResponse.json()).toEqual([
      expect.objectContaining({
        link: expect.objectContaining({ fromSceneId: firstSceneId, toSceneId: secondSceneId }),
        scene: expect.objectContaining({ id: firstSceneId }),
      }),
    ]);
  });

  it('returns not found when a link references a missing scene', async () => {
    const sceneId = randomUUID();
    const response = await adminInject(app, adminCookie, {
      method: 'POST',
      url: '/api/v1/admin/scene-links',
      payload: {
        fromSceneId: sceneId,
        toSceneId: sceneId,
        yaw: 0,
        pitch: 0,
        bidirectional: false,
        sortOrder: 0,
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
