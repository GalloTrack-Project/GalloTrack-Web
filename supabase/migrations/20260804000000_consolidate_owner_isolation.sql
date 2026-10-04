-- ==============================================================================
-- GALLOTRACK: AUTHORITATIVE OWNER-ISOLATION RLS MIGRATION (idempotent)
-- ==============================================================================
-- Supersedes (do NOT run these again):
--   utils/strict_user_isolation.sql
--   utils/supabase_rls_isolation.sql
--   utils/migrate_legacy_records.sql
-- The three previous scripts defined contradictory RLS states and were run by
-- hand with no migration tracking, so the live state is unknown. This migration
-- is the single source of truth: it declares the final schema + policy set, is
-- safe to re-run, and explicitly removes every policy the old scripts could
-- have created (by name, plus a catch-all that drops anything else remaining).
--
-- RLS MODEL (OPTION A -- strict, no admin bypass):
--   fowl, match : every command gated by user_id = auth.uid()
--   profiles    : select/update/insert gated by id = auth.uid()
--
-- Admin UUID (confirmed): 67c04814-c3a0-407a-a00b-9d79647168ee
-- ==============================================================================


-- ==============================================================================
-- 0. PREREQUISITES: ensure owner columns exist and RLS is enabled.
--    Idempotent -- no-ops when already present.
-- ==============================================================================
ALTER TABLE fowl
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE match
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- created_at columns drive the dashboard "↑ N this week" trend indicators.
-- ADD COLUMN with a DEFAULT backfills existing rows with the migration-run
-- timestamp (evaluated per row), so every legacy record gets a created_at.
ALTER TABLE fowl
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE match
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE fowl ENABLE ROW LEVEL SECURITY;
ALTER TABLE match ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 1. PROFILES ROLE COLUMN
--    Add `role` with the IF NOT EXISTS pattern. A fixed-name CHECK is then
--    asserted so the constraint exists even if a previous attempt added the
--    column without it.
-- ==============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'admin'));

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner', 'admin'));


-- ==============================================================================
-- 2 + 3. ADMIN ROLE + LEGACY BACKFILL
--    - Marks the confirmed admin profile as role = 'admin'.
--    - Reclaims legacy rows (user_id IS NULL) for the admin.
--    The WHERE user_id IS NULL guard keeps the backfill idempotent across
--    re-runs, and the role UPDATE is naturally idempotent.
-- ==============================================================================
DO $$
DECLARE
  admin_uuid uuid := '67c04814-c3a0-407a-a00b-9d79647168ee';
BEGIN
  UPDATE profiles
     SET role = 'admin'
   WHERE id::uuid = admin_uuid;

  UPDATE fowl
     SET user_id = admin_uuid
   WHERE user_id IS NULL;

  UPDATE match
     SET user_id = admin_uuid
   WHERE user_id IS NULL;
END $$;
-- NOTE: if the admin profile row does not exist yet (admin never created one),
-- the first UPDATE is a no-op and the verification SELECT will show role counts
-- without 'admin'. Complete the admin's profile via the app, then re-run this
-- migration (or just the UPDATE above) -- it is safe to do so.


-- ==============================================================================
-- 4. TEAR DOWN EVERY POLICY THE THREE OLD SCRIPTS COULD HAVE LEFT BEHIND
--    Named drops (complete inventory across the old scripts), then a catch-all
--    that removes any other RLS policy on these tables regardless of name, in
--    case the live state drifted from what the files show.
-- ==============================================================================

-- fowl
DROP POLICY IF EXISTS "fowl_select_policy"    ON fowl;
DROP POLICY IF EXISTS "fowl_insert_policy"    ON fowl;
DROP POLICY IF EXISTS "fowl_update_policy"    ON fowl;
DROP POLICY IF EXISTS "fowl_delete_policy"    ON fowl;
DROP POLICY IF EXISTS "fowl_strict_select"    ON fowl;
DROP POLICY IF EXISTS "fowl_strict_insert"    ON fowl;
DROP POLICY IF EXISTS "fowl_strict_update"    ON fowl;
DROP POLICY IF EXISTS "fowl_strict_delete"    ON fowl;

