-- ==============================================================================
-- GALLOTRACK: TRAIT AND FEATHER COLOR ATTRIBUTES
-- ==============================================================================
-- Migration to add `trait` and `feather_color` columns to `public.fowl`.
-- All statements are idempotent.
-- ==============================================================================

ALTER TABLE fowl ADD COLUMN IF NOT EXISTS trait text;
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS feather_color text;

COMMENT ON COLUMN fowl.trait IS 'Behavioral or fighting trait (e.g. Aggressive, Smart Fighter, Fast)';
COMMENT ON COLUMN fowl.feather_color IS 'Feather/plumage color (e.g. Wheaten, Dark Red, White)';

-- Backfill from existing columns if empty
UPDATE fowl
   SET trait = behavior_trait
 WHERE trait IS NULL
   AND behavior_trait IS NOT NULL;

UPDATE fowl
   SET feather_color = color
 WHERE feather_color IS NULL
   AND color IS NOT NULL;
