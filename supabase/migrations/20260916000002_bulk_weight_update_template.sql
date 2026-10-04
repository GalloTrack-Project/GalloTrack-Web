-- =============================================
-- BULK WEIGHT UPDATE SCRIPT
-- Fill in the weight column (in kg) for each fowl
-- Then run the script in Supabase SQL Editor
-- =============================================

-- Check all your fowls first:
SELECT id, name, breed, weight, height FROM fowl ORDER BY id;

-- Then update each one (replace 0.0 with actual weight):
-- UPDATE fowl SET weight = 2.5 WHERE id = 68;  -- Kelso
-- UPDATE fowl SET weight = 1.9 WHERE id = 67;  -- Reyna
-- UPDATE fowl SET weight = 2.6 WHERE id = 66;  -- Gino
-- UPDATE fowl SET weight = 2.5 WHERE id = 65;  -- GF-2026-001
-- UPDATE fowl SET weight = 2.5 WHERE id = 64;  -- Hen
-- UPDATE fowl SET weight = 0.0 WHERE id = 43;  -- Lemon Blaze
-- UPDATE fowl SET weight = 0.0 WHERE id = 42;  -- Lemon Storm
-- UPDATE fowl SET weight = 0.0 WHERE id = 41;  -- Alta daw
-- UPDATE fowl SET weight = 0.0 WHERE id = 40;  -- White Flame
