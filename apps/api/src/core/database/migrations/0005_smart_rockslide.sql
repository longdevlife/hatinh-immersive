CREATE TYPE "public"."immersive_audio_kind" AS ENUM('ambient', 'narration');--> statement-breakpoint
CREATE TYPE "public"."immersive_audio_locale" AS ENUM('vi', 'en');--> statement-breakpoint
CREATE TYPE "public"."immersive_audio_publication_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."immersive_audio_rights" AS ENUM('customer-owned', 'licensed', 'demo-only');--> statement-breakpoint
CREATE TYPE "public"."immersive_transcript_timing_mode" AS ENUM('plain', 'timed');--> statement-breakpoint
CREATE TABLE "immersive_audio_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "immersive_audio_kind" NOT NULL,
	"locale" "immersive_audio_locale",
	"label" varchar(240) NOT NULL,
	"media_asset_id" uuid,
	"rights" "immersive_audio_rights" NOT NULL,
	"rights_holder" varchar(320),
	"rights_holder_inherited" boolean DEFAULT false NOT NULL,
	"rights_reference" varchar(512),
	"publication_status" "immersive_audio_publication_status" DEFAULT 'draft' NOT NULL,
	"duration_ms" integer,
	"voice_id" varchar(160),
	"version" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "immersive_audio_tracks_kind_locale_check" CHECK (("kind" = 'ambient' AND "locale" IS NULL) OR
        ("kind" = 'narration' AND "locale" IS NOT NULL)),
	CONSTRAINT "immersive_audio_tracks_ambient_voice_check" CHECK ("kind" = 'narration' OR "voice_id" IS NULL),
	CONSTRAINT "immersive_audio_tracks_duration_check" CHECK ("duration_ms" IS NULL OR "duration_ms" >= 0),
	CONSTRAINT "immersive_audio_tracks_rights_holder_inheritance_check" CHECK (NOT "rights_holder_inherited" OR "rights" = 'customer-owned'),
	CONSTRAINT "immersive_audio_tracks_licensed_provenance_check" CHECK ("rights" <> 'licensed' OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0 AND
          "rights_reference" IS NOT NULL AND length(trim("rights_reference")) > 0)),
	CONSTRAINT "immersive_audio_tracks_customer_owned_holder_check" CHECK ("rights" <> 'customer-owned' OR
        "rights_holder_inherited" OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0))
);
--> statement-breakpoint
CREATE TABLE "immersive_audio_transcript_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transcript_id" uuid NOT NULL,
	"start_ms" integer,
	"end_ms" integer,
	"sort_order" integer NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "immersive_audio_transcript_segments_start_check" CHECK ("start_ms" IS NULL OR "start_ms" >= 0),
	CONSTRAINT "immersive_audio_transcript_segments_end_check" CHECK ("end_ms" IS NULL OR "end_ms" >= 0),
	CONSTRAINT "immersive_audio_transcript_segments_order_check" CHECK ("sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "immersive_audio_transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" "immersive_audio_locale" NOT NULL,
	"title" varchar(240) NOT NULL,
	"timing_mode" "immersive_transcript_timing_mode" NOT NULL,
	"rights" "immersive_audio_rights" NOT NULL,
	"rights_holder" varchar(320),
	"rights_holder_inherited" boolean DEFAULT false NOT NULL,
	"rights_reference" varchar(512),
	"publication_status" "immersive_audio_publication_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "immersive_audio_transcripts_rights_holder_inheritance_check" CHECK (NOT "rights_holder_inherited" OR "rights" = 'customer-owned'),
	CONSTRAINT "immersive_audio_transcripts_licensed_provenance_check" CHECK ("rights" <> 'licensed' OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0 AND
          "rights_reference" IS NOT NULL AND length(trim("rights_reference")) > 0)),
	CONSTRAINT "immersive_audio_transcripts_customer_owned_holder_check" CHECK ("rights" <> 'customer-owned' OR
        "rights_holder_inherited" OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0))
);
--> statement-breakpoint
CREATE TABLE "immersive_destination_ambient_tracks" (
	"destination_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	CONSTRAINT "immersive_destination_ambient_tracks_pk" PRIMARY KEY("destination_id")
);
--> statement-breakpoint
CREATE TABLE "immersive_scene_ambient_overrides" (
	"scene_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	CONSTRAINT "immersive_scene_ambient_overrides_pk" PRIMARY KEY("scene_id")
);
--> statement-breakpoint
CREATE TABLE "immersive_scene_narrations" (
	"scene_id" uuid NOT NULL,
	"locale" "immersive_audio_locale" NOT NULL,
	"track_id" uuid,
	"transcript_id" uuid,
	CONSTRAINT "immersive_scene_narrations_pk" PRIMARY KEY("scene_id","locale"),
	CONSTRAINT "immersive_scene_narrations_target_required_check" CHECK ("track_id" IS NOT NULL OR "transcript_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "immersive_audio_tracks" ADD CONSTRAINT "immersive_audio_tracks_media_asset_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immersive_audio_transcript_segments" ADD CONSTRAINT "immersive_audio_transcript_segments_transcript_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."immersive_audio_transcripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immersive_destination_ambient_tracks" ADD CONSTRAINT "immersive_destination_ambient_tracks_destination_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."catalog_destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immersive_destination_ambient_tracks" ADD CONSTRAINT "immersive_destination_ambient_tracks_track_fk" FOREIGN KEY ("track_id") REFERENCES "public"."immersive_audio_tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immersive_scene_ambient_overrides" ADD CONSTRAINT "immersive_scene_ambient_overrides_scene_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."virtual_tour_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immersive_scene_ambient_overrides" ADD CONSTRAINT "immersive_scene_ambient_overrides_track_fk" FOREIGN KEY ("track_id") REFERENCES "public"."immersive_audio_tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immersive_scene_narrations" ADD CONSTRAINT "immersive_scene_narrations_scene_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."virtual_tour_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immersive_scene_narrations" ADD CONSTRAINT "immersive_scene_narrations_track_fk" FOREIGN KEY ("track_id") REFERENCES "public"."immersive_audio_tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immersive_scene_narrations" ADD CONSTRAINT "immersive_scene_narrations_transcript_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."immersive_audio_transcripts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "immersive_audio_tracks_media_asset_unique" ON "immersive_audio_tracks" USING btree ("media_asset_id");--> statement-breakpoint
CREATE INDEX "immersive_audio_tracks_publication_idx" ON "immersive_audio_tracks" USING btree ("publication_status","rights");--> statement-breakpoint
CREATE UNIQUE INDEX "immersive_audio_transcript_segments_order_unique" ON "immersive_audio_transcript_segments" USING btree ("transcript_id","sort_order");--> statement-breakpoint
CREATE INDEX "immersive_audio_transcript_segments_transcript_idx" ON "immersive_audio_transcript_segments" USING btree ("transcript_id");--> statement-breakpoint
CREATE INDEX "immersive_audio_transcripts_publication_idx" ON "immersive_audio_transcripts" USING btree ("publication_status","rights");--> statement-breakpoint
CREATE INDEX "immersive_destination_ambient_tracks_track_idx" ON "immersive_destination_ambient_tracks" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "immersive_scene_ambient_overrides_track_idx" ON "immersive_scene_ambient_overrides" USING btree ("track_id");--> statement-breakpoint
CREATE UNIQUE INDEX "immersive_scene_narrations_track_unique" ON "immersive_scene_narrations" USING btree ("track_id");--> statement-breakpoint
CREATE UNIQUE INDEX "immersive_scene_narrations_transcript_unique" ON "immersive_scene_narrations" USING btree ("transcript_id");--> statement-breakpoint
CREATE INDEX "immersive_scene_narrations_scene_idx" ON "immersive_scene_narrations" USING btree ("scene_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_immersive_audio_track_integrity() RETURNS trigger AS $$
DECLARE
  asset_kind text;
  asset_status text;
BEGIN
  IF NEW.media_asset_id IS NOT NULL THEN
    SELECT media_kind::text, status::text
      INTO asset_kind, asset_status
      FROM media_assets
      WHERE id = NEW.media_asset_id;

    IF asset_kind IS DISTINCT FROM 'audio' THEN
      RAISE EXCEPTION 'IMMERSIVE_AUDIO_MEDIA_ASSET_MUST_BE_AUDIO';
    END IF;

    IF NEW.publication_status::text = 'published'
      AND asset_status = 'ready'
      AND NULLIF(trim(NEW.version), '') IS NULL THEN
      RAISE EXCEPTION 'IMMERSIVE_AUDIO_PUBLISHED_READY_VERSION_REQUIRED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_immersive_audio_media_kind() RETURNS trigger AS $$
BEGIN
  IF NEW.media_kind::text <> 'audio'
    AND EXISTS (
      SELECT 1
      FROM immersive_audio_tracks
      WHERE media_asset_id = NEW.id
    ) THEN
    RAISE EXCEPTION 'IMMERSIVE_AUDIO_MEDIA_ASSET_KIND_IMMUTABLE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM immersive_audio_tracks AS track
    JOIN media_assets AS asset ON asset.id = track.media_asset_id
    WHERE asset.id = NEW.id
      AND asset.status::text = 'ready'
      AND track.publication_status::text = 'published'
      AND NULLIF(trim(track.version), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'IMMERSIVE_AUDIO_PUBLISHED_READY_VERSION_REQUIRED';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_immersive_destination_ambient_track() RETURNS trigger AS $$
DECLARE
  track_kind text;
  track_locale text;
BEGIN
  SELECT kind::text, locale::text
    INTO track_kind, track_locale
    FROM immersive_audio_tracks
    WHERE id = NEW.track_id;

  IF track_kind IS DISTINCT FROM 'ambient' OR track_locale IS NOT NULL THEN
    RAISE EXCEPTION 'IMMERSIVE_DESTINATION_AMBIENT_TRACK_INVALID';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_immersive_scene_ambient_track() RETURNS trigger AS $$
DECLARE
  track_kind text;
  track_locale text;
BEGIN
  SELECT kind::text, locale::text
    INTO track_kind, track_locale
    FROM immersive_audio_tracks
    WHERE id = NEW.track_id;

  IF track_kind IS DISTINCT FROM 'ambient' OR track_locale IS NOT NULL THEN
    RAISE EXCEPTION 'IMMERSIVE_SCENE_AMBIENT_TRACK_INVALID';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_immersive_scene_narration() RETURNS trigger AS $$
DECLARE
  track_kind text;
  track_locale text;
  transcript_locale text;
BEGIN
  IF NEW.track_id IS NULL AND NEW.transcript_id IS NULL THEN
    RAISE EXCEPTION 'IMMERSIVE_SCENE_NARRATION_TARGET_REQUIRED';
  END IF;

  IF NEW.track_id IS NOT NULL THEN
    SELECT kind::text, locale::text
      INTO track_kind, track_locale
      FROM immersive_audio_tracks
      WHERE id = NEW.track_id;

    IF track_kind IS DISTINCT FROM 'narration' OR track_locale IS DISTINCT FROM NEW.locale::text THEN
      RAISE EXCEPTION 'IMMERSIVE_SCENE_NARRATION_TRACK_LOCALE_INVALID';
    END IF;
  END IF;

  IF NEW.transcript_id IS NOT NULL THEN
    SELECT locale::text
      INTO transcript_locale
      FROM immersive_audio_transcripts
      WHERE id = NEW.transcript_id;

    IF transcript_locale IS DISTINCT FROM NEW.locale::text THEN
      RAISE EXCEPTION 'IMMERSIVE_SCENE_NARRATION_TRANSCRIPT_LOCALE_INVALID';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_immersive_transcript_timing() RETURNS trigger AS $$
DECLARE
  transcript_timing_mode text;
BEGIN
  SELECT t.timing_mode::text
    INTO transcript_timing_mode
    FROM immersive_audio_transcripts AS t
    WHERE t.id = NEW.transcript_id;

  IF transcript_timing_mode = 'plain' AND (NEW.start_ms IS NOT NULL OR NEW.end_ms IS NOT NULL) THEN
    RAISE EXCEPTION 'IMMERSIVE_TRANSCRIPT_PLAIN_TIMING_NOT_ALLOWED';
  END IF;

  IF transcript_timing_mode = 'timed' AND NEW.start_ms IS NULL THEN
    RAISE EXCEPTION 'IMMERSIVE_TRANSCRIPT_TIMED_START_REQUIRED';
  END IF;

  IF transcript_timing_mode = 'timed' AND NEW.end_ms IS NOT NULL AND NEW.end_ms <= NEW.start_ms THEN
    RAISE EXCEPTION 'IMMERSIVE_TRANSCRIPT_TIMED_RANGE_INVALID';
  END IF;

  IF transcript_timing_mode = 'timed' AND NEW.end_ms IS NULL
    AND EXISTS (
      SELECT 1
      FROM immersive_audio_transcript_segments
      WHERE transcript_id = NEW.transcript_id
        AND sort_order > NEW.sort_order
    ) THEN
    RAISE EXCEPTION 'IMMERSIVE_TRANSCRIPT_OPEN_SEGMENT_MUST_BE_FINAL';
  END IF;

  IF transcript_timing_mode = 'timed'
    AND EXISTS (
      SELECT 1
      FROM immersive_audio_transcript_segments existing
      WHERE existing.transcript_id = NEW.transcript_id
        AND existing.id <> NEW.id
        AND existing.start_ms IS NOT NULL
        AND existing.start_ms < COALESCE(NEW.end_ms, 2147483647)
        AND NEW.start_ms < COALESCE(existing.end_ms, 2147483647)
    ) THEN
    RAISE EXCEPTION 'IMMERSIVE_TRANSCRIPT_TIMED_SEGMENTS_OVERLAP';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_immersive_transcript_segments_for_mode() RETURNS trigger AS $$
DECLARE
  transcript_timing_mode text;
BEGIN
  SELECT t.timing_mode::text
    INTO transcript_timing_mode
    FROM immersive_audio_transcripts AS t
    WHERE t.id = NEW.id;

  IF transcript_timing_mode = 'plain'
    AND EXISTS (
      SELECT 1
      FROM immersive_audio_transcript_segments
      WHERE transcript_id = NEW.id
        AND (start_ms IS NOT NULL OR end_ms IS NOT NULL)
    ) THEN
    RAISE EXCEPTION 'IMMERSIVE_TRANSCRIPT_PLAIN_TIMING_NOT_ALLOWED';
  END IF;

  IF transcript_timing_mode = 'timed'
    AND EXISTS (
      SELECT 1
      FROM immersive_audio_transcript_segments
      WHERE transcript_id = NEW.id
        AND (start_ms IS NULL OR (end_ms IS NOT NULL AND end_ms <= start_ms))
    ) THEN
    RAISE EXCEPTION 'IMMERSIVE_TRANSCRIPT_TIMED_RANGE_INVALID';
  END IF;

  IF transcript_timing_mode = 'timed'
    AND EXISTS (
      SELECT 1
      FROM immersive_audio_transcript_segments segment
      WHERE segment.transcript_id = NEW.id
        AND segment.end_ms IS NULL
        AND EXISTS (
          SELECT 1
          FROM immersive_audio_transcript_segments later_segment
          WHERE later_segment.transcript_id = NEW.id
            AND later_segment.sort_order > segment.sort_order
        )
    ) THEN
    RAISE EXCEPTION 'IMMERSIVE_TRANSCRIPT_OPEN_SEGMENT_MUST_BE_FINAL';
  END IF;

  IF transcript_timing_mode = 'timed'
    AND EXISTS (
      SELECT 1
      FROM immersive_audio_transcript_segments segment
      JOIN immersive_audio_transcript_segments other_segment
        ON other_segment.transcript_id = segment.transcript_id
       AND other_segment.id <> segment.id
      WHERE segment.transcript_id = NEW.id
        AND segment.start_ms IS NOT NULL
        AND other_segment.start_ms IS NOT NULL
        AND segment.start_ms < COALESCE(other_segment.end_ms, 2147483647)
        AND other_segment.start_ms < COALESCE(segment.end_ms, 2147483647)
    ) THEN
    RAISE EXCEPTION 'IMMERSIVE_TRANSCRIPT_TIMED_SEGMENTS_OVERLAP';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER immersive_audio_tracks_integrity_trigger
AFTER INSERT OR UPDATE ON immersive_audio_tracks
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_immersive_audio_track_integrity();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER immersive_audio_media_kind_trigger
AFTER UPDATE OF media_kind, status ON media_assets
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_immersive_audio_media_kind();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER immersive_destination_ambient_track_trigger
AFTER INSERT OR UPDATE ON immersive_destination_ambient_tracks
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_immersive_destination_ambient_track();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER immersive_scene_ambient_track_trigger
AFTER INSERT OR UPDATE ON immersive_scene_ambient_overrides
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_immersive_scene_ambient_track();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER immersive_scene_narration_trigger
AFTER INSERT OR UPDATE ON immersive_scene_narrations
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_immersive_scene_narration();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER immersive_transcript_segment_timing_trigger
AFTER INSERT OR UPDATE ON immersive_audio_transcript_segments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_immersive_transcript_timing();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER immersive_transcript_mode_trigger
AFTER INSERT OR UPDATE ON immersive_audio_transcripts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_immersive_transcript_segments_for_mode();--> statement-breakpoint
