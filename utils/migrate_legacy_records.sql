-- ==============================================================================
-- GALLOTRACK: LEGACY DATA MIGRATION & VISIBILITY RESTORATION SCRIPT
-- ==============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR (Dashboard -> SQL Editor -> New Query)
-- Restores visibility of all legacy records (user_id IS NULL) by assigning them
-- to the primary admin account or keeping them accessible.
-- ==============================================================================

-- 1. ASSIGN LEGACY FOWL RECORDS (user_id IS NULL) TO THE PRIMARY ADMIN ACCOUNT
UPDATE fowl 
SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1) 
WHERE user_id IS NULL;

-- 2. ASSIGN LEGACY MATCH RECORDS (user_id IS NULL) TO THE PRIMARY ADMIN ACCOUNT
UPDATE match 
SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1) 
WHERE user_id IS NULL;

-- 3. REFRESH RLS POLICIES FOR FOWL TABLE TO PERMIT SELECT FOR OWNED OR UNASSIGNED RECORDS
DROP POLICY IF EXISTS "fowl_select_policy" ON fowl;
CREATE POLICY "fowl_select_policy" ON fowl 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- 4. REFRESH RLS POLICIES FOR MATCH TABLE TO PERMIT SELECT FOR OWNED OR UNASSIGNED RECORDS
DROP POLICY IF EXISTS "match_select_policy" ON match;
CREATE POLICY "match_select_policy" ON match 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);
