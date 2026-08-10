-- ==============================================================================
-- GALLOTRACK: ADMIN PANEL & SYSTEM SETTINGS SCHEMA (idempotent)
-- ==============================================================================
-- Run this in the Supabase SQL Editor once. It:
--   1. Adds admin/account columns to `profiles`:
--        - is_admin   : admin-privilege flag
--        - is_active  : allow/deny login (soft disable for user management)
--        - email      : denormalized login email so admins can list users
--   2. Backfills those columns from auth.users + the confirmed admin profile.
--   3. Creates `system_settings` (key/value jsonb) with a seeded 'app' row.
--   4. Adds RLS policies so ADMINS can read/update/delete all profiles & rows,
--      and so `system_settings` is admin-only. Owner isolation is preserved.
--
-- Admin UUID (confirmed): 67c04814-c3a0-407a-a00b-9d79647168ee
-- All statements are idempotent (IF NOT EXISTS / DROP IF EXISTS).
-- ==============================================================================

-- ==============================================================================
-- 1. PROFILES: admin + account columns
-- ==============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill email from auth.users (safe, idempotent).
UPDATE profiles p
   SET email = u.email
  FROM auth.users u
 WHERE p.id::uuid = u.id
   AND (p.email IS NULL OR p.email = '');

-- Mark the confirmed admin profile (and any existing role='admin' row) as admin.
UPDATE profiles
   SET is_admin = true
 WHERE (id::uuid = '67c04814-c3a0-407a-a00b-9d79647168ee' OR role = 'admin')
   AND NOT is_admin;
-- NOTE: if the admin profile row does not exist yet, this is a no-op until the
-- admin logs in once (handleLogin/ensureOwnerRecords create it). Re-run after.

-- ==============================================================================
-- 2. SYSTEM SETTINGS TABLE (admin-managed key/value config)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Seed the default application configuration.
INSERT INTO system_settings (key, value)
VALUES (
  'app',
  '{"system_name":"GalloTrack","system_status":"Operational","maintenance_message":"","default_strain":"Sweater","cloud_logs":true,"event_alerts":true}'
)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 3. RLS POLICIES
--    Admin predicate (reused): the acting user has an admin profile row.
--    ==========================================================================
--    EXISTS (
--      SELECT 1 FROM profiles adm
--      WHERE adm.id::uuid = auth.uid()
--        AND (adm.is_admin = true OR adm.role = 'admin')
--    )
-- ==============================================================================

-- ---------- PROFILES ----------
-- Admin may read every profile, update any profile, delete any profile
-- (the existing profiles_owner_* policies continue to govern normal owners).
DROP POLICY IF EXISTS admin_read_all_profiles ON profiles;
CREATE POLICY admin_read_all_profiles ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

DROP POLICY IF EXISTS admin_update_any_profile ON profiles;
CREATE POLICY admin_update_any_profile ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

DROP POLICY IF EXISTS admin_delete_any_profile ON profiles;
CREATE POLICY admin_delete_any_profile ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

-- ---------- FOWL / MATCH ----------
-- Admin read-all and delete-any (owner isolation policies remain intact).
DROP POLICY IF EXISTS admin_read_all_fowl ON fowl;
CREATE POLICY admin_read_all_fowl ON fowl
  FOR SELECT USING (
    user_id::uuid = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

DROP POLICY IF EXISTS admin_delete_any_fowl ON fowl;
CREATE POLICY admin_delete_any_fowl ON fowl
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

DROP POLICY IF EXISTS admin_read_all_match ON match;
CREATE POLICY admin_read_all_match ON match
  FOR SELECT USING (
    user_id::uuid = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

DROP POLICY IF EXISTS admin_delete_any_match ON match;
CREATE POLICY admin_delete_any_match ON match
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

-- ---------- SYSTEM SETTINGS (admin-only CRUD) ----------
DROP POLICY IF EXISTS syssettings_admin_select ON system_settings;
CREATE POLICY syssettings_admin_select ON system_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

DROP POLICY IF EXISTS syssettings_admin_insert ON system_settings;
CREATE POLICY syssettings_admin_insert ON system_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

DROP POLICY IF EXISTS syssettings_admin_update ON system_settings;
CREATE POLICY syssettings_admin_update ON system_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

DROP POLICY IF EXISTS syssettings_admin_delete ON system_settings;
CREATE POLICY syssettings_admin_delete ON system_settings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

-- ==============================================================================
-- 4. POST-RUN VERIFICATION (run these yourself afterwards)
-- ==============================================================================
-- (1) Columns present:
--     SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'profiles' AND column_name IN ('is_admin','is_active','email');
--
-- (2) Admin profile flagged (expect at least 1 row is_admin = true):
--     SELECT id, email, role, is_admin, is_active FROM profiles WHERE is_admin = true;
--
-- (3) Default settings row exists:
--     SELECT key, value->>'system_status' FROM system_settings WHERE key = 'app';
--
-- (4) Policy inventory:
--     SELECT tablename, policyname FROM pg_policies
--     WHERE schemaname = 'public'
--       AND (tablename IN ('profiles','fowl','match') OR tablename = 'system_settings')
--     ORDER BY tablename, policyname;
-- ==============================================================================