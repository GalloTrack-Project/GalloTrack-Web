-- ==============================================================================
-- GALLOTRACK: ASSIGN LEGACY RECORDS TO PRIMARY ADMIN
-- ==============================================================================
-- Run this ONCE in Supabase SQL Editor after the admin (Hazel Dato-on) has
-- logged in at least once via Supabase Auth. This assigns all unowned records
-- (user_id IS NULL) to the first created auth user (the admin).
--
-- After running, the app code will show these records only to the admin
-- (identified by gallotrack_admin_id in localStorage).
-- ==============================================================================

-- 1. Assign legacy fowl records to the first auth user (admin)
UPDATE fowl
SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

-- 2. Assign legacy match records to the first auth user (admin)
UPDATE match
SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

-- 3. Verify the migration
SELECT 'fowl' AS table_name, COUNT(*) AS assigned_records
FROM fowl
WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
UNION ALL
SELECT 'match' AS table_name, COUNT(*) AS assigned_records
FROM match
WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1);
