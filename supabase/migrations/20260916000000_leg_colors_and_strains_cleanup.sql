-- ==============================================================================
-- GALLOTRACK: LEG COLORS TABLE + STRAINS SOFT DELETE (idempotent)
-- ==============================================================================
-- 1. Creates `leg_colors` reference table (mirrors strains pattern).
-- 2. Adds `deleted_at` to `strains` for soft-delete support.
-- ==============================================================================

-- ==============================================================================
-- 1. LEG COLORS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS leg_colors (
  id         BIGSERIAL PRIMARY KEY,
  name       text NOT NULL,
  is_custom  boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness on leg color names
DROP INDEX IF EXISTS leg_colors_name_lower_uq;
CREATE UNIQUE INDEX leg_colors_name_lower_uq ON leg_colors ((lower(name))) WHERE deleted_at IS NULL;

-- RLS: any authenticated user can read, insert, soft-delete
ALTER TABLE leg_colors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leg_colors_select_authenticated ON leg_colors;
CREATE POLICY leg_colors_select_authenticated ON leg_colors
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS leg_colors_insert_authenticated ON leg_colors;
CREATE POLICY leg_colors_insert_authenticated ON leg_colors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS leg_colors_update_authenticated ON leg_colors;
CREATE POLICY leg_colors_update_authenticated ON leg_colors
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Default leg colors seed
INSERT INTO leg_colors (name, is_custom)
SELECT c.name, false
FROM (VALUES
  ('Yellow'), ('White'), ('Green'), ('Dark'), ('Pink'), ('Grey')
) AS c(name)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 2. ADD deleted_at TO strains (soft-delete support)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strains' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE strains ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- RLS policy for strains UPDATE (needed for soft-delete)
DROP POLICY IF EXISTS strains_update_authenticated ON strains;
CREATE POLICY strains_update_authenticated ON strains
  FOR UPDATE USING (auth.role() = 'authenticated');
