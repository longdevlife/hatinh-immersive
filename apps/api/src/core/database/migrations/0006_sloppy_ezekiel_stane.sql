CREATE TYPE "public"."panorama_projection" AS ENUM('equirectangular');--> statement-breakpoint
CREATE TYPE "public"."panorama_quality_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."panorama_rights" AS ENUM('customer-owned', 'licensed');--> statement-breakpoint
CREATE TABLE "panorama_asset_metadata" (
	"media_asset_id" uuid PRIMARY KEY NOT NULL,
	"projection" "panorama_projection" DEFAULT 'equirectangular' NOT NULL,
	"source_width_px" integer,
	"source_height_px" integer,
	"quality_status" "panorama_quality_status" DEFAULT 'pending' NOT NULL,
	"quality_code" varchar(120),
	"manifest_key" varchar(512),
	"preview_key" varchar(512),
	"rights" "panorama_rights" NOT NULL,
	"rights_holder" varchar(320) NOT NULL,
	"rights_reference" varchar(512) NOT NULL,
	"source_reference" varchar(512) NOT NULL,
	"version" varchar(120) NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "panorama_asset_metadata_dimensions_check" CHECK (("source_width_px" IS NULL AND "source_height_px" IS NULL) OR
        ("source_width_px" > 0 AND "source_height_px" > 0)),
	CONSTRAINT "panorama_asset_metadata_provenance_check" CHECK (length(trim("rights_holder")) > 0 AND
        length(trim("rights_reference")) > 0 AND
        length(trim("source_reference")) > 0 AND
        length(trim("version")) > 0),
	CONSTRAINT "panorama_asset_metadata_accepted_check" CHECK ("quality_status" <> 'accepted' OR (
        "source_width_px" >= 4096 AND
        "source_height_px" >= 2048 AND
        "source_width_px" * 100 >= "source_height_px" * 195 AND
        "source_width_px" * 100 <= "source_height_px" * 205 AND
        "manifest_key" IS NOT NULL AND length(trim("manifest_key")) > 0 AND
        "preview_key" IS NOT NULL AND length(trim("preview_key")) > 0
      ))
);
--> statement-breakpoint
ALTER TABLE "panorama_asset_metadata" ADD CONSTRAINT "panorama_asset_metadata_media_asset_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_panorama_metadata_integrity() RETURNS trigger AS $$
DECLARE
  asset_kind text;
  asset_status text;
BEGIN
  SELECT media_kind::text, status::text
    INTO asset_kind, asset_status
    FROM media_assets
    WHERE id = NEW.media_asset_id;

  IF asset_kind IS DISTINCT FROM 'panorama' THEN
    RAISE EXCEPTION 'PANORAMA_METADATA_MEDIA_ASSET_MUST_BE_PANORAMA';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM virtual_tour_scenes
    WHERE panorama_asset_id = NEW.media_asset_id
      AND status::text = 'published'
  ) AND (
    asset_status IS DISTINCT FROM 'ready'
    OR NEW.quality_status::text IS DISTINCT FROM 'accepted'
    OR NULLIF(trim(NEW.manifest_key), '') IS NULL
    OR NULLIF(trim(NEW.preview_key), '') IS NULL
    OR NULLIF(trim(NEW.rights_holder), '') IS NULL
    OR NULLIF(trim(NEW.rights_reference), '') IS NULL
    OR NULLIF(trim(NEW.source_reference), '') IS NULL
    OR NULLIF(trim(NEW.version), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'VIRTUAL_TOUR_SCENE_PANORAMA_NOT_PUBLICATION_READY';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_panorama_metadata_delete() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM virtual_tour_scenes
    WHERE panorama_asset_id = OLD.media_asset_id
      AND status::text = 'published'
  ) THEN
    RAISE EXCEPTION 'VIRTUAL_TOUR_SCENE_PANORAMA_NOT_PUBLICATION_READY';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_virtual_tour_scene_panorama_integrity() RETURNS trigger AS $$
BEGIN
  IF NEW.status::text = 'published' AND NOT EXISTS (
    SELECT 1
    FROM media_assets AS asset
    JOIN panorama_asset_metadata AS metadata
      ON metadata.media_asset_id = asset.id
    WHERE asset.id = NEW.panorama_asset_id
      AND asset.media_kind::text = 'panorama'
      AND asset.status::text = 'ready'
      AND NEW.panorama_asset_status::text = 'ready'
      AND metadata.quality_status::text = 'accepted'
      AND NULLIF(trim(metadata.manifest_key), '') IS NOT NULL
      AND NULLIF(trim(metadata.preview_key), '') IS NOT NULL
      AND NULLIF(trim(metadata.rights_holder), '') IS NOT NULL
      AND NULLIF(trim(metadata.rights_reference), '') IS NOT NULL
      AND NULLIF(trim(metadata.source_reference), '') IS NOT NULL
      AND NULLIF(trim(metadata.version), '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'VIRTUAL_TOUR_SCENE_PANORAMA_NOT_PUBLICATION_READY';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_panorama_media_asset_dependents() RETURNS trigger AS $$
BEGIN
  IF NEW.media_kind::text <> 'panorama'
    AND EXISTS (
      SELECT 1 FROM panorama_asset_metadata WHERE media_asset_id = NEW.id
    ) THEN
    RAISE EXCEPTION 'PANORAMA_METADATA_MEDIA_ASSET_MUST_BE_PANORAMA';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM virtual_tour_scenes AS scene
    JOIN panorama_asset_metadata AS metadata
      ON metadata.media_asset_id = scene.panorama_asset_id
    WHERE scene.panorama_asset_id = NEW.id
      AND scene.status::text = 'published'
      AND (
        NEW.media_kind::text <> 'panorama'
        OR NEW.status::text <> 'ready'
        OR metadata.quality_status::text <> 'accepted'
      )
  ) THEN
    RAISE EXCEPTION 'VIRTUAL_TOUR_SCENE_PANORAMA_NOT_PUBLICATION_READY';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER panorama_metadata_integrity_trigger
AFTER INSERT OR UPDATE ON panorama_asset_metadata
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_panorama_metadata_integrity();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER panorama_metadata_delete_trigger
AFTER DELETE ON panorama_asset_metadata
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_panorama_metadata_delete();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER virtual_tour_scene_panorama_integrity_trigger
AFTER INSERT OR UPDATE OF panorama_asset_id, panorama_asset_status, status ON virtual_tour_scenes
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_virtual_tour_scene_panorama_integrity();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER panorama_media_asset_dependents_trigger
AFTER UPDATE OF media_kind, status ON media_assets
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_panorama_media_asset_dependents();
