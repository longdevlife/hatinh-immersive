ALTER TABLE "immersive_audio_tracks" DROP CONSTRAINT "immersive_audio_tracks_licensed_provenance_check";--> statement-breakpoint
ALTER TABLE "immersive_audio_tracks" DROP CONSTRAINT "immersive_audio_tracks_customer_owned_holder_check";--> statement-breakpoint
ALTER TABLE "immersive_audio_transcripts" DROP CONSTRAINT "immersive_audio_transcripts_licensed_provenance_check";--> statement-breakpoint
ALTER TABLE "immersive_audio_transcripts" DROP CONSTRAINT "immersive_audio_transcripts_customer_owned_holder_check";--> statement-breakpoint
ALTER TABLE "immersive_audio_tracks" ADD CONSTRAINT "immersive_audio_tracks_licensed_provenance_check" CHECK ("rights" <> 'licensed' OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0 AND
          "rights_reference" IS NOT NULL AND length(trim("rights_reference")) > 0));--> statement-breakpoint
ALTER TABLE "immersive_audio_tracks" ADD CONSTRAINT "immersive_audio_tracks_customer_owned_holder_check" CHECK ("rights" <> 'customer-owned' OR
        "rights_holder_inherited" OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0));--> statement-breakpoint
ALTER TABLE "immersive_audio_transcripts" ADD CONSTRAINT "immersive_audio_transcripts_licensed_provenance_check" CHECK ("rights" <> 'licensed' OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0 AND
          "rights_reference" IS NOT NULL AND length(trim("rights_reference")) > 0));--> statement-breakpoint
ALTER TABLE "immersive_audio_transcripts" ADD CONSTRAINT "immersive_audio_transcripts_customer_owned_holder_check" CHECK ("rights" <> 'customer-owned' OR
        "rights_holder_inherited" OR
        ("rights_holder" IS NOT NULL AND length(trim("rights_holder")) > 0));