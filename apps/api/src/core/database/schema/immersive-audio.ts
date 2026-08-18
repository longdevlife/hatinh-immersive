import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { catalogDestinations } from './catalog';
import { mediaAssets } from './media';
import { virtualTourScenes } from './virtual-tour';

export const immersiveAudioKindEnum = pgEnum('immersive_audio_kind', ['ambient', 'narration']);

export const immersiveAudioLocaleEnum = pgEnum('immersive_audio_locale', ['vi', 'en']);

export const immersiveAudioRightsEnum = pgEnum('immersive_audio_rights', [
  'customer-owned',
  'licensed',
  'demo-only',
]);

export const immersiveAudioPublicationStatusEnum = pgEnum('immersive_audio_publication_status', [
  'draft',
  'published',
]);

export const immersiveTranscriptTimingModeEnum = pgEnum('immersive_transcript_timing_mode', [
  'plain',
  'timed',
]);

export const immersiveAudioTracks = pgTable(
  'immersive_audio_tracks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: immersiveAudioKindEnum('kind').notNull(),
    locale: immersiveAudioLocaleEnum('locale'),
    label: varchar('label', { length: 240 }).notNull(),
    mediaAssetId: uuid('media_asset_id'),
    rights: immersiveAudioRightsEnum('rights').notNull(),
    rightsHolder: varchar('rights_holder', { length: 320 }),
    rightsHolderInherited: boolean('rights_holder_inherited').notNull().default(false),
    rightsReference: varchar('rights_reference', { length: 512 }),
    publicationStatus: immersiveAudioPublicationStatusEnum('publication_status')
      .notNull()
      .default('draft'),
    durationMs: integer('duration_ms'),
    voiceId: varchar('voice_id', { length: 160 }),
    version: varchar('version', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    mediaAssetForeignKey: foreignKey({
      columns: [table.mediaAssetId],
      foreignColumns: [mediaAssets.id],
      name: 'immersive_audio_tracks_media_asset_fk',
    }).onDelete('restrict'),
    mediaAssetUnique: uniqueIndex('immersive_audio_tracks_media_asset_unique').on(
      table.mediaAssetId,
    ),
    publicationIndex: index('immersive_audio_tracks_publication_idx').on(
      table.publicationStatus,
      table.rights,
    ),
    kindLocaleInvariant: check(
      'immersive_audio_tracks_kind_locale_check',
      sql`("kind" = 'ambient' AND "locale" IS NULL) OR
        ("kind" = 'narration' AND "locale" IS NOT NULL)`,
    ),
    ambientVoiceInvariant: check(
      'immersive_audio_tracks_ambient_voice_check',
      sql`"kind" = 'narration' OR "voice_id" IS NULL`,
    ),
    durationInvariant: check(
      'immersive_audio_tracks_duration_check',
      sql`"duration_ms" IS NULL OR "duration_ms" >= 0`,
    ),
    rightsHolderInheritanceInvariant: check(
      'immersive_audio_tracks_rights_holder_inheritance_check',
      sql`NOT "rights_holder_inherited" OR "rights" = 'customer-owned'`,
    ),
    licensedProvenanceInvariant: check(
      'immersive_audio_tracks_licensed_provenance_check',
      sql`"rights" <> 'licensed' OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0 AND
          "rights_reference" IS NOT NULL AND length(trim("rights_reference")) > 0)`,
    ),
    customerOwnedHolderInvariant: check(
      'immersive_audio_tracks_customer_owned_holder_check',
      sql`"rights" <> 'customer-owned' OR
        "rights_holder_inherited" OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0)`,
    ),
  }),
);

export const immersiveDestinationAmbientTracks = pgTable(
  'immersive_destination_ambient_tracks',
  {
    destinationId: uuid('destination_id').notNull(),
    trackId: uuid('track_id').notNull(),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.destinationId],
      name: 'immersive_destination_ambient_tracks_pk',
    }),
    destinationForeignKey: foreignKey({
      columns: [table.destinationId],
      foreignColumns: [catalogDestinations.id],
      name: 'immersive_destination_ambient_tracks_destination_fk',
    }).onDelete('cascade'),
    trackForeignKey: foreignKey({
      columns: [table.trackId],
      foreignColumns: [immersiveAudioTracks.id],
      name: 'immersive_destination_ambient_tracks_track_fk',
    }).onDelete('restrict'),
    trackIndex: index('immersive_destination_ambient_tracks_track_idx').on(table.trackId),
  }),
);

export const immersiveSceneAmbientOverrides = pgTable(
  'immersive_scene_ambient_overrides',
  {
    sceneId: uuid('scene_id').notNull(),
    trackId: uuid('track_id').notNull(),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.sceneId],
      name: 'immersive_scene_ambient_overrides_pk',
    }),
    sceneForeignKey: foreignKey({
      columns: [table.sceneId],
      foreignColumns: [virtualTourScenes.id],
      name: 'immersive_scene_ambient_overrides_scene_fk',
    }).onDelete('cascade'),
    trackForeignKey: foreignKey({
      columns: [table.trackId],
      foreignColumns: [immersiveAudioTracks.id],
      name: 'immersive_scene_ambient_overrides_track_fk',
    }).onDelete('restrict'),
    trackIndex: index('immersive_scene_ambient_overrides_track_idx').on(table.trackId),
  }),
);

