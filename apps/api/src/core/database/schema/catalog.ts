import {
  index,
  foreignKey,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';

import { geoPoint4326 } from './geometry';

export const destinationStatusEnum = pgEnum('destination_status', [
  'draft',
  'published',
  'archived',
]);

export const catalogCategories = pgTable(
  'catalog_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 160 }).notNull(),
    label: varchar('label', { length: 160 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('catalog_categories_slug_unique').on(table.slug),
  }),
);

export const catalogDestinations = pgTable(
  'catalog_destinations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 160 }).notNull(),
    status: destinationStatusEnum('status').notNull().default('draft'),
    categoryId: uuid('category_id'),
    geoPoint: geoPoint4326('geo_point'),
    defaultSceneId: uuid('default_scene_id'),
    coverMediaId: uuid('cover_media_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryForeignKey: foreignKey({
      columns: [table.categoryId],
      foreignColumns: [catalogCategories.id],
      name: 'catalog_destinations_category_fk',
    }).onDelete('set null'),
    slugUnique: uniqueIndex('catalog_destinations_slug_unique').on(table.slug),
    statusIndex: index('catalog_destinations_status_idx').on(table.status),
  }),
);

export const catalogDestinationTranslations = pgTable(
  'catalog_destination_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    destinationId: uuid('destination_id').notNull(),
    locale: varchar('locale', { length: 10 }).notNull(),
    name: varchar('name', { length: 240 }).notNull(),
    summary: text('summary').notNull(),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    destinationForeignKey: foreignKey({
      columns: [table.destinationId],
      foreignColumns: [catalogDestinations.id],
      name: 'catalog_destination_translations_destination_fk',
    }).onDelete('cascade'),
    destinationLocaleUnique: uniqueIndex('catalog_destination_translations_locale_unique').on(
      table.destinationId,
      table.locale,
    ),
    destinationIndex: index('catalog_destination_translations_destination_idx').on(
      table.destinationId,
    ),
  }),
);

export type CatalogCategoryRow = typeof catalogCategories.$inferSelect;
export type CatalogDestinationRow = typeof catalogDestinations.$inferSelect;
export type CatalogDestinationTranslationRow = typeof catalogDestinationTranslations.$inferSelect;
