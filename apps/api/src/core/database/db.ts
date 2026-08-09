import { resolve } from 'node:path';

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { loadEnvironment, type AppEnvironment } from '../config/environment';

export type DatabaseClient = ReturnType<typeof postgres>;
export type Db = PostgresJsDatabase;

export interface DatabaseHandle {
  client: DatabaseClient;
  db: Db;
}

const defaultDatabaseUrl = 'postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive';
const defaultDatabaseClientOptions = { max: 10, prepare: true } as const;

export function createDatabase(client: DatabaseClient): DatabaseHandle {
  return {
    client,
    db: drizzle(client),
  };
}

export function createDatabaseClientOptions(
  environment: AppEnvironment,
  databaseUrl = environment.database.url,
) {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get('sslmode');
  const hasExplicitCertificateMode = url.searchParams.has('sslrootcert');
  const shouldRequireSsl =
    environment.database.ssl &&
    !hasExplicitCertificateMode &&
    (!sslMode || sslMode === 'disable' || sslMode === 'allow' || sslMode === 'prefer');

  return {
    max: environment.database.maxConnections,
    prepare: environment.database.prepare,
    ...(shouldRequireSsl ? { ssl: 'require' as const } : {}),
  };
}

export function createDatabaseFromUrl(
  databaseUrl?: string,
  environment?: AppEnvironment,
): DatabaseHandle {
  const resolvedEnvironment =
    environment ?? (databaseUrl === undefined ? loadEnvironment() : undefined);
  const resolvedUrl = databaseUrl ?? resolvedEnvironment?.database.url ?? defaultDatabaseUrl;
  const clientOptions = resolvedEnvironment
    ? createDatabaseClientOptions(resolvedEnvironment, resolvedUrl)
    : defaultDatabaseClientOptions;

  return createDatabase(postgres(resolvedUrl, clientOptions));
}

export const migrationsPath = resolve(__dirname, 'migrations');

export async function migrateDatabase(db: Db) {
  await migrate(db, { migrationsFolder: migrationsPath });
}
