-- ==============================================================================
-- GALLOTRACK: ADD FARM SETTINGS COLUMNS + SYNC TRIGGER (idempotent)
-- ==============================================================================
-- Adds farm_location and farm_description to the farms table so that
-- owner settings are persisted to Supabase instead of localStorage only.
--
-- Adds a trigger that keeps profiles.farm_name in sync with farms.farm_name
-- so that denormalized reads from profiles always reflect the source of truth.
-- ==============================================================================

-- ==============================================================================
-- 1. FARMS: add optional settings columns
-- ==============================================================================
ALTER TABLE farms ADD COLUMN IF NOT EXISTS farm_location text DEFAULT '';
ALTER TABLE farms ADD COLUMN IF NOT EXISTS farm_description text DEFAULT '';

-- ==============================================================================
-- 2. SYNC TRIGGER: keep profiles.farm_name in sync with farms.farm_name
-- ==============================================================================
CREATE OR REPLACE FUNCTION sync_farm_name_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_name IS DISTINCT FROM OLD.farm_name THEN
    UPDATE profiles SET farm_name = NEW.farm_name, updated_at = now() WHERE id = NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_farm_name_to_profile_trigger ON farms;
CREATE TRIGGER sync_farm_name_to_profile_trigger
  AFTER UPDATE OF farm_name ON farms
  FOR EACH ROW
  EXECUTE FUNCTION sync_farm_name_to_profile();
