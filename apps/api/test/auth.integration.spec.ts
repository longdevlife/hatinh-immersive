import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import argon2 from 'argon2';

import { configureHttpApplication } from '../src/app/app.bootstrap';
import { AppModule } from '../src/app/app.module';
import { createDatabase, migrateDatabase } from '../src/core/database/db';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive';

const testEmail = 'security-test-admin@hatinh.example';
const testPassword = 'correct horse battery staple';

describe('Admin identity and audit HTTP API', () => {
  let app: NestFastifyApplication;
  const client = postgres(databaseUrl, { max: 1 });
  const { db } = createDatabase(client);

  beforeAll(async () => {
    process.env.AUTH_BOOTSTRAP_EMAIL = testEmail;
    process.env.AUTH_BOOTSTRAP_PASSWORD = testPassword;
    await migrateDatabase(db);
    await db.execute(sql`
      truncate table audit_events, identity_sessions, identity_users restart identity cascade
    `);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureHttpApplication(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
    await client.end({ timeout: 5 });
  });

  it('rejects an unauthenticated content mutation', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/admin/destinations',
        payload: {
          slug: `unauthorized-${randomUUID().slice(0, 8)}`,
          translations: [{ locale: 'vi', name: 'No access', summary: 'No access' }],
        },
      });

    expect(response.statusCode).toBe(401);
  });

  it('logs an authorized content mutation and rotates refresh cookies', async () => {
    const loginResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: { email: testEmail, password: testPassword },
      });

    expect(loginResponse.statusCode).toBe(200);
    const loginCookies = loginResponse.headers['set-cookie'];
    expect(loginCookies).toEqual(expect.arrayContaining([expect.stringContaining('HttpOnly')]));
    const cookieHeader = (Array.isArray(loginCookies) ? loginCookies : [loginCookies])
      .filter((cookie): cookie is string => typeof cookie === 'string')
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');

    const slug = `authorized-${randomUUID().slice(0, 8)}`;
    const createResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: { cookie: cookieHeader },
        method: 'POST',
        url: '/api/v1/admin/destinations',
        payload: {
          slug,
          translations: [{ locale: 'vi', name: 'Authorized', summary: 'Authorized' }],
        },
      });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json();
    const auditRows = await db.execute<{ action: string; resourceId: string }>(sql`
      select action, resource_id as "resourceId"
      from audit_events
      where resource_id = ${created.id}
    `);
    expect(auditRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'content.create', resourceId: created.id }),
      ]),
    );
    await expect(
      db.execute(
        sql`update audit_events set action = 'tampered' where resource_id = ${created.id}`,
      ),
    ).rejects.toThrow();
    const unchangedAuditRows = await db.execute<{ action: string }>(sql`
      select action from audit_events where resource_id = ${created.id}
    `);
    expect(unchangedAuditRows[0]?.action).toBe('content.create');
    await expect(
      db.execute(sql`delete from audit_events where resource_id = ${created.id}`),
    ).rejects.toThrow();

    const refreshResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: { cookie: cookieHeader },
        method: 'POST',
        url: '/api/v1/admin/auth/refresh',
      });
    expect(refreshResponse.statusCode).toBe(200);
    expect(refreshResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('hatinh_access=')]),
    );
  });

  it('rejects a reviewer from creating draft content', async () => {
    const reviewerEmail = 'security-test-reviewer@hatinh.example';
    const reviewerPassword = 'reviewer password secure';
    const reviewerHash = await argon2.hash(reviewerPassword, { type: argon2.argon2id });
    await db.execute(sql`
      insert into identity_users (email, password_hash, role, status)
      values (${reviewerEmail}, ${reviewerHash}, 'REVIEWER', 'active')
      on conflict (email) do update set password_hash = excluded.password_hash, role = excluded.role, status = excluded.status
    `);

    const loginResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: { email: reviewerEmail, password: reviewerPassword },
      });
    const loginCookies = loginResponse.headers['set-cookie'];
    const cookieHeader = (Array.isArray(loginCookies) ? loginCookies : [loginCookies])
      .filter((cookie): cookie is string => typeof cookie === 'string')
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');

    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: { cookie: cookieHeader },
        method: 'POST',
        url: '/api/v1/admin/destinations',
        payload: {
          slug: `reviewer-${randomUUID().slice(0, 8)}`,
          translations: [{ locale: 'vi', name: 'Reviewer', summary: 'Reviewer' }],
        },
      });

    expect(response.statusCode).toBe(403);
  });
});