export const immersiveAudioTranscripts = pgTable(
  'immersive_audio_transcripts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    locale: immersiveAudioLocaleEnum('locale').notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    timingMode: immersiveTranscriptTimingModeEnum('timing_mode').notNull(),
    rights: immersiveAudioRightsEnum('rights').notNull(),
    rightsHolder: varchar('rights_holder', { length: 320 }),
    rightsHolderInherited: boolean('rights_holder_inherited').notNull().default(false),
    rightsReference: varchar('rights_reference', { length: 512 }),
    publicationStatus: immersiveAudioPublicationStatusEnum('publication_status')
      .notNull()
      .default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    publicationIndex: index('immersive_audio_transcripts_publication_idx').on(
      table.publicationStatus,
      table.rights,
    ),
    rightsHolderInheritanceInvariant: check(
      'immersive_audio_transcripts_rights_holder_inheritance_check',
      sql`NOT "rights_holder_inherited" OR "rights" = 'customer-owned'`,
    ),
    licensedProvenanceInvariant: check(
      'immersive_audio_transcripts_licensed_provenance_check',
      sql`"rights" <> 'licensed' OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0 AND
          "rights_reference" IS NOT NULL AND length(trim("rights_reference")) > 0)`,
    ),
    customerOwnedHolderInvariant: check(
      'immersive_audio_transcripts_customer_owned_holder_check',
      sql`"rights" <> 'customer-owned' OR
        "rights_holder_inherited" OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0)`,
    ),
  }),
);

export const immersiveAudioTranscriptSegments = pgTable(
  'immersive_audio_transcript_segments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    transcriptId: uuid('transcript_id').notNull(),
    startMs: integer('start_ms'),
    endMs: integer('end_ms'),
    sortOrder: integer('sort_order').notNull(),
    text: text('text').notNull(),
  },
  (table) => ({
    transcriptForeignKey: foreignKey({
      columns: [table.transcriptId],
      foreignColumns: [immersiveAudioTranscripts.id],
      name: 'immersive_audio_transcript_segments_transcript_fk',
    }).onDelete('cascade'),
    orderUnique: uniqueIndex('immersive_audio_transcript_segments_order_unique').on(
      table.transcriptId,
      table.sortOrder,
    ),
    transcriptIndex: index('immersive_audio_transcript_segments_transcript_idx').on(
      table.transcriptId,
    ),
    startInvariant: check(
      'immersive_audio_transcript_segments_start_check',
      sql`"start_ms" IS NULL OR "start_ms" >= 0`,
    ),
    endInvariant: check(
      'immersive_audio_transcript_segments_end_check',
      sql`"end_ms" IS NULL OR "end_ms" >= 0`,
    ),
    orderInvariant: check(
      'immersive_audio_transcript_segments_order_check',
      sql`"sort_order" >= 0`,
    ),
  }),
);

export const immersiveSceneNarrations = pgTable(
  'immersive_scene_narrations',
  {
    sceneId: uuid('scene_id').notNull(),
    locale: immersiveAudioLocaleEnum('locale').notNull(),
    trackId: uuid('track_id'),
    transcriptId: uuid('transcript_id'),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.sceneId, table.locale],
      name: 'immersive_scene_narrations_pk',
    }),
    sceneForeignKey: foreignKey({
      columns: [table.sceneId],
      foreignColumns: [virtualTourScenes.id],
      name: 'immersive_scene_narrations_scene_fk',
    }).onDelete('cascade'),
    trackForeignKey: foreignKey({
      columns: [table.trackId],
      foreignColumns: [immersiveAudioTracks.id],
      name: 'immersive_scene_narrations_track_fk',
    }).onDelete('restrict'),
    transcriptForeignKey: foreignKey({
      columns: [table.transcriptId],
      foreignColumns: [immersiveAudioTranscripts.id],
      name: 'immersive_scene_narrations_transcript_fk',
    }).onDelete('restrict'),
    trackUnique: uniqueIndex('immersive_scene_narrations_track_unique').on(table.trackId),
    transcriptUnique: uniqueIndex('immersive_scene_narrations_transcript_unique').on(
      table.transcriptId,
    ),
    sceneIndex: index('immersive_scene_narrations_scene_idx').on(table.sceneId),
    targetRequired: check(
      'immersive_scene_narrations_target_required_check',
      sql`"track_id" IS NOT NULL OR "transcript_id" IS NOT NULL`,
    ),
  }),
);

export type ImmersiveAudioTrackRow = typeof immersiveAudioTracks.$inferSelect;
export type ImmersiveDestinationAmbientTrackRow =
  typeof immersiveDestinationAmbientTracks.$inferSelect;
export type ImmersiveSceneAmbientOverrideRow = typeof immersiveSceneAmbientOverrides.$inferSelect;
export type ImmersiveAudioTranscriptRow = typeof immersiveAudioTranscripts.$inferSelect;
export type ImmersiveAudioTranscriptSegmentRow =
  typeof immersiveAudioTranscriptSegments.$inferSelect;
export type ImmersiveSceneNarrationRow = typeof immersiveSceneNarrations.$inferSelect;
