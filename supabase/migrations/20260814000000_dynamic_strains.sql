-- ==============================================================================
-- GALLOTRACK: DYNAMIC GENETIC STRAIN LIBRARY (idempotent)
-- ==============================================================================
-- Run this in the Supabase SQL Editor once. It:
--   1. Creates a `strains` reference table (name + custom flag + creator).
--   2. Seeds the default genetic strains already shipped in the app.
--   3. Enables RLS so any authenticated Farm Owner can:
--        - SELECT the full strain library (drives the encode/edit dropdowns).
--        - INSERT a brand-new custom strain (auto-saved from the encode form).
--   4. Enforces a case-insensitive uniqueness on strain names so duplicate
--      strains ("sweater" vs "Sweater") can never exist twice.
--
-- All statements are idempotent (IF NOT EXISTS / DROP IF EXISTS).
-- ==============================================================================

-- ==============================================================================
-- 1. STRAINS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS strains (
  id         BIGSERIAL PRIMARY KEY,
  name       text NOT NULL,
  is_custom  boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness: one canonical spelling per strain.
DROP INDEX IF EXISTS strains_name_lower_uq;
CREATE UNIQUE INDEX strains_name_lower_uq ON strains ((lower(name)));

-- ==============================================================================
-- 2. DEFAULT STRAINS (application seed library)
-- ==============================================================================
INSERT INTO strains (name, is_custom)
SELECT s.name, false
FROM (VALUES
  ('Sweater'), ('Hatch'), ('Roundhead'), ('Kelso'), ('Lemon 84'),
  ('Albany'), ('Claret'), ('Whitehackle'), ('Black'), ('Melsin'),
  ('Bennie'), ('Joe Madigin')
) AS s(name)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 3. ROW LEVEL SECURITY
--    Any authenticated Farm Owner can read the library and add custom strains.
--    Strains are shared app metadata (not owner data), so no owner isolation.
-- ==============================================================================
ALTER TABLE strains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS strains_select_authenticated ON strains;
CREATE POLICY strains_select_authenticated ON strains
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS strains_insert_authenticated ON strains;
CREATE POLICY strains_insert_authenticated ON strains
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ==============================================================================
-- 4. POST-RUN VERIFICATION (run these yourself afterwards)
-- ==============================================================================
-- (1) Default library present (expect 12 rows):
--     SELECT name, is_custom FROM strains ORDER BY name;
--
-- (2) RLS policies active:
--     SELECT tablename, policyname FROM pg_policies
--     WHERE schemaname = 'public' AND tablename = 'strains';
-- ==============================================================================