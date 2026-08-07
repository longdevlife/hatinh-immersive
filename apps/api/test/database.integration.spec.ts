import { sql } from 'drizzle-orm';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

import { createDatabase, migrateDatabase } from '../src/core/database/db';
import { geoPoint4326 } from '../src/core/database/schema/geometry';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive';

const geometryProbe = pgTable('database_geometry_probe', {
  id: text('id').primaryKey(),
  geoPoint: geoPoint4326('geo_point').notNull(),
});

describe('PostGIS database foundation', () => {
  const client = postgres(databaseUrl, { max: 1 });
  const { db } = createDatabase(client);

  beforeAll(async () => {
    await migrateDatabase(db);
    await db.execute(sql`
      create temporary table database_geometry_probe (
        id text primary key,
        geo_point geometry(Point,4326) not null
      )
    `);
  });

  afterAll(async () => {
    await client.end({ timeout: 5 });
  });

  it('inserts a WGS84 point and reads its SRID and coordinates back', async () => {
    const id = randomUUID();
    const point = { latitude: 18.3421, longitude: 105.9032 };

    await db.insert(geometryProbe).values({ id, geoPoint: point });

    const result = await db.execute<{ srid: number; longitude: number; latitude: number }>(sql`
      select
        st_srid(geo_point) as srid,
        st_x(geo_point) as longitude,
        st_y(geo_point) as latitude
      from database_geometry_probe
      where id = ${id}
    `);

    expect(result).toHaveLength(1);
    const [row] = result;
    if (!row) {
      throw new Error('Expected a geometry row');
    }

    expect(Number(row.srid)).toBe(4326);
    expect(Number(row.longitude)).toBeCloseTo(point.longitude, 4);
    expect(Number(row.latitude)).toBeCloseTo(point.latitude, 4);

    const mappedRows = await db
      .select({ geoPoint: geometryProbe.geoPoint })
      .from(geometryProbe)
      .where(sql`id = ${id}`);

    const [mappedRow] = mappedRows;
    if (!mappedRow) {
      throw new Error('Expected a mapped geometry row');
    }

    expect(mappedRow.geoPoint.latitude).toBeCloseTo(point.latitude, 4);
    expect(mappedRow.geoPoint.longitude).toBeCloseTo(point.longitude, 4);
  });
});
