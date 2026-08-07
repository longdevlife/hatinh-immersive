import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

import { configureHttpApplication } from '../src/app/app.bootstrap';
import { AppModule } from '../src/app/app.module';
import { createDatabase, migrateDatabase } from '../src/core/database/db';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive';

describe('Media upload HTTP API', () => {
  let app: NestFastifyApplication;
  const client = postgres(databaseUrl, { max: 1 });
  const { db } = createDatabase(client);

  beforeAll(async () => {
    await migrateDatabase(db);
    await db.execute(sql`truncate table media_assets restart identity cascade`);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureHttpApplication(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    await client.end({ timeout: 5 });
  });

  it('presigns a direct upload, uploads to MinIO, and completes metadata without proxying bytes', async () => {
    const payload = new Uint8Array(Buffer.from('immersive-test'));
    const presignResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/admin/media/presign',
        payload: {
          mediaKind: 'panorama',
          originalFilename: 'son-trang.jpg',
          contentType: 'image/jpeg',
          sizeBytes: payload.byteLength,
        },
      });

    expect(presignResponse.statusCode).toBe(201);
    const presigned = presignResponse.json();
    expect(presigned.asset.status).toBe('pending');
    expect(presigned.uploadUrl).toContain('59000');

    const uploadResponse = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: presigned.requiredHeaders,
      body: payload,
    });
    expect(uploadResponse.ok).toBe(true);

    const completeResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: `/api/v1/admin/media/${presigned.asset.id}/complete-upload`,
      });

    expect(completeResponse.statusCode).toBe(200);
    expect(completeResponse.json()).toEqual(
      expect.objectContaining({
        id: presigned.asset.id,
        sizeBytes: payload.byteLength,
        status: 'uploaded',
      }),
    );
  });

  it('rejects an upload request that tries to send bytes through the metadata endpoint', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/admin/media/presign',
        payload: Buffer.from('raw panorama bytes'),
        headers: { 'content-type': 'application/octet-stream' },
      });

    expect(response.statusCode).toBe(415);
  });
});
