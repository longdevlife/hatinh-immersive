import {
  bigint,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const mediaAssetKindEnum = pgEnum('media_asset_kind', [
  'panorama',
  'image',
  'audio',
  'model3d',
]);

export const mediaAssetStatusEnum = pgEnum('media_asset_status', [
  'pending',
  'uploaded',
  'processing',
  'ready',
  'failed',
]);

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    mediaKind: mediaAssetKindEnum('media_kind').notNull(),
    originalFilename: varchar('original_filename', { length: 240 }).notNull(),
    contentType: varchar('content_type', { length: 160 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    status: mediaAssetStatusEnum('status').notNull().default('pending'),
    etag: varchar('etag', { length: 256 }),
    failureCode: varchar('failure_code', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
    readyAt: timestamp('ready_at', { withTimezone: true }),
  },
  (table) => ({
    storageKeyUnique: uniqueIndex('media_assets_storage_key_unique').on(table.storageKey),
    statusIndex: index('media_assets_status_idx').on(table.status),
  }),
);

export type MediaAssetRow = typeof mediaAssets.$inferSelect;
