-- ==============================================================================
-- GALLOTRACK: STRICT USER ISOLATION ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- to enforce strict database-level data partitioning per user account.
-- ==============================================================================

-- 1. Ensure user_id column exists on core tables and defaults to the authenticated session user
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE match ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- 2. Enable Row Level Security on all core tables
ALTER TABLE fowl ENABLE ROW LEVEL SECURITY;
ALTER TABLE match ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop legacy permissive policies if present
DROP POLICY IF EXISTS "fowl_select_policy" ON fowl;
DROP POLICY IF EXISTS "fowl_insert_policy" ON fowl;
DROP POLICY IF EXISTS "fowl_update_policy" ON fowl;
DROP POLICY IF EXISTS "fowl_delete_policy" ON fowl;

DROP POLICY IF EXISTS "match_select_policy" ON match;
DROP POLICY IF EXISTS "match_insert_policy" ON match;
DROP POLICY IF EXISTS "match_update_policy" ON match;
DROP POLICY IF EXISTS "match_delete_policy" ON match;

DROP POLICY IF EXISTS "fowl_strict_select" ON fowl;
DROP POLICY IF EXISTS "fowl_strict_insert" ON fowl;
DROP POLICY IF EXISTS "fowl_strict_update" ON fowl;
DROP POLICY IF EXISTS "fowl_strict_delete" ON fowl;

DROP POLICY IF EXISTS "match_strict_select" ON match;
DROP POLICY IF EXISTS "match_strict_insert" ON match;
DROP POLICY IF EXISTS "match_strict_update" ON match;
DROP POLICY IF EXISTS "match_strict_delete" ON match;

-- 4. CREATE STRICT USER-PARTITIONED POLICIES FOR FOWL TABLE
CREATE POLICY "fowl_strict_select" ON fowl FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "fowl_strict_insert" ON fowl FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fowl_strict_update" ON fowl FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "fowl_strict_delete" ON fowl FOR DELETE USING (user_id = auth.uid());

-- 5. CREATE STRICT USER-PARTITIONED POLICIES FOR MATCH TABLE
CREATE POLICY "match_strict_select" ON match FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "match_strict_insert" ON match FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "match_strict_update" ON match FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "match_strict_delete" ON match FOR DELETE USING (user_id = auth.uid());

-- 6. CREATE STRICT USER-PARTITIONED POLICIES FOR PROFILES TABLE
DROP POLICY IF EXISTS "profiles_strict_select" ON profiles;
DROP POLICY IF EXISTS "profiles_strict_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_strict_update" ON profiles;

CREATE POLICY "profiles_strict_select" ON profiles FOR SELECT USING (id = auth.uid() OR user_id = auth.uid());
CREATE POLICY "profiles_strict_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid() OR user_id = auth.uid());
CREATE POLICY "profiles_strict_update" ON profiles FOR UPDATE USING (id = auth.uid() OR user_id = auth.uid());
