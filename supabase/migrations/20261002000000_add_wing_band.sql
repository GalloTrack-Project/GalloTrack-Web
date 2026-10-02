-- ==============================================================================
-- GALLOTRACK: WING BAND ID (physical identifier, idempotent)
-- ==============================================================================
-- Run this in the Supabase SQL Editor once. It:
--   1. Adds `wing_band` — the physical wing/leg band number the adviser asked
--      for, so every chicken has a unique, real-world identifier that survives
--      renames and matches the metal band on the bird.
--   2. Backfills `wing_band` from `bird_code` for legacy rows so every bird
--      starts with a band number (editable afterwards by the breeder).
--   3. Adds a per-owner uniqueness index so two chickens of the same farm can
--      never share a band number.
-- All statements are idempotent.
-- ==============================================================================

ALTER TABLE fowl ADD COLUMN IF NOT EXISTS wing_band text;

COMMENT ON COLUMN fowl.wing_band IS
  'Physical wing band number (unique per owner). Free-form, e.g. 001, W-12. Shown as the chicken''s on-farm ID.';

-- ── Backfill from bird_code ──
UPDATE fowl
   SET wing_band = bird_code
 WHERE wing_band IS NULL
   AND bird_code IS NOT NULL
   AND btrim(bird_code) <> '';

-- ── Uniqueness per owner (case-insensitive, ignores blanks) ──
CREATE UNIQUE INDEX IF NOT EXISTS fowl_user_wing_band_key
    ON fowl (user_id, upper(btrim(wing_band)))
 WHERE wing_band IS NOT NULL AND btrim(wing_band) <> '';

-- ── Lookup index for search ──
CREATE INDEX IF NOT EXISTS fowl_wing_band_idx
    ON fowl (upper(btrim(wing_band)))
 WHERE wing_band IS NOT NULL AND btrim(wing_band) <> '';

-- ==============================================================================
-- POST-RUN VERIFICATION (run this yourself afterwards)
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'fowl' AND column_name = 'wing_band';
-- ==============================================================================
