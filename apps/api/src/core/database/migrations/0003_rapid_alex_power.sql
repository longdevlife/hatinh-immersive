CREATE TYPE "public"."media_asset_kind" AS ENUM('panorama', 'image', 'audio', 'model3d');--> statement-breakpoint
CREATE TYPE "public"."media_asset_status" AS ENUM('pending', 'uploaded', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_kind" "media_asset_kind" NOT NULL,
	"original_filename" varchar(240) NOT NULL,
	"content_type" varchar(160) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"status" "media_asset_status" DEFAULT 'pending' NOT NULL,
	"etag" varchar(256),
	"failure_code" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_at" timestamp with time zone,
	"ready_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_storage_key_unique" ON "media_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "media_assets_status_idx" ON "media_assets" USING btree ("status");