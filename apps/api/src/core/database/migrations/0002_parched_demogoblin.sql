CREATE TYPE "public"."hotspot_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."hotspot_type" AS ENUM('information', 'media', 'audio', 'external');--> statement-breakpoint
CREATE TYPE "public"."panorama_asset_status" AS ENUM('pending', 'uploaded', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."virtual_tour_scene_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "virtual_tour_hotspots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"type" "hotspot_type" NOT NULL,
	"yaw" double precision NOT NULL,
	"pitch" double precision NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "hotspot_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "virtual_tour_scene_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_scene_id" uuid NOT NULL,
	"to_scene_id" uuid NOT NULL,
	"yaw" double precision NOT NULL,
	"pitch" double precision NOT NULL,
	"bidirectional" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "virtual_tour_scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"name" varchar(240) NOT NULL,
	"geo_point" geometry(Point,4326) NOT NULL,
	"altitude" double precision,
	"panorama_asset_id" uuid,
	"panorama_asset_status" "panorama_asset_status",
	"initial_heading" double precision DEFAULT 0 NOT NULL,
	"initial_pitch" double precision DEFAULT 0 NOT NULL,
	"initial_fov" double precision DEFAULT 90 NOT NULL,
	"status" "virtual_tour_scene_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "virtual_tour_hotspots" ADD CONSTRAINT "virtual_tour_hotspots_scene_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."virtual_tour_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_tour_scene_links" ADD CONSTRAINT "virtual_tour_scene_links_from_scene_fk" FOREIGN KEY ("from_scene_id") REFERENCES "public"."virtual_tour_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_tour_scene_links" ADD CONSTRAINT "virtual_tour_scene_links_to_scene_fk" FOREIGN KEY ("to_scene_id") REFERENCES "public"."virtual_tour_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_tour_scenes" ADD CONSTRAINT "virtual_tour_scenes_destination_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."catalog_destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "virtual_tour_hotspots_scene_idx" ON "virtual_tour_hotspots" USING btree ("scene_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "virtual_tour_scene_links_pair_unique" ON "virtual_tour_scene_links" USING btree ("from_scene_id","to_scene_id");--> statement-breakpoint
CREATE INDEX "virtual_tour_scene_links_from_scene_idx" ON "virtual_tour_scene_links" USING btree ("from_scene_id");--> statement-breakpoint
CREATE INDEX "virtual_tour_scenes_destination_idx" ON "virtual_tour_scenes" USING btree ("destination_id","status");