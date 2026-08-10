-- ==============================================================================
-- GALLOTRACK: FARM OWNER REGISTRATION SCHEMA (idempotent)
-- ==============================================================================
-- Run this file in the Supabase SQL Editor once. It:
--   1. Enriches `profiles` with structured owner name columns (first/middle/last)
--      plus farm & contact metadata directly on the owner's profile row.
--   2. Creates the normalized `farms` table, keyed by `owner_id` -> auth.users,
--      so each owner's farm/business row is linked to their profile and to
--      their inventory (fowl.user_id = farms.owner_id = auth.uid()).
--   3. Enables RLS + owner-isolation policies on `farms`.
--
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE) so re-running is safe.
-- ==============================================================================

-- ==============================================================================
-- 1. PROFILES: structured name + farm columns
-- ==============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS middle_name text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_name text;

-- First-class farm metadata on the profile row (display-friendly denormalization).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS farm_name text;

-- Alias used by the profile page (keeps existing phone_number writes working).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contact_number text;

-- Backfill derived columns from the legacy full_name so existing owners keep working.
UPDATE profiles
   SET first_name = CASE
         WHEN first_name IS NULL OR first_name = '' THEN split_part(full_name, ' ', 1)
         ELSE first_name
       END
 WHERE full_name IS NOT NULL AND full_name <> '';

UPDATE profiles
   SET last_name = CASE
         WHEN last_name IS NULL OR last_name = '' THEN
           array_to_string((string_to_array(full_name, ' '))[array_upper(string_to_array(full_name, ' '), 1):array_upper(string_to_array(full_name, ' '), 1)], ' ')
         ELSE last_name
       END
 WHERE full_name IS NOT NULL AND full_name <> '';

-- ==============================================================================
-- 2. FARMS TABLE (owner-owned business entity)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_name text NOT NULL,
  contact_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT farms_owner_unique UNIQUE (owner_id)
);

-- ==============================================================================
-- 3. RLS: farms is strictly owner-isolated (mirrors the fowl/match policy model)
-- ==============================================================================
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS farms_owner_select ON farms;
DROP POLICY IF EXISTS farms_owner_insert ON farms;
DROP POLICY IF EXISTS farms_owner_update ON farms;
DROP POLICY IF EXISTS farms_owner_delete ON farms;

CREATE POLICY farms_owner_select ON farms FOR SELECT USING (owner_id::uuid = auth.uid());
CREATE POLICY farms_owner_insert ON farms FOR INSERT WITH CHECK (owner_id::uuid = auth.uid());
CREATE POLICY farms_owner_update ON farms FOR UPDATE USING (owner_id::uuid = auth.uid()) WITH CHECK (owner_id::uuid = auth.uid());
CREATE POLICY farms_owner_delete ON farms FOR DELETE USING (owner_id::uuid = auth.uid());

-- ==============================================================================
-- 4. POST-RUN VERIFICATION (run these yourself afterwards)
-- ==============================================================================
-- (1) New columns present on profiles:
--     SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'profiles' ORDER BY ordinal_position;
--
-- (2) farms table + RLS active:
--     SELECT tablename, policyname FROM pg_policies
--     WHERE schemaname = 'public' AND tablename = 'farms';
--     EXPECT: farms_owner_select | farms_owner_insert | farms_owner_update | farms_owner_delete
-- ==============================================================================