-- ═══════════════════════════════════════════════════════════════════════════
-- GalloTrack Complete Seed Data for Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════
-- HOW TO USE:
--   1. Go to your Supabase Dashboard → SQL Editor
--   2. Paste this entire script
--   3. Replace 'YOUR_USER_ID_HERE' with your actual auth user UUID
--      (Find it in Authentication → Users in Supabase Dashboard)
--   4. Click "Run"
-- ═══════════════════════════════════════════════════════════════════════════

-- First, find your user ID:
-- SELECT id, email FROM auth.users LIMIT 5;

-- Replace this with your actual user ID from auth.users:
DO $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users LIMIT 1;
  RAISE NOTICE 'Using user ID: %', uid;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 0: Create custom strains and leg_colors tables if not exists
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS strains (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_custom BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT null
);

CREATE TABLE IF NOT EXISTS leg_colors (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_custom BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT null
);

-- Add deleted_at column if table already exists without it
DO $$ BEGIN
  ALTER TABLE strains ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT null;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE leg_colors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT null;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Clean existing data
-- ═══════════════════════════════════════════════════════════════════════════
DELETE FROM match WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
DELETE FROM fowl WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Insert Foundation Sires (no parents = 100% bloodline)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Iron Lemon',    'Lemon',   'Rooster', 'Black-Breasted Red', 'Red',   'Cock', 'Aggressive',  'Pearl',        '2023-06-15', '24 Months', '2.3 kg', '56 cm', 'Yellow',       'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Titan Sweater', 'Sweater', 'Rooster', 'Wheaten',            'Wheaten','Cock', 'Smart Fighter','Beanie',      '2023-08-20', '22 Months', '2.1 kg', '54 cm', 'White',        'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('True Hatch',    'Hatch',   'Rooster', 'Dark Red',           'Red',   'Cock', 'Powerful',     'Sta. Cruz',   '2023-09-10', '21 Months', '2.4 kg', '57 cm', 'Green / Slate','Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Insert Foundation Hens
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Golden Pearl',    'Lemon',   'Hen', 'Wheaten',        'Wheaten', 'Hen', 'Calm',   'Pearl',    '2023-07-01', '23 Months', '1.7 kg', '46 cm', 'Yellow',       'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Sunrise Queen',   'Sweater', 'Hen', 'Wheaten',        'Wheaten', 'Hen', 'Alert',  'Beanie',   '2023-10-05', '20 Months', '1.6 kg', '44 cm', 'Willow',       'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Mountain Rose',   'Hatch',   'Hen', 'Dark Cornish',   'Dark',    'Hen', 'Broody', 'Pearl',    '2023-11-12', '19 Months', '1.8 kg', '47 cm', 'Black',        'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Silver Princess', 'Sweater', 'Hen', 'White',           'White',   'Hen', 'Active', 'Beanie',   '2024-01-20', '17 Months', '1.5 kg', '43 cm', 'White',        'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Insert Offspring — Full-Sibling Family A
--           (Iron Lemon × Golden Pearl) = 4 siblings, same sire + same dam
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Lemon Storm', 'Lemon', 'Rooster', 'Black-Breasted Red', 'Red',    'Cock', 'Aggressive',    'Pearl', '2024-03-10', '12 Months', '2.0 kg', '52 cm', 'Yellow', 'Iron Lemon',  'Golden Pearl', 100, 100, 100, 'Active', ''),
  ('Lemon Blaze', 'Lemon', 'Rooster', 'Black-Breasted Red', 'Red',    'Cock', 'Smart Fighter', 'Pearl', '2024-03-10', '12 Months', '2.1 kg', '53 cm', 'Yellow', 'Iron Lemon',  'Golden Pearl', 100, 100, 100, 'Active', ''),
  ('Lemon Grace', 'Lemon', 'Hen',     'Wheaten',            'Wheaten','Hen',  'Calm',          'Pearl', '2024-03-10', '12 Months', '1.6 kg', '45 cm', 'Yellow', 'Iron Lemon',  'Golden Pearl', 100, 100, 100, 'Active', ''),
  ('Lemon Duke',  'Lemon', 'Rooster', 'Black-Breasted Red', 'Red',    'Cock', 'Powerful',      'Pearl', '2024-03-10', '12 Months', '2.2 kg', '54 cm', 'Yellow', 'Iron Lemon',  'Golden Pearl', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: Insert Offspring — Full-Sibling Family B
--           (Titan Sweater × Sunrise Queen) = 3 siblings
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Sweater Flash', 'Sweater', 'Rooster', 'Wheaten',  'Wheaten', 'Cock', 'Fast',         'Beanie', '2024-04-15', '11 Months', '1.9 kg', '51 cm', 'White', 'Titan Sweater', 'Sunrise Queen', 100, 100, 100, 'Active', ''),
  ('Sweater Bolt',  'Sweater', 'Rooster', 'Wheaten',  'Wheaten', 'Cock', 'Aggressive',   'Beanie', '2024-04-15', '11 Months', '2.0 kg', '52 cm', 'White', 'Titan Sweater', 'Sunrise Queen', 100, 100, 100, 'Active', ''),
  ('Sweater Angel', 'Sweater', 'Hen',     'Wheaten',  'Wheaten', 'Hen',  'Alert',        'Beanie', '2024-04-15', '11 Months', '1.5 kg', '44 cm', 'White', 'Titan Sweater', 'Sunrise Queen', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 6: Insert Offspring — Full-Sibling Family C
--           (True Hatch × Mountain Rose) = 3 siblings
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Hatch Thunder', 'Hatch', 'Rooster', 'Dark Red',      'Red',    'Cock', 'Powerful',      'Sta. Cruz', '2024-05-20', '10 Months', '2.3 kg', '55 cm', 'Green / Slate', 'True Hatch',    'Mountain Rose', 100, 100, 100, 'Active', ''),
  ('Hatch Storm',   'Hatch', 'Rooster', 'Dark Red',      'Red',    'Cock', 'Smart Fighter', 'Sta. Cruz', '2024-05-20', '10 Months', '2.2 kg', '54 cm', 'Green / Slate', 'True Hatch',    'Mountain Rose', 100, 100, 100, 'Active', ''),
  ('Hatch Rose',    'Hatch', 'Hen',     'Dark Cornish',  'Dark',   'Hen',  'Broody',        'Pearl',     '2024-05-20', '10 Months', '1.7 kg', '46 cm', 'Black',         'True Hatch',    'Mountain Rose', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 7: Half-Siblings via SIRE — Iron Lemon × different dams
--           Same father, different mothers
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Lemon-Sweater Cross', 'Lemon', 'Rooster', 'Wheaten',   'Wheaten', 'Cock', 'Fast',         'Beanie', '2024-04-01', '11 Months', '1.9 kg', '50 cm', 'Yellow',        'Iron Lemon', 'Sunrise Queen', 100, 100, 100, 'Active', ''),
  ('Lemon Silver',        'Lemon', 'Hen',     'White',     'White',   'Hen',  'Active',       'Beanie', '2024-04-01', '11 Months', '1.5 kg', '43 cm', 'White',         'Iron Lemon', 'Silver Princess', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- Half-Siblings via SIRE — Titan Sweater × different dams
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Sweater Gold',    'Sweater', 'Rooster', 'Wheaten',  'Wheaten', 'Cock', 'Smart Fighter', 'Pearl',    '2024-05-01', '10 Months', '1.8 kg', '49 cm', 'Yellow',        'Titan Sweater', 'Golden Pearl', 100, 100, 100, 'Active', ''),
  ('Sweater Mountain','Sweater', 'Rooster', 'Dark Red',  'Red',    'Cock', 'Powerful',       'Sta. Cruz','2024-06-01', '9 Months',  '2.0 kg', '51 cm', 'Green / Slate', 'Titan Sweater', 'Mountain Rose', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 8: Half-Siblings via DAM — Golden Pearl × different sires
--           Same mother, different fathers
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Sweater-Lemon Blend', 'Sweater', 'Rooster', 'Wheaten',      'Wheaten', 'Cock', 'Aggressive',  'Pearl',    '2024-04-20', '10 Months', '1.9 kg', '50 cm', 'Yellow',        'Titan Sweater',  'Golden Pearl', 100, 100, 100, 'Active', ''),
  ('Hatch-Lemon Mix',     'Hatch',   'Hen',     'Dark Cornish', 'Dark',    'Hen',  'Broody',      'Pearl',    '2024-05-15', '10 Months', '1.6 kg', '45 cm', 'Green / Slate', 'True Hatch',     'Golden Pearl', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- Half-Siblings via DAM — Mountain Rose × different sires
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Lemon-Mountain',   'Lemon',   'Rooster', 'Black-Breasted Red', 'Red',    'Cock', 'Aggressive',  'Sta. Cruz','2024-06-10', '9 Months',  '2.1 kg', '53 cm', 'Green / Slate', 'Iron Lemon',     'Mountain Rose', 100, 100, 100, 'Active', ''),
  ('Sweater-Mountain', 'Sweater', 'Rooster', 'Wheaten',            'Wheaten','Cock', 'Fast',         'Sta. Cruz','2024-07-01', '8 Months',  '2.0 kg', '52 cm', 'Green / Slate', 'Titan Sweater',  'Mountain Rose', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 9: 2nd Generation — Grandchildren (cross-family)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Elite Thunder',  'Lemon', 'Rooster', 'Wheaten', 'Wheaten', 'Cock', 'Smart Fighter', 'Pearl',  '2024-09-01', '7 Months', '1.8 kg', '49 cm', 'Yellow', 'Lemon Storm',   'Sweater Angel', 100, 100, 100, 'Active', ''),
  ('Elite Flash',    'Lemon', 'Rooster', 'Wheaten', 'Wheaten', 'Cock', 'Fast',          'Beanie', '2024-09-01', '7 Months', '1.7 kg', '48 cm', 'White',  'Lemon Storm',   'Sweater Angel', 100, 100, 100, 'Active', ''),
  ('Storm Warrior',  'Hatch', 'Rooster', 'Dark Red', 'Red',    'Cock', 'Powerful',      'Sta. Cruz','2024-10-15','6 Months', '2.0 kg', '51 cm', 'Green / Slate', 'Hatch Thunder', 'Lemon Grace',   100, 100, 100, 'Active', ''),
  ('Storm Queen',    'Hatch', 'Hen',     'Wheaten', 'Wheaten', 'Hen',  'Alert',         'Pearl',  '2024-10-15', '6 Months', '1.6 kg', '44 cm', 'Yellow', 'Hatch Thunder', 'Lemon Grace',   100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 10: Special Status Birds (Archived & Deceased)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, archive_reason, archive_date, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Retired Champion', 'Lemon', 'Rooster', 'Black-Breasted Red', 'Red', 'Cock', 'Calm', 'Pearl', '2023-01-15', '30 Months', '2.5 kg', '58 cm', 'Yellow', 'Iron Lemon', 'Golden Pearl', 100, 100, 100, 'Archived', 'Retired from active competition', '2025-03-01', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, archive_reason, archive_date, image_url);

INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, death_reason, death_date, image_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Fallen Hero', 'Sweater', 'Rooster', 'Wheaten', 'Wheaten', 'Cock', 'Brave', 'Beanie', '2023-03-20', '28 Months', '2.2 kg', '55 cm', 'White', 'Titan Sweater', 'Sunrise Queen', 100, 100, 100, 'Deceased', 'Died from injuries after championship match', '2025-03-01', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, death_reason, death_date, image_url);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 11: Match Records — 35 matches with varied outcomes & conditions
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO match (user_id, date, entry_name, breed, opponent, location, type, outcome, status, post_fight_condition, video_url)
SELECT (SELECT id FROM auth.users LIMIT 1), v.*
FROM (VALUES
  -- ═══ LEMON STORM (Full Sib Family A) — 4 fights: 3W 1L ═══════════════
  ('2025-01-15', 'Lemon Storm', 'Lemon', 'Rival Kelso Express',    'Dingle Breeding Arena',      'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-02-20', 'Lemon Storm', 'Lemon', 'Rival Roundhead King',   'Iloilo Coliseum',            '3-Cock Derby',        'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-04-10', 'Lemon Storm', 'Lemon', 'Rival Hatch Warrior',    'Passi Sports Complex',       'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-06-05', 'Lemon Storm', 'Lemon', 'Rival Sweater Blaze',    'Janiuay Cockpit Arena',      'Special Championship','Loss', 'Verified', 'Severely Injured / Critical',  NULL),

  -- ═══ LEMON BLAZE (Full Sib Family A) — 3 fights: 2W 1L ═══════════════
  ('2025-02-10', 'Lemon Blaze', 'Lemon', 'Rival Whitehackle Pro',  'Dingle Breeding Arena',      'Hack Match',          'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-03-25', 'Lemon Blaze', 'Lemon', 'Rival Kelso Express',    'Pototan Coliseum',           '2-Cock Derby',        'Loss', 'Verified', 'Fit / Recovered',              NULL),
  ('2025-05-18', 'Lemon Blaze', 'Lemon', 'Rival Hatch Dominator',  'Santa Barbara Sports Complex','Derby Match',        'Win',  'Verified', 'Fit / Recovered',              NULL),

  -- ═══ LEMON DUKE (Full Sib Family A) — 2 fights: 1W 1L ════════════════
  ('2025-03-10', 'Lemon Duke',  'Lemon', 'Rival Roundhead King',   'Dumangas Cockpit Arena',     'Derby Match',         'Loss', 'Verified', 'Fit / Recovered',              NULL),
  ('2025-05-01', 'Lemon Duke',  'Lemon', 'Rival Sweater Blaze',    'Dingle Breeding Arena',      'Hack Match',          'Win',  'Verified', 'Fit / Recovered',              NULL),

  -- ═══ SWEATER FLASH (Full Sib Family B) — 3 fights: 2W 1L ═════════════
  ('2025-01-28', 'Sweater Flash', 'Sweater', 'Rival Lemon Fighter',    'Iloilo Coliseum',            '3-Cock Derby',        'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-03-15', 'Sweater Flash', 'Sweater', 'Rival Hatch Storm',      'Dingle Breeding Arena',      'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-05-20', 'Sweater Flash', 'Sweater', 'Rival Kelso Express',    'San Enrique Arena',          'Special Championship','Loss', 'Verified', 'Deceased (Died from injuries)', NULL),

  -- ═══ SWEATER BOLT (Full Sib Family B) — 3 fights: 3W 0L ══════════════
  ('2025-02-05', 'Sweater Bolt',  'Sweater', 'Rival Whitehackle Pro',  'Passi Sports Complex',       'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-04-02', 'Sweater Bolt',  'Sweater', 'Rival Hatch Dominator',  'Dingle Breeding Arena',      'Hack Match',          'Win',  'Verified', 'Severely Injured / Critical',  NULL),
  ('2025-06-12', 'Sweater Bolt',  'Sweater', 'Rival Roundhead King',   'Janiuay Cockpit Arena',      '2-Cock Derby',        'Win',  'Verified', 'Fit / Recovered',              NULL),

  -- ═══ HATCH THUNDER (Full Sib Family C) — 3 fights: 2W 1L ═════════════
  ('2025-02-18', 'Hatch Thunder', 'Hatch', 'Rival Kelso Express',    'Dingle Breeding Arena',      'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-04-22', 'Hatch Thunder', 'Hatch', 'Rival Sweater Blaze',    'Pototan Coliseum',           '3-Cock Derby',        'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-06-01', 'Hatch Thunder', 'Hatch', 'Rival Whitehackle Pro',  'Iloilo Coliseum',            'Special Championship','Loss', 'Verified', 'Severely Injured / Critical',  NULL),

  -- ═══ HATCH STORM (Full Sib Family C) — 2 fights: 1W 1L ═══════════════
  ('2025-03-08', 'Hatch Storm',   'Hatch', 'Rival Lemon Fighter',    'Dumangas Cockpit Arena',     'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-05-15', 'Hatch Storm',   'Hatch', 'Rival Roundhead King',   'Santa Barbara Sports Complex','Hack Match',         'Loss', 'Verified', 'Fit / Recovered',              NULL),

  -- ═══ LEMON-SWEATER CROSS (Half-Sib via Sire) — 2 fights: 2W ══════════
  ('2025-02-25', 'Lemon-Sweater Cross', 'Lemon', 'Rival Hatch Warrior',  'Dingle Breeding Arena',  'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-04-15', 'Lemon-Sweater Cross', 'Lemon', 'Rival Kelso Express',  'Passi Sports Complex',   '2-Cock Derby',        'Win',  'Verified', 'Fit / Recovered',              NULL),

  -- ═══ SWEATER GOLD (Half-Sib via Sire) — 2 fights: 1W 1L ══════════════
  ('2025-03-20', 'Sweater Gold', 'Sweater', 'Rival Whitehackle Pro', 'Janiuay Cockpit Arena',      'Derby Match',         'Loss', 'Verified', 'Fit / Recovered',              NULL),
  ('2025-05-10', 'Sweater Gold', 'Sweater', 'Rival Lemon Fighter',   'Dingle Breeding Arena',      'Hack Match',          'Win',  'Verified', 'Fit / Recovered',              NULL),

  -- ═══ SWEATER-LEMON BLEND (Half-Sib via Dam) — 2 fights: 1W 1L ════════
  ('2025-03-05', 'Sweater-Lemon Blend', 'Sweater', 'Rival Hatch Dominator', 'San Enrique Arena',    'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-05-25', 'Sweater-Lemon Blend', 'Sweater', 'Rival Roundhead King',  'Dingle Breeding Arena','3-Cock Derby',        'Loss', 'Verified', 'Fit / Recovered',              NULL),

  -- ═══ LEMON-MOUNTAIN (Half-Sib via Dam) — 2 fights: 2W ═════════════════
  ('2025-04-08', 'Lemon-Mountain', 'Lemon', 'Rival Sweater Blaze',   'Iloilo Coliseum',            'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-06-15', 'Lemon-Mountain', 'Lemon', 'Rival Kelso Express',   'Dingle Breeding Arena',      'Special Championship','Win',  'Verified', 'Deceased (Died from injuries)', NULL),

  -- ═══ ELITE THUNDER (2nd Gen) — 2 fights: 2W ═══════════════════════════
  ('2025-05-05', 'Elite Thunder', 'Lemon', 'Rival Hatch Storm',      'Dingle Breeding Arena',      'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-06-20', 'Elite Thunder', 'Lemon', 'Rival Whitehackle Pro',  'Pototan Coliseum',           'Hack Match',          'Win',  'Verified', 'Fit / Recovered',              NULL),

  -- ═══ STORM WARRIOR (2nd Gen) — 2 fights: 1W 1L ═══════════════════════
  ('2025-05-12', 'Storm Warrior', 'Hatch', 'Rival Lemon Fighter',    'Dumangas Cockpit Arena',     'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-06-18', 'Storm Warrior', 'Hatch', 'Rival Kelso Express',    'Santa Barbara Sports Complex','3-Cock Derby',       'Loss', 'Verified', 'Severely Injured / Critical',  NULL),

  -- ═══ RETIRED CHAMPION — 3 old fights: 3W ═══════════════════════════════
  ('2024-06-10', 'Retired Champion', 'Lemon', 'Rival Old Guard',     'Local Farm Pit',             'Main Event / Solo',   'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2024-09-15', 'Retired Champion', 'Lemon', 'Rival Old Guard',     'Local Farm Pit',             'Main Event / Solo',   'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-01-05', 'Retired Champion', 'Lemon', 'Rival Old Guard',     'Local Farm Pit',             'Main Event / Solo',   'Win',  'Verified', 'Fit / Recovered',              NULL),

  -- ═══ FALLEN HERO — 3 fights before death: 3W ═══════════════════════════
  ('2024-07-20', 'Fallen Hero', 'Sweater', 'Rival Hatch Warrior',   'Dingle Breeding Arena',      'Derby Match',         'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2024-11-10', 'Fallen Hero', 'Sweater', 'Rival Kelso Express',   'Iloilo Coliseum',            '3-Cock Derby',        'Win',  'Verified', 'Fit / Recovered',              NULL),
  ('2025-02-28', 'Fallen Hero', 'Sweater', 'Rival Whitehackle Pro', 'Passi Sports Complex',       'Special Championship','Win',  'Verified', 'Deceased (Died from injuries)', NULL)
) AS v(date, entry_name, breed, opponent, location, type, outcome, status, post_fight_condition, video_url);

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Total counts
SELECT 'FOWL COUNT' as label, COUNT(*) as total FROM fowl WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
UNION ALL
SELECT 'MATCH COUNT', COUNT(*) FROM match WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- Full sibling families (same sire + same dam, 2+ birds)
SELECT 'FULL SIBLINGS' as group_type, sire, dam, COUNT(*) as bird_count,
       STRING_AGG(name, ', ' ORDER BY name) as members
FROM fowl
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND sire != 'Foundation Stock' AND dam != 'Foundation Stock'
GROUP BY sire, dam
HAVING COUNT(*) >= 2
ORDER BY bird_count DESC;

-- Half-siblings via sire (same sire, different dams, 2+ birds)
SELECT 'HALF-SIBS VIA SIRE' as group_type, sire, COUNT(DISTINCT dam) as dam_count, COUNT(*) as bird_count,
       STRING_AGG(name || ' (dam:' || dam || ')', ', ' ORDER BY name) as members
FROM fowl
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND sire != 'Foundation Stock'
GROUP BY sire
HAVING COUNT(DISTINCT dam) >= 2
ORDER BY bird_count DESC;

-- Half-siblings via dam (same dam, different sires, 2+ birds)
SELECT 'HALF-SIBS VIA DAM' as group_type, dam, COUNT(DISTINCT sire) as sire_count, COUNT(*) as bird_count,
       STRING_AGG(name || ' (sire:' || sire || ')', ', ' ORDER BY name) as members
FROM fowl
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND dam != 'Foundation Stock'
GROUP BY dam
HAVING COUNT(DISTINCT sire) >= 2
ORDER BY bird_count DESC;

-- Match outcomes per bird
SELECT entry_name,
       COUNT(*) as total_fights,
       SUM(CASE WHEN outcome = 'Win' THEN 1 ELSE 0 END) as wins,
       SUM(CASE WHEN outcome = 'Loss' THEN 1 ELSE 0 END) as losses,
       ROUND(100.0 * SUM(CASE WHEN outcome = 'Win' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN outcome IN ('Win','Loss') THEN 1 ELSE 0 END), 0), 1) as win_rate
FROM match
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
GROUP BY entry_name
ORDER BY win_rate DESC NULLS LAST;

RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE '  SEED COMPLETE! Check results above.';
RAISE NOTICE '═══════════════════════════════════════════════════════════';
