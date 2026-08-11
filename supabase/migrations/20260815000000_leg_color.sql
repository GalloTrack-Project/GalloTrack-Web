-- ==============================================================================
-- GALLOTRACK: LEG COLOR FIELD (idempotent)
-- ==============================================================================
-- Run this in the Supabase SQL Editor once. It:
--   1. Adds a `leg_color` text column to the `fowl` table for encoding/editing
--      the gamefowl's leg color (e.g. Yellow, White, Green/Slate, Willow, Black).
--   2. Defaults existing rows to 'N/A' so registry cards and analytics render
--      cleanly without a value.
-- All statements are idempotent (IF NOT EXISTS).
-- ==============================================================================

ALTER TABLE fowl
  ADD COLUMN IF NOT EXISTS leg_color text NOT NULL DEFAULT 'N/A';

-- ==============================================================================
-- POST-RUN VERIFICATION (run this yourself afterwards)
-- ==============================================================================
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'fowl' AND column_name = 'leg_color';
-- ==============================================================================