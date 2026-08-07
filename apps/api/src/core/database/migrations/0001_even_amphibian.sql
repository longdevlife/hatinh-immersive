CREATE TYPE "public"."destination_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "catalog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"label" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_destination_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"name" varchar(240) NOT NULL,
	"summary" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"status" "destination_status" DEFAULT 'draft' NOT NULL,
	"category_id" uuid,
	"geo_point" geometry(Point,4326),
	"default_scene_id" uuid,
	"cover_media_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_destination_translations" ADD CONSTRAINT "catalog_destination_translations_destination_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."catalog_destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_destinations" ADD CONSTRAINT "catalog_destinations_category_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_categories_slug_unique" ON "catalog_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_destination_translations_locale_unique" ON "catalog_destination_translations" USING btree ("destination_id","locale");--> statement-breakpoint
CREATE INDEX "catalog_destination_translations_destination_idx" ON "catalog_destination_translations" USING btree ("destination_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_destinations_slug_unique" ON "catalog_destinations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalog_destinations_status_idx" ON "catalog_destinations" USING btree ("status");