-- match
DROP POLICY IF EXISTS "match_select_policy"   ON match;
DROP POLICY IF EXISTS "match_insert_policy"   ON match;
DROP POLICY IF EXISTS "match_update_policy"   ON match;
DROP POLICY IF EXISTS "match_delete_policy"   ON match;
DROP POLICY IF EXISTS "match_strict_select"   ON match;
DROP POLICY IF EXISTS "match_strict_insert"   ON match;
DROP POLICY IF EXISTS "match_strict_update"   ON match;
DROP POLICY IF EXISTS "match_strict_delete"   ON match;

-- profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_strict_select" ON profiles;
DROP POLICY IF EXISTS "profiles_strict_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_strict_update" ON profiles;

-- Catch-all: drop any remaining policy on the three tables, named or not.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('fowl', 'match', 'profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;


-- ==============================================================================
-- 5. FINAL POLICY SET -- OPTION A (strict owner isolation, no admin bypass)
-- ==============================================================================
CREATE POLICY "fowl_owner_select" ON fowl FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "fowl_owner_insert" ON fowl FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "fowl_owner_update" ON fowl FOR UPDATE USING (user_id::uuid = auth.uid()) WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "fowl_owner_delete" ON fowl FOR DELETE USING (user_id::uuid = auth.uid());

CREATE POLICY "match_owner_select" ON match FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "match_owner_insert" ON match FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "match_owner_update" ON match FOR UPDATE USING (user_id::uuid = auth.uid()) WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "match_owner_delete" ON match FOR DELETE USING (user_id::uuid = auth.uid());

CREATE POLICY "profiles_owner_select" ON profiles FOR SELECT USING (id::uuid = auth.uid());
CREATE POLICY "profiles_owner_insert" ON profiles FOR INSERT WITH CHECK (id::uuid = auth.uid());
CREATE POLICY "profiles_owner_update" ON profiles FOR UPDATE USING (id::uuid = auth.uid()) WITH CHECK (id::uuid = auth.uid());


-- ==============================================================================
-- OPTION B EXTENSION POINT (ADMIN SEES-ALL) -- NOT ACTIVE, COMMENTED OUT
-- ------------------------------------------------------------------------------
-- Enable later when admins must read every row. One-line follow-up: uncomment
-- the matching CREATE POLICY and run it. The profiles.role column added by this
-- migration is the driver; owner rows remain readable via user_id = auth.uid().
--
--   CREATE POLICY "admin_read_all_fowl" ON fowl FOR SELECT USING (
--     EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
--     OR user_id = auth.uid()
--   );
--
--   CREATE POLICY "admin_read_all_match" ON match FOR SELECT USING (
--     EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
--     OR user_id = auth.uid()
--   );
-- ==============================================================================


-- ==============================================================================
-- 7. POST-RUN VERIFICATION (NOT EXECUTED -- run these yourself afterwards)
-- ==============================================================================
-- (1) Policy count per table (expect: fowl = 4, match = 4, profiles = 3):
--     SELECT tablename, count(*) AS policy_count
--     FROM pg_policies
--     WHERE schemaname = 'public'
--       AND tablename IN ('fowl', 'match', 'profiles')
--     GROUP BY tablename
--     ORDER BY tablename;
--
-- (2) Zero remaining NULL user_id rows (expect both counts = 0):
--     SELECT 'fowl' AS table_name, count(*) AS null_user_id
--     FROM fowl WHERE user_id IS NULL
--     UNION ALL
--     SELECT 'match', count(*)
--     FROM match WHERE user_id IS NULL;
--
-- (3) Role distribution in profiles (expect: admin = 1, owner = N):
--     SELECT role, count(*)
--     FROM profiles
--     GROUP BY role
--     ORDER BY role;
--
-- (4) created_at column exists + fully backfilled (expect both counts = 0):
--     SELECT 'fowl' AS table_name, count(*) AS missing_created_at
--     FROM fowl WHERE created_at IS NULL
--     UNION ALL
--     SELECT 'match', count(*)
--     FROM match WHERE created_at IS NULL;
-- ==============================================================================
