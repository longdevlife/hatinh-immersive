import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://hatinh:hatinh@127.0.0.1:55432/hatinh_immersive'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  S3_ENDPOINT: z.string().url().default('http://127.0.0.1:59000'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().min(1).default('hatinh'),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default('hatinhminio'),
  S3_BUCKET: z
    .string()
    .regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/)
    .default('hatinh-immersive-media'),
  S3_FORCE_PATH_STYLE: z
    .preprocess(
      (value) => (typeof value === 'string' ? value.toLowerCase() === 'true' : value),
      z.boolean(),
    )
    .default(true),
  S3_PRESIGN_EXPIRES_SECONDS: z.coerce.number().int().min(60).max(900).default(600),
  MEDIA_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(500 * 1024 * 1024),
});

export interface AppEnvironment {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  host: string;
  databaseUrl: string;
  corsOrigins: string[];
  rateLimitMax: number;
  rateLimitWindow: string;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  storage: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    forcePathStyle: boolean;
    presignExpiresInSeconds: number;
  };
  mediaMaxBytes: number;
}

export function loadEnvironment(env: NodeJS.ProcessEnv = process.env): AppEnvironment {
  const parsed = environmentSchema.parse(env);

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    host: parsed.HOST,
    databaseUrl: parsed.DATABASE_URL,
    corsOrigins: parsed.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    rateLimitMax: parsed.RATE_LIMIT_MAX,
    rateLimitWindow: parsed.RATE_LIMIT_WINDOW,
    logLevel: parsed.LOG_LEVEL,
    storage: {
      endpoint: parsed.S3_ENDPOINT,
      region: parsed.S3_REGION,
      accessKeyId: parsed.S3_ACCESS_KEY_ID,
      secretAccessKey: parsed.S3_SECRET_ACCESS_KEY,
      bucket: parsed.S3_BUCKET,
      forcePathStyle: parsed.S3_FORCE_PATH_STYLE,
      presignExpiresInSeconds: parsed.S3_PRESIGN_EXPIRES_SECONDS,
    },
    mediaMaxBytes: parsed.MEDIA_MAX_BYTES,
  };
}
