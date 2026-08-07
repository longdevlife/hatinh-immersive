import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/core/database/schema/**/*.ts',
  out: './src/core/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive',
  },
  strict: true,
  verbose: true,
});
