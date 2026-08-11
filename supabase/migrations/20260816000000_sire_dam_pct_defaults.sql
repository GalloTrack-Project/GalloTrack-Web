-- ==============================================================================
-- GALLOTRACK: SIRE / DAM PCT DEFAULT VALUES (idempotent)
-- ==============================================================================
-- Run this in the Supabase SQL Editor once. It:
--   1. Removes the implicit 100% assumption for new rows by setting the column
--      default of `sire_pct` / `dam_pct` to 0.
--   2. The app now sends 0 (not 100) when the user leaves the field empty, so
--      "blank" no longer silently records a 100% contribution.
-- Existing rows keep their saved values; only defaults change.
-- All statements are idempotent.
-- ==============================================================================

ALTER TABLE fowl
  ALTER COLUMN sire_pct SET DEFAULT 0;

ALTER TABLE fowl
  ALTER COLUMN dam_pct SET DEFAULT 0;

-- ==============================================================================
-- POST-RUN VERIFICATION (run this yourself afterwards)
-- ==============================================================================
-- SELECT column_name, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'fowl' AND column_name IN ('sire_pct', 'dam_pct');
-- ==============================================================================