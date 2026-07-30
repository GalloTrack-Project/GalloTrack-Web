-- ==============================================================================
-- GALLOTRACK: UNRESTRICTED ADMIN & PERMISSIVE ACCESS RLS CONFIGURATION
-- ==============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR (Dashboard -> SQL Editor -> New Query)
-- Ensures all database rows remain 100% visible and accessible without hiding records.
-- ==============================================================================

-- 1. ENSURE user_id COLUMNS EXIST
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE match ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE fowl ENABLE ROW LEVEL SECURITY;
ALTER TABLE match ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. PERMISSIVE POLICIES FOR FOWL TABLE (FULL VISIBILITY)
DROP POLICY IF EXISTS "fowl_select_policy" ON fowl;
DROP POLICY IF EXISTS "fowl_insert_policy" ON fowl;
DROP POLICY IF EXISTS "fowl_update_policy" ON fowl;
DROP POLICY IF EXISTS "fowl_delete_policy" ON fowl;

CREATE POLICY "fowl_select_policy" ON fowl FOR SELECT USING (true);
CREATE POLICY "fowl_insert_policy" ON fowl FOR INSERT WITH CHECK (true);
CREATE POLICY "fowl_update_policy" ON fowl FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "fowl_delete_policy" ON fowl FOR DELETE USING (true);

-- 4. PERMISSIVE POLICIES FOR MATCH TABLE (FULL VISIBILITY)
DROP POLICY IF EXISTS "match_select_policy" ON match;
DROP POLICY IF EXISTS "match_insert_policy" ON match;
DROP POLICY IF EXISTS "match_update_policy" ON match;
DROP POLICY IF EXISTS "match_delete_policy" ON match;

CREATE POLICY "match_select_policy" ON match FOR SELECT USING (true);
CREATE POLICY "match_insert_policy" ON match FOR INSERT WITH CHECK (true);
CREATE POLICY "match_update_policy" ON match FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "match_delete_policy" ON match FOR DELETE USING (true);

-- 5. PERMISSIVE POLICIES FOR PROFILES TABLE (FULL VISIBILITY)
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_policy" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE USING (true) WITH CHECK (true);
