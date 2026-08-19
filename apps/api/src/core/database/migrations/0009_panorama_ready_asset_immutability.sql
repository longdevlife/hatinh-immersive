CREATE OR REPLACE FUNCTION prevent_ready_panorama_asset_reprocessing() RETURNS trigger AS $$
BEGIN
  IF OLD.status::text = 'ready'
    AND NEW.status::text <> 'ready'
    AND EXISTS (
      SELECT 1
      FROM panorama_asset_metadata AS metadata
      WHERE metadata.media_asset_id = OLD.id
        AND metadata.quality_status::text = 'accepted'
    ) THEN
    RAISE EXCEPTION 'PANORAMA_READY_ASSET_IMMUTABLE';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER panorama_ready_asset_immutable_trigger
BEFORE UPDATE OF status ON media_assets
FOR EACH ROW EXECUTE FUNCTION prevent_ready_panorama_asset_reprocessing();
