import { resolve } from 'node:path';

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { loadEnvironment } from '../config/environment';

export type DatabaseClient = ReturnType<typeof postgres>;
export type Db = PostgresJsDatabase;

export interface DatabaseHandle {
  client: DatabaseClient;
  db: Db;
}

export function createDatabase(client: DatabaseClient): DatabaseHandle {
  return {
    client,
    db: drizzle(client),
  };
}

export function createDatabaseFromUrl(databaseUrl = loadEnvironment().databaseUrl): DatabaseHandle {
  return createDatabase(postgres(databaseUrl, { max: 10 }));
}

export const migrationsPath = resolve(__dirname, 'migrations');

export async function migrateDatabase(db: Db) {
  await migrate(db, { migrationsFolder: migrationsPath });
}
