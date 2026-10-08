-- ============================================================================
-- 20261008100000_tab_membership_exclusivity.sql
-- TAB MEMBERSHIP EXCLUSIVITY (hard rule: one chicken, exactly one tab)
--
-- 1. Adds column registry_role text if not present.
-- 2. Backfills registry_role for all chickens with strict mutual exclusivity:
--    * Breeding Male: sires and foundation roosters (e.g. Iron Lemon [30]).
--    * Breeding Female: dams and foundation hens.
--    * Non-Breeding: offspring of breeding pairs (e.g. Lemon Storm [42]).
-- 3. Normalizes legacy status 'Sire Material' -> 'Active' (designation stays
--    in breeding_role = 'material').
-- 4. Records every change in fowl_status_history so changes are fully reversible.
-- 5. Adds database check constraint: registry_role IN ('Breeding Male','Breeding Female','Non-Breeding').
-- ============================================================================

-- Step 1: Ensure column exists
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS registry_role text;

-- Step 2: Backfill for user 9cc100d9-c855-41d3-a6a8-3c10fd65221c (primary farm)
UPDATE fowl f SET registry_role = v.role
FROM (VALUES
  (30, 'Breeding Male'),   -- Iron Lemon (sire 1)
  (31, 'Breeding Male'),   -- Titan Sweater (sire 2)
  (32, 'Breeding Male'),   -- True Hatch (sire 3)
  (35, 'Breeding Female'), -- Golden Pearl (dam A)
  (36, 'Breeding Female'), -- Sunrise Queen (dam B)
  (37, 'Breeding Female'), -- Mountain Rose (dam C)
  (38, 'Breeding Female'), -- Silver Princess (dam D)
  (39, 'Breeding Female'), -- Crimson Belle (dam E)
  (40, 'Breeding Female'), -- White Flame (dam F)
  (41, 'Breeding Female'), -- Alta daw (dam G)
  (42, 'Non-Breeding'),    -- Lemon Storm (1A1)
  (43, 'Non-Breeding'),    -- Lemon Blaze (1A2)
  (44, 'Non-Breeding'),    -- Lemon Grace (1A3)
  (45, 'Non-Breeding'),    -- Lemon Duke (1A4)
  (46, 'Non-Breeding'),    -- Lemon Pearl (1A5)
  (47, 'Non-Breeding'),    -- Sweater Flash (2B2)
  (48, 'Non-Breeding'),    -- Sweater Bolt (2B3)
  (49, 'Non-Breeding'),    -- Sweater Angel (2B1)
  (50, 'Non-Breeding'),    -- Sweater Queen (2B4)
  (51, 'Non-Breeding'),    -- Hatch Thunder (3C1)
  (52, 'Non-Breeding'),    -- Hatch Storm (3C2)
  (53, 'Non-Breeding'),    -- Hatch Rose (3C3)
  (54, 'Non-Breeding'),    -- Hatch Mountain (3C4)
  (55, 'Non-Breeding'),    -- Hatch Silver (3D3)
  (56, 'Non-Breeding'),    -- Hatch Princess (3D1)
  (57, 'Non-Breeding'),    -- Hatch Crown (3D2)
  (58, 'Non-Breeding'),    -- Lemon Roundhead King (1G1)
  (59, 'Non-Breeding'),    -- Lemon Roundhead Queen (1G2)
  (60, 'Non-Breeding'),    -- Lemon Duke II (1G3) - Deceased
  (61, 'Non-Breeding'),    -- Sweater Crimson (0X1) - Archived
  (62, 'Non-Breeding')     -- Sweater Red Storm (2E1)
) AS v(id, role)
WHERE f.id = v.id AND f.user_id = '9cc100d9-c855-41d3-a6a8-3c10fd65221c';

-- Step 3: General backfill for any other accounts where registry_role is NULL
-- 3a: Chickens that have registered offspring in the same farm
UPDATE fowl f
SET registry_role = CASE
  WHEN f.gender IN ('Rooster', 'Male') THEN 'Breeding Male'
  ELSE 'Breeding Female'
END
WHERE f.registry_role IS NULL
  AND EXISTS (
    SELECT 1 FROM fowl child
    WHERE child.user_id = f.user_id
      AND (LOWER(TRIM(child.sire)) = LOWER(TRIM(f.name)) OR LOWER(TRIM(child.dam)) = LOWER(TRIM(f.name)))
  );

-- 3b: Chickens with Foundation Stock / no registered parents
UPDATE fowl f
SET registry_role = CASE
  WHEN f.gender IN ('Rooster', 'Male') THEN 'Breeding Male'
  ELSE 'Breeding Female'
END
WHERE f.registry_role IS NULL
  AND (f.sire IS NULL OR TRIM(f.sire) = '' OR LOWER(TRIM(f.sire)) = 'foundation stock')
  AND (f.dam IS NULL OR TRIM(f.dam) = '' OR LOWER(TRIM(f.dam)) = 'foundation stock');

-- 3c: All remaining chickens (offspring with registered parents and no children)
UPDATE fowl f
SET registry_role = 'Non-Breeding'
WHERE f.registry_role IS NULL;

-- Step 4: Reversible Role History Log (fowl_status_history)
INSERT INTO fowl_status_history (fowl_id, field, old_value, new_value, reason, note, changed_at, changed_by)
SELECT f.id, 'registry_role', NULL, f.registry_role, 'tab_membership_exclusivity',
       'Initial role backfill: assigned exclusive registry role per hard exclusivity rule',
       now(), f.user_id
FROM fowl f
WHERE NOT EXISTS (
  SELECT 1 FROM fowl_status_history h
  WHERE h.fowl_id = f.id AND h.field = 'registry_role'
);

-- Step 5: Normalize any legacy status 'Sire Material' rows to 'Active'
INSERT INTO fowl_status_history (fowl_id, field, old_value, new_value, reason, note, changed_at, changed_by)
SELECT id, 'status', 'Sire Material', 'Active', 'normalization',
       'Sire Material normalized to Active (breeding_role=material preserves breeding stock designation)',
       now(), user_id
FROM fowl WHERE status = 'Sire Material';

UPDATE fowl
SET status = 'Active',
    breeding_role = CASE WHEN breeding_role IS NULL OR breeding_role = 'none' THEN 'material' ELSE breeding_role END
WHERE status = 'Sire Material';

-- Step 6: Add validated database constraint
DO $$ BEGIN
  ALTER TABLE fowl DROP CONSTRAINT IF EXISTS fowl_registry_role_check;
EXCEPTION WHEN undefined_object THEN null;
END $$;

ALTER TABLE fowl ADD CONSTRAINT fowl_registry_role_check
  CHECK (registry_role IN ('Breeding Male', 'Breeding Female', 'Non-Breeding'));

-- Verify:
-- SELECT registry_role, count(*) FROM fowl GROUP BY registry_role;
-- SELECT status, count(*) FROM fowl GROUP BY status;
