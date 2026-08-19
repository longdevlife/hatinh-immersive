ALTER TABLE "panorama_asset_metadata" DROP CONSTRAINT "panorama_asset_metadata_accepted_check";--> statement-breakpoint
UPDATE "virtual_tour_scenes" AS scene
SET
  "status" = 'draft'::virtual_tour_scene_status,
  "panorama_asset_status" = 'failed'::panorama_asset_status,
  "updated_at" = now()
FROM "panorama_asset_metadata" AS metadata
WHERE scene."panorama_asset_id" = metadata."media_asset_id"
  AND metadata."quality_status" = 'accepted'::panorama_quality_status
  AND (
    metadata."manifest_key" IS DISTINCT FROM
      'processed/panorama/' || metadata."media_asset_id"::text || '/manifest.json'
    OR metadata."preview_key" IS DISTINCT FROM
      'processed/panorama/' || metadata."media_asset_id"::text || '/preview.webp'
  );--> statement-breakpoint
UPDATE "panorama_asset_metadata"
SET
  "quality_status" = 'rejected'::panorama_quality_status,
  "quality_code" = 'PANORAMA_DERIVATIVE_NAMESPACE_INVALID',
  "manifest_key" = NULL,
  "preview_key" = NULL,
  "updated_at" = now()
WHERE "quality_status" = 'accepted'::panorama_quality_status
  AND (
    "manifest_key" IS DISTINCT FROM
      'processed/panorama/' || "media_asset_id"::text || '/manifest.json'
    OR "preview_key" IS DISTINCT FROM
      'processed/panorama/' || "media_asset_id"::text || '/preview.webp'
  );--> statement-breakpoint
SET CONSTRAINTS ALL IMMEDIATE;--> statement-breakpoint
ALTER TABLE "panorama_asset_metadata" ADD CONSTRAINT "panorama_asset_metadata_accepted_check" CHECK ("quality_status" <> 'accepted' OR (
        "source_width_px" >= 4096 AND
        "source_height_px" >= 2048 AND
        "source_width_px" * 100 >= "source_height_px" * 195 AND
        "source_width_px" * 100 <= "source_height_px" * 205 AND
        "manifest_key" = 'processed/panorama/' || "media_asset_id"::text || '/manifest.json' AND
        "preview_key" = 'processed/panorama/' || "media_asset_id"::text || '/preview.webp'
      ));
