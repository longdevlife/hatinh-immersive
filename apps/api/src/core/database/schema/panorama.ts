import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { mediaAssets } from './media';

export const panoramaProjectionEnum = pgEnum('panorama_projection', ['equirectangular']);

export const panoramaQualityStatusEnum = pgEnum('panorama_quality_status', [
  'pending',
  'accepted',
  'rejected',
]);

export const panoramaRightsEnum = pgEnum('panorama_rights', ['customer-owned', 'licensed']);

export const panoramaAssetMetadata = pgTable(
  'panorama_asset_metadata',
  {
    mediaAssetId: uuid('media_asset_id').primaryKey(),
    projection: panoramaProjectionEnum('projection').notNull().default('equirectangular'),
    sourceWidthPx: integer('source_width_px'),
    sourceHeightPx: integer('source_height_px'),
    qualityStatus: panoramaQualityStatusEnum('quality_status').notNull().default('pending'),
    qualityCode: varchar('quality_code', { length: 120 }),
    manifestKey: varchar('manifest_key', { length: 512 }),
    previewKey: varchar('preview_key', { length: 512 }),
    rights: panoramaRightsEnum('rights').notNull(),
    rightsHolder: varchar('rights_holder', { length: 320 }).notNull(),
    rightsReference: varchar('rights_reference', { length: 512 }).notNull(),
    sourceReference: varchar('source_reference', { length: 512 }).notNull(),
    version: varchar('version', { length: 120 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    mediaAssetForeignKey: foreignKey({
      columns: [table.mediaAssetId],
      foreignColumns: [mediaAssets.id],
      name: 'panorama_asset_metadata_media_asset_fk',
    }).onDelete('restrict'),
    dimensionsInvariant: check(
      'panorama_asset_metadata_dimensions_check',
      sql`("source_width_px" IS NULL AND "source_height_px" IS NULL) OR
        ("source_width_px" > 0 AND "source_height_px" > 0)`,
    ),
    provenanceInvariant: check(
      'panorama_asset_metadata_provenance_check',
      sql`length(trim("rights_holder")) > 0 AND
        length(trim("rights_reference")) > 0 AND
        length(trim("source_reference")) > 0 AND
        length(trim("version")) > 0`,
    ),
    acceptedInvariant: check(
      'panorama_asset_metadata_accepted_check',
      sql`"quality_status" <> 'accepted' OR (
        "source_width_px" >= 4096 AND
        "source_height_px" >= 2048 AND
        "source_width_px" * 100 >= "source_height_px" * 195 AND
        "source_width_px" * 100 <= "source_height_px" * 205 AND
        "manifest_key" IS NOT NULL AND length(trim("manifest_key")) > 0 AND
        "preview_key" IS NOT NULL AND length(trim("preview_key")) > 0
      )`,
    ),
  }),
);

export type PanoramaAssetMetadataRow = typeof panoramaAssetMetadata.$inferSelect;
export type PanoramaAssetMetadataInsert = typeof panoramaAssetMetadata.$inferInsert;
