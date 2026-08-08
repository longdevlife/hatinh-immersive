import { describe, expect, it } from 'vitest';

import { loadEnvironment } from './environment';

describe('database environment configuration', () => {
  it('keeps deterministic local database defaults', () => {
    const environment = loadEnvironment({});

    expect(environment.database).toEqual({
      url: 'postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive',
      ssl: false,
      prepare: true,
      maxConnections: 10,
    });
  });

  it('supports a Supabase SSL connection', () => {
    const environment = loadEnvironment({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://postgres.example:5432/postgres?sslmode=require',
      DATABASE_SSL: 'true',
    });

    expect(environment.database).toEqual({
      url: 'postgresql://postgres.example:5432/postgres?sslmode=require',
      ssl: true,
      prepare: true,
      maxConnections: 10,
    });
  });

  it('supports Supabase transaction pooler settings', () => {
    const environment = loadEnvironment({
      DATABASE_URL: 'postgresql://postgres.example:6543/postgres?sslmode=require',
      DATABASE_SSL: 'true',
      DATABASE_PREPARE: 'false',
      DATABASE_MAX_CONNECTIONS: '4',
    });

    expect(environment.database).toEqual({
      url: 'postgresql://postgres.example:6543/postgres?sslmode=require',
      ssl: true,
      prepare: false,
      maxConnections: 4,
    });
  });

  it('rejects production without database SSL', () => {
    expect(() =>
      loadEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres.example:5432/postgres',
      }),
    ).toThrow(/DATABASE_SSL/);
  });

  it.each([
    ['DATABASE_SSL', { DATABASE_SSL: 'maybe' }],
    ['DATABASE_PREPARE', { DATABASE_PREPARE: 'maybe' }],
  ])('rejects invalid %s values', (_name, env) => {
    expect(() => loadEnvironment(env)).toThrow();
  });
});
