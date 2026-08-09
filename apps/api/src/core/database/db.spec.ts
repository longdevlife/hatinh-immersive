import postgres from 'postgres';
import { describe, expect, it, vi } from 'vitest';

import { loadEnvironment } from '../config/environment';
import { createDatabaseClientOptions, createDatabaseFromUrl } from './db';

vi.mock('postgres', () => ({
  default: vi.fn(() => ({ end: vi.fn() })),
}));

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({ mockedDb: true })),
}));

describe('database client options', () => {
  it('maps Supabase environment settings to postgres.js options', () => {
    const environment = loadEnvironment({
      DATABASE_URL: 'postgresql://postgres.example:6543/postgres?sslmode=require',
      DATABASE_SSL: 'true',
      DATABASE_PREPARE: 'false',
      DATABASE_MAX_CONNECTIONS: '4',
    });

    expect(createDatabaseClientOptions(environment)).toEqual({
      max: 4,
      prepare: false,
    });
  });

  it('keeps local postgres.js options deterministic', () => {
    const environment = loadEnvironment({});

    expect(createDatabaseClientOptions(environment)).toEqual({
      max: 10,
      prepare: true,
    });
  });

  it('requires SSL when production config has no URL ssl mode', () => {
    const environment = loadEnvironment({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://postgres.example:5432/postgres',
      DATABASE_SSL: 'true',
    });

    expect(createDatabaseClientOptions(environment)).toEqual({
      max: 10,
      prepare: true,
      ssl: 'require',
    });
  });

  it('does not override an explicit URL certificate mode', () => {
    const environment = loadEnvironment({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://postgres.example:5432/postgres?sslmode=verify-full',
      DATABASE_SSL: 'true',
    });

    expect(createDatabaseClientOptions(environment)).toEqual({
      max: 10,
      prepare: true,
    });
  });

  it('passes Supabase connection options to postgres.js', () => {
    const environment = loadEnvironment({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://postgres.example:5432/postgres',
      DATABASE_SSL: 'true',
      DATABASE_PREPARE: 'false',
      DATABASE_MAX_CONNECTIONS: '4',
    });

    createDatabaseFromUrl(undefined, environment);

    expect(postgres).toHaveBeenCalledWith(environment.database.url, {
      max: 4,
      prepare: false,
      ssl: 'require',
    });
  });
});
