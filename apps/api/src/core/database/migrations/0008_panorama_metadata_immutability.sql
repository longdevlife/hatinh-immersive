CREATE OR REPLACE FUNCTION prevent_ready_panorama_metadata_mutation() RETURNS trigger AS $$
DECLARE
  owning_asset_status text;
BEGIN
  SELECT status::text
    INTO owning_asset_status
    FROM media_assets
    WHERE id = OLD.media_asset_id;

  IF OLD.quality_status::text = 'accepted'
    AND owning_asset_status = 'ready' THEN
    RAISE EXCEPTION 'PANORAMA_READY_METADATA_IMMUTABLE';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER panorama_ready_metadata_immutable_trigger
BEFORE UPDATE OR DELETE ON panorama_asset_metadata
FOR EACH ROW EXECUTE FUNCTION prevent_ready_panorama_metadata_mutation();
