import {
  boolean,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { catalogDestinations } from './catalog';
import { geoPoint4326 } from './geometry';

export const virtualTourSceneStatusEnum = pgEnum('virtual_tour_scene_status', [
  'draft',
  'published',
  'archived',
]);

export const panoramaAssetStatusEnum = pgEnum('panorama_asset_status', [
  'pending',
  'uploaded',
  'processing',
  'ready',
  'failed',
]);

export const hotspotTypeEnum = pgEnum('hotspot_type', [
  'information',
  'media',
  'audio',
  'external',
]);

export const hotspotStatusEnum = pgEnum('hotspot_status', ['draft', 'published', 'archived']);

export const virtualTourScenes = pgTable(
  'virtual_tour_scenes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    destinationId: uuid('destination_id').notNull(),
    name: varchar('name', { length: 240 }).notNull(),
    geoPoint: geoPoint4326('geo_point').notNull(),
    altitude: doublePrecision('altitude'),
    panoramaAssetId: uuid('panorama_asset_id'),
    panoramaAssetStatus: panoramaAssetStatusEnum('panorama_asset_status'),
    initialHeading: doublePrecision('initial_heading').notNull().default(0),
    initialPitch: doublePrecision('initial_pitch').notNull().default(0),
    initialFov: doublePrecision('initial_fov').notNull().default(90),
    status: virtualTourSceneStatusEnum('status').notNull().default('draft'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    destinationForeignKey: foreignKey({
      columns: [table.destinationId],
      foreignColumns: [catalogDestinations.id],
      name: 'virtual_tour_scenes_destination_fk',
    }).onDelete('cascade'),
    destinationIndex: index('virtual_tour_scenes_destination_idx').on(
      table.destinationId,
      table.status,
    ),
  }),
);

export const virtualTourSceneLinks = pgTable(
  'virtual_tour_scene_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fromSceneId: uuid('from_scene_id').notNull(),
    toSceneId: uuid('to_scene_id').notNull(),
    yaw: doublePrecision('yaw').notNull(),
    pitch: doublePrecision('pitch').notNull(),
    bidirectional: boolean('bidirectional').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    fromSceneForeignKey: foreignKey({
      columns: [table.fromSceneId],
      foreignColumns: [virtualTourScenes.id],
      name: 'virtual_tour_scene_links_from_scene_fk',
    }).onDelete('cascade'),
    toSceneForeignKey: foreignKey({
      columns: [table.toSceneId],
      foreignColumns: [virtualTourScenes.id],
      name: 'virtual_tour_scene_links_to_scene_fk',
    }).onDelete('cascade'),
    scenePairUnique: uniqueIndex('virtual_tour_scene_links_pair_unique').on(
      table.fromSceneId,
      table.toSceneId,
    ),
    fromSceneIndex: index('virtual_tour_scene_links_from_scene_idx').on(table.fromSceneId),
  }),
);

export const virtualTourHotspots = pgTable(
  'virtual_tour_hotspots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sceneId: uuid('scene_id').notNull(),
    type: hotspotTypeEnum('type').notNull(),
    yaw: doublePrecision('yaw').notNull(),
    pitch: doublePrecision('pitch').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: hotspotStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sceneForeignKey: foreignKey({
      columns: [table.sceneId],
      foreignColumns: [virtualTourScenes.id],
      name: 'virtual_tour_hotspots_scene_fk',
    }).onDelete('cascade'),
    sceneIndex: index('virtual_tour_hotspots_scene_idx').on(table.sceneId, table.status),
  }),
);

export type VirtualTourSceneRow = typeof virtualTourScenes.$inferSelect;
export type VirtualTourSceneLinkRow = typeof virtualTourSceneLinks.$inferSelect;
export type VirtualTourHotspotRow = typeof virtualTourHotspots.$inferSelect;
