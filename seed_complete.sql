-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- GalloTrack Complete Seed Data v2 â€” 100 Fowls + 100 Matches
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- HOW TO USE:
--   1. Go to Supabase Dashboard â†’ SQL Editor
--   2. Paste this entire script
--   3. Click "Run"
--   The script auto-detects your user ID from auth.users.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 0: Setup tables & helper
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

DO $$ BEGIN
  ALTER TABLE strains ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT null;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE leg_colors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT null;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Ensure new columns exist on match table
DO $$ BEGIN
  ALTER TABLE match ADD COLUMN IF NOT EXISTS cock_count INTEGER DEFAULT 2;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE match ADD COLUMN IF NOT EXISTS age_category TEXT DEFAULT 'Cock';
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE match ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'Derby';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Add derby_match_number to match table
DO $$ BEGIN
  ALTER TABLE match ADD COLUMN IF NOT EXISTS derby_match_number INTEGER DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE fowl DROP CONSTRAINT IF EXISTS fowl_status_check;
  ALTER TABLE fowl ADD CONSTRAINT fowl_status_check CHECK (status IN ('Active','Archived','Deceased','Retired','Sold','Sire Material'));
EXCEPTION WHEN undefined_object THEN null;
END $$;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 1: Clean existing data
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
DELETE FROM match WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1);
DELETE FROM fowl WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 2: Foundation Sires (6) â€” no parents, 100% bloodline
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Iron Lemon',     'Lemon',    'Rooster', 'Black-Breasted Red', 'Red',      'Cock', 'Aggressive',   'Pearl',     '2023-06-15'::date, '30 Months', '2.4 kg', '57 cm', 'Yellow',        'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Titan Sweater',  'Sweater',  'Rooster', 'Wheaten',            'Wheaten',  'Cock', 'Smart Fighter','Beanie',    '2023-08-20'::date, '28 Months', '2.2 kg', '55 cm', 'White',         'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('True Hatch',     'Hatch',    'Rooster', 'Dark Red',           'Red',      'Cock', 'Powerful',     'Sta. Cruz', '2023-09-10'::date, '27 Months', '2.5 kg', '58 cm', 'Green / Slate', 'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('King Roundhead', 'Roundhead','Rooster', 'Wheaten',            'Wheaten',  'Cock', 'Clever',       'Pearl',     '2023-07-05'::date, '29 Months', '2.1 kg', '54 cm', 'Willow',        'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Boss Kelso',     'Kelso',    'Rooster', 'Red',                'Red',      'Cock', 'Steady',       'Beanie',    '2023-10-01'::date, '26 Months', '2.3 kg', '56 cm', 'Yellow',        'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Grand Albany',   'Albany',   'Rooster', 'Dark Cornish',       'Dark',     'Cock', 'Bold',         'Sta. Cruz', '2023-05-20'::date, '31 Months', '2.6 kg', '59 cm', 'Black',         'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 3: Foundation Hens (6) â€” no parents, 100% bloodline
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Golden Pearl',    'Lemon',    'Hen', 'Wheaten',        'Wheaten',  'Hen', 'Calm',    'Pearl',    '2023-07-01'::date, '29 Months', '1.7 kg', '46 cm', 'Yellow',        'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Sunrise Queen',   'Sweater',  'Hen', 'Wheaten',        'Wheaten',  'Hen', 'Alert',   'Beanie',   '2023-10-05'::date, '26 Months', '1.6 kg', '44 cm', 'Willow',        'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Mountain Rose',   'Hatch',    'Hen', 'Dark Cornish',   'Dark',     'Hen', 'Broody',  'Pearl',    '2023-11-12'::date, '25 Months', '1.8 kg', '47 cm', 'Black',         'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Silver Princess', 'Roundhead','Hen', 'White',           'White',    'Hen', 'Active',  'Beanie',   '2024-01-20'::date, '23 Months', '1.5 kg', '43 cm', 'White',         'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Red Duchess',     'Kelso',    'Hen', 'Red',             'Red',      'Hen', 'Gentle',  'Pearl',    '2023-09-15'::date, '27 Months', '1.7 kg', '45 cm', 'Yellow',        'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', ''),
  ('Dark Empress',    'Albany',   'Hen', 'Dark Cornish',    'Dark',     'Hen', 'Fierce',  'Sta. Cruz','2023-12-01'::date, '24 Months', '1.9 kg', '48 cm', 'Green / Slate', 'Foundation Stock', 'Foundation Stock', 0, 0, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 4: Full-Sibling Family A â€” Iron Lemon Ã— Golden Pearl (5 siblings)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Lemon Storm',    'Lemon', 'Rooster', 'Black-Breasted Red', 'Red',     'Cock',    'Aggressive',   'Pearl',     '2024-03-10'::date, '12 Months', '2.0 kg', '52 cm', 'Yellow',        'Iron Lemon', 'Golden Pearl', 100, 100, 100, 'Active', ''),
  ('Lemon Blaze',    'Lemon', 'Rooster', 'Black-Breasted Red', 'Red',     'Cock',    'Smart Fighter','Pearl',     '2024-03-10'::date, '12 Months', '2.1 kg', '53 cm', 'Yellow',        'Iron Lemon', 'Golden Pearl', 100, 100, 100, 'Active', ''),
  ('Lemon Grace',    'Lemon', 'Hen',     'Wheaten',            'Wheaten', 'Hen',     'Calm',         'Pearl',     '2024-03-10'::date, '12 Months', '1.6 kg', '45 cm', 'Yellow',        'Iron Lemon', 'Golden Pearl', 100, 100, 100, 'Active', ''),
  ('Lemon Duke',     'Lemon', 'Rooster', 'Black-Breasted Red', 'Red',     'Cock',    'Powerful',     'Pearl',     '2024-03-10'::date, '12 Months', '2.2 kg', '54 cm', 'Yellow',        'Iron Lemon', 'Golden Pearl', 100, 100, 100, 'Active', ''),
  ('Lemon Pearl',    'Lemon', 'Hen',     'Wheaten',            'Wheaten', 'Pullet',  'Active',       'Pearl',     '2024-09-15'::date, '6 Months',  '1.3 kg', '40 cm', 'Yellow',        'Iron Lemon', 'Golden Pearl', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 5: Full-Sibling Family B â€” Titan Sweater Ã— Sunrise Queen (4 siblings)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Sweater Flash',  'Sweater', 'Rooster', 'Wheaten', 'Wheaten', 'Cock',    'Fast',          'Beanie', '2024-04-15'::date, '11 Months', '1.9 kg', '51 cm', 'White',         'Titan Sweater', 'Sunrise Queen', 100, 100, 100, 'Active', ''),
  ('Sweater Bolt',   'Sweater', 'Rooster', 'Wheaten', 'Wheaten', 'Cock',    'Aggressive',    'Beanie', '2024-04-15'::date, '11 Months', '2.0 kg', '52 cm', 'White',         'Titan Sweater', 'Sunrise Queen', 100, 100, 100, 'Active', ''),
  ('Sweater Angel',  'Sweater', 'Hen',     'Wheaten', 'Wheaten', 'Hen',     'Alert',         'Beanie', '2024-04-15'::date, '11 Months', '1.5 kg', '44 cm', 'White',         'Titan Sweater', 'Sunrise Queen', 100, 100, 100, 'Active', ''),
  ('Sweater Kid',    'Sweater', 'Rooster', 'Wheaten', 'Wheaten', 'Stag',    'Smart Fighter','Beanie', '2025-01-10'::date, '3 Months',  '1.0 kg', '35 cm', 'White',         'Titan Sweater', 'Sunrise Queen', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 6: Full-Sibling Family C â€” True Hatch Ã— Mountain Rose (4 siblings)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Hatch Thunder',  'Hatch', 'Rooster', 'Dark Red',     'Red',     'Cock',    'Powerful',      'Sta. Cruz', '2024-05-20'::date, '10 Months', '2.3 kg', '55 cm', 'Green / Slate', 'True Hatch', 'Mountain Rose', 100, 100, 100, 'Active', ''),
  ('Hatch Storm',    'Hatch', 'Rooster', 'Dark Red',     'Red',     'Cock',    'Smart Fighter', 'Sta. Cruz', '2024-05-20'::date, '10 Months', '2.2 kg', '54 cm', 'Green / Slate', 'True Hatch', 'Mountain Rose', 100, 100, 100, 'Active', ''),
  ('Hatch Rose',     'Hatch', 'Hen',     'Dark Cornish', 'Dark',    'Hen',     'Broody',        'Pearl',     '2024-05-20'::date, '10 Months', '1.7 kg', '46 cm', 'Black',         'True Hatch', 'Mountain Rose', 100, 100, 100, 'Active', ''),
  ('Hatch Bolt',     'Hatch', 'Rooster', 'Dark Red',     'Red',     'Stag',    'Bold',          'Sta. Cruz', '2025-02-01'::date, '2 Months',  '0.8 kg', '30 cm', 'Green / Slate', 'True Hatch', 'Mountain Rose', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 7: Full-Sibling Family D â€” King Roundhead Ã— Silver Princess (4 siblings)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Roundhead Ace',    'Roundhead', 'Rooster', 'Wheaten',  'Wheaten', 'Cock',    'Clever',       'Pearl',     '2024-06-01'::date, '9 Months',  '1.8 kg', '50 cm', 'Willow',        'King Roundhead', 'Silver Princess', 100, 100, 100, 'Active', ''),
  ('Roundhead Flash',  'Roundhead', 'Rooster', 'Wheaten',  'Wheaten', 'Cock',    'Fast',         'Pearl',     '2024-06-01'::date, '9 Months',  '1.9 kg', '51 cm', 'Willow',        'King Roundhead', 'Silver Princess', 100, 100, 100, 'Active', ''),
  ('Roundhead Lady',   'Roundhead', 'Hen',     'White',    'White',   'Hen',     'Gentle',       'Beanie',    '2024-06-01'::date, '9 Months',  '1.4 kg', '42 cm', 'White',         'King Roundhead', 'Silver Princess', 100, 100, 100, 'Active', ''),
  ('Roundhead Star',   'Roundhead', 'Rooster', 'Wheaten',  'Wheaten', 'Stag',    'Alert',        'Pearl',     '2025-03-01'::date, '1 Month',  '0.5 kg', '25 cm', 'Willow',        'King Roundhead', 'Silver Princess', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 8: Full-Sibling Family E â€” Boss Kelso Ã— Red Duchess (4 siblings)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Kelso Express',   'Kelso', 'Rooster', 'Red',     'Red',     'Cock',    'Steady',       'Beanie', '2024-07-15'::date, '8 Months',  '1.7 kg', '49 cm', 'Yellow', 'Boss Kelso', 'Red Duchess', 100, 100, 100, 'Active', ''),
  ('Kelso Warrior',   'Kelso', 'Rooster', 'Red',     'Red',     'Cock',    'Bold',         'Beanie', '2024-07-15'::date, '8 Months',  '1.8 kg', '50 cm', 'Yellow', 'Boss Kelso', 'Red Duchess', 100, 100, 100, 'Active', ''),
  ('Kelso Belle',     'Kelso', 'Hen',     'Red',     'Red',     'Hen',     'Calm',         'Pearl',  '2024-07-15'::date, '8 Months',  '1.3 kg', '41 cm', 'Yellow', 'Boss Kelso', 'Red Duchess', 100, 100, 100, 'Active', ''),
  ('Kelso Chick',     'Kelso', 'Rooster', 'Red',     'Red',     'Chick',   'Curious',      'Beanie', '2025-06-01'::date, '0 Months', '0.2 kg', '15 cm', 'Yellow', 'Boss Kelso', 'Red Duchess', 100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 9: Half-Siblings via Sire â€” same father, different mothers (8)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Lemon-Sweater Cross', 'Lemon',   'Rooster', 'Wheaten',            'Wheaten',  'Cock',    'Fast',          'Beanie',    '2024-04-01'::date, '11 Months', '1.9 kg', '50 cm', 'Yellow',        'Iron Lemon',     'Sunrise Queen',   100, 100, 100, 'Active', ''),
  ('Lemon Silver',        'Lemon',   'Hen',     'White',              'White',    'Hen',     'Active',        'Beanie',    '2024-04-01'::date, '11 Months', '1.5 kg', '43 cm', 'White',         'Iron Lemon',     'Silver Princess', 100, 100, 100, 'Active', ''),
  ('Sweater Gold',        'Sweater', 'Rooster', 'Wheaten',            'Wheaten',  'Cock',    'Smart Fighter', 'Pearl',     '2024-05-01'::date, '10 Months', '1.8 kg', '49 cm', 'Yellow',        'Titan Sweater',  'Golden Pearl',    100, 100, 100, 'Active', ''),
  ('Sweater Mountain',    'Sweater', 'Rooster', 'Dark Red',           'Red',      'Cock',    'Powerful',      'Sta. Cruz', '2024-06-01'::date, '9 Months',  '2.0 kg', '51 cm', 'Green / Slate', 'Titan Sweater',  'Mountain Rose',   100, 100, 100, 'Active', ''),
  ('Hatch White',         'Hatch',   'Rooster', 'White',              'White',    'Cock',    'Bold',          'Pearl',     '2024-05-15'::date, '10 Months', '2.1 kg', '53 cm', 'White',         'True Hatch',     'Silver Princess', 100, 100, 100, 'Active', ''),
  ('Hatch Lemon',         'Hatch',   'Hen',     'Wheaten',            'Wheaten',  'Hen',     'Calm',          'Beanie',    '2024-06-20'::date, '9 Months',  '1.6 kg', '45 cm', 'Yellow',        'True Hatch',     'Golden Pearl',    100, 100, 100, 'Active', ''),
  ('Roundhead Boss',      'Roundhead','Rooster','Black-Breasted Red', 'Red',      'Cock',    'Clever',        'Pearl',     '2024-08-01'::date, '7 Months',  '1.7 kg', '48 cm', 'Willow',        'King Roundhead', 'Red Duchess',     100, 100, 100, 'Active', ''),
  ('Kelso Mountain',      'Kelso',   'Rooster', 'Dark Red',           'Red',      'Stag',    'Steady',        'Beanie',    '2025-01-15'::date, '3 Months',  '1.0 kg', '36 cm', 'Green / Slate', 'Boss Kelso',     'Mountain Rose',   100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 10: Half-Siblings via Dam â€” same mother, different fathers (8)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Sweater-Lemon Blend',  'Sweater',  'Rooster', 'Wheaten',            'Wheaten',  'Cock',    'Aggressive',   'Pearl',     '2024-04-20'::date, '11 Months', '1.9 kg', '50 cm', 'Yellow',        'Titan Sweater',  'Golden Pearl',    100, 100, 100, 'Active', ''),
  ('Hatch-Lemon Mix',      'Hatch',    'Hen',     'Dark Cornish',       'Dark',     'Hen',     'Broody',       'Pearl',     '2024-05-15'::date, '10 Months', '1.6 kg', '45 cm', 'Green / Slate', 'True Hatch',     'Golden Pearl',    100, 100, 100, 'Active', ''),
  ('Lemon-Mountain',       'Lemon',    'Rooster', 'Black-Breasted Red', 'Red',      'Cock',    'Aggressive',   'Sta. Cruz', '2024-06-10'::date, '9 Months',  '2.1 kg', '53 cm', 'Green / Slate', 'Iron Lemon',     'Mountain Rose',   100, 100, 100, 'Active', ''),
  ('Sweater-Mountain',     'Sweater',  'Rooster', 'Wheaten',            'Wheaten',  'Cock',    'Fast',          'Sta. Cruz', '2024-07-01'::date, '8 Months',  '2.0 kg', '52 cm', 'Green / Slate', 'Titan Sweater',  'Mountain Rose',   100, 100, 100, 'Active', ''),
  ('Roundhead Pearl',      'Roundhead','Rooster', 'Wheaten',            'Wheaten',  'Cock',    'Alert',         'Pearl',     '2024-08-15'::date, '7 Months',  '1.6 kg', '47 cm', 'White',         'King Roundhead', 'Golden Pearl',    100, 100, 100, 'Active', ''),
  ('Kelso Silver',         'Kelso',    'Rooster', 'White',              'White',    'Cock',    'Steady',        'Beanie',    '2024-09-01'::date, '6 Months',  '1.5 kg', '46 cm', 'White',         'Boss Kelso',     'Silver Princess', 100, 100, 100, 'Active', ''),
  ('Albany Rose',          'Albany',   'Hen',     'Dark Cornish',       'Dark',     'Hen',     'Fierce',        'Sta. Cruz', '2024-07-10'::date, '8 Months',  '1.7 kg', '46 cm', 'Green / Slate', 'Grand Albany',   'Mountain Rose',   100, 100, 100, 'Active', ''),
  ('Albany Duchess',       'Albany',   'Rooster', 'Dark Cornish',       'Dark',     'Cock',    'Bold',          'Sta. Cruz', '2024-05-25'::date, '10 Months', '2.2 kg', '54 cm', 'Black',         'Grand Albany',   'Red Duchess',     100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 11: 2nd Generation Crosses â€” Grandchildren (10)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Elite Thunder',   'Lemon',    'Rooster', 'Wheaten',            'Wheaten',  'Cock',    'Smart Fighter', 'Pearl',     '2024-09-01'::date, '7 Months',  '1.8 kg', '49 cm', 'Yellow',        'Lemon Storm',    'Sweater Angel',   100, 100, 100, 'Active', ''),
  ('Elite Flash',     'Lemon',    'Rooster', 'Wheaten',            'Wheaten',  'Cock',    'Fast',          'Beanie',    '2024-09-01'::date, '7 Months',  '1.7 kg', '48 cm', 'White',         'Lemon Storm',    'Sweater Angel',   100, 100, 100, 'Active', ''),
  ('Storm Warrior',   'Hatch',    'Rooster', 'Dark Red',           'Red',      'Cock',    'Powerful',      'Sta. Cruz', '2024-10-15'::date, '6 Months',  '2.0 kg', '51 cm', 'Green / Slate', 'Hatch Thunder',  'Lemon Grace',     100, 100, 100, 'Active', ''),
  ('Storm Queen',     'Hatch',    'Hen',     'Wheaten',            'Wheaten',  'Hen',     'Alert',         'Pearl',     '2024-10-15'::date, '6 Months',  '1.6 kg', '44 cm', 'Yellow',        'Hatch Thunder',  'Lemon Grace',     100, 100, 100, 'Active', ''),
  ('Ace Express',     'Roundhead','Rooster', 'Red',                'Red',      'Cock',    'Clever',        'Pearl',     '2024-11-01'::date, '5 Months',  '1.5 kg', '45 cm', 'Willow',        'Roundhead Ace',  'Kelso Belle',     100, 100, 100, 'Active', ''),
  ('Flash Warrior',   'Kelso',    'Rooster', 'Red',                'Red',      'Cock',    'Bold',          'Beanie',    '2024-12-01'::date, '4 Months',  '1.4 kg', '43 cm', 'Yellow',        'Kelso Express',  'Roundhead Lady',  100, 100, 100, 'Active', ''),
  ('Bolt Storm',      'Sweater',  'Rooster', 'Wheaten',            'Wheaten',  'Stag',    'Aggressive',    'Beanie',    '2025-02-15'::date, '2 Months',  '0.9 kg', '32 cm', 'White',         'Sweater Bolt',   'Hatch Rose',      100, 100, 100, 'Active', ''),
  ('Lemon Bolt',      'Lemon',    'Rooster', 'Black-Breasted Red', 'Red',      'Stag',    'Powerful',      'Pearl',     '2025-03-01'::date, '1 Month',  '0.6 kg', '28 cm', 'Yellow',        'Lemon Duke',     'Sweater Angel',   100, 100, 100, 'Active', ''),
  ('Albany Storm',    'Albany',   'Rooster', 'Dark Cornish',       'Dark',     'Stag',    'Fierce',        'Sta. Cruz', '2025-01-20'::date, '3 Months',  '1.1 kg', '37 cm', 'Black',         'Grand Albany',   'Hatch Rose',      100, 100, 100, 'Active', ''),
  ('Cross Champion',  'Hatch',    'Rooster', 'Dark Red',           'Red',      'Cock',    'Smart Fighter', 'Sta. Cruz', '2024-08-01'::date, '7 Months',  '2.0 kg', '52 cm', 'Green / Slate', 'Hatch Storm',    'Lemon Grace',     100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 12: Additional Stags (8) â€” young males in conditioning
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Young King',      'Kelso',    'Rooster', 'Red',                'Red',      'Stag',    'Eager',         'Beanie',    '2025-04-01'::date, '1 Month',  '0.5 kg', '24 cm', 'Yellow',        'Boss Kelso',     'Red Duchess',     100, 100, 100, 'Active', ''),
  ('Young Storm',     'Hatch',    'Rooster', 'Dark Red',           'Red',      'Stag',    'Bold',          'Sta. Cruz', '2025-03-15'::date, '1 Month',  '0.6 kg', '26 cm', 'Green / Slate', 'True Hatch',     'Mountain Rose',   100, 100, 100, 'Active', ''),
  ('Young Flash',     'Sweater',  'Rooster', 'Wheaten',            'Wheaten',  'Stag',    'Fast',          'Beanie',    '2025-02-20'::date, '2 Months',  '0.8 kg', '30 cm', 'White',         'Titan Sweater',  'Sunrise Queen',   100, 100, 100, 'Active', ''),
  ('Young Lemon',     'Lemon',    'Rooster', 'Black-Breasted Red', 'Red',      'Stag',    'Aggressive',    'Pearl',     '2025-01-25'::date, '3 Months',  '1.0 kg', '35 cm', 'Yellow',        'Iron Lemon',     'Golden Pearl',    100, 100, 100, 'Active', ''),
  ('Young Ace',       'Roundhead','Rooster', 'Wheaten',            'Wheaten',  'Stag',    'Clever',        'Pearl',     '2025-03-10'::date, '1 Month',  '0.5 kg', '23 cm', 'Willow',        'King Roundhead', 'Silver Princess', 100, 100, 100, 'Active', ''),
  ('Young Albany',    'Albany',   'Rooster', 'Dark Cornish',       'Dark',     'Stag',    'Fierce',        'Sta. Cruz', '2025-04-05'::date, '1 Month',  '0.6 kg', '25 cm', 'Black',         'Grand Albany',   'Dark Empress',    100, 100, 100, 'Active', ''),
  ('Roundhead Kid',   'Roundhead','Rooster', 'Wheaten',            'Wheaten',  'Stag',    'Clever',        'Pearl',     '2025-05-15'::date, '0 Months', '0.3 kg', '18 cm', 'Willow',        'Roundhead Flash','Roundhead Lady',  100, 100, 100, 'Active', ''),
  ('Cross Kid',       'Sweater',  'Rooster', 'Dark Red',           'Red',      'Stag',    'Bold',          'Sta. Cruz', '2025-03-20'::date, '1 Month',  '0.6 kg', '26 cm', 'Green / Slate', 'Sweater Gold',   'Hatch Lemon',     100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 13: Chicks (6)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Chick Alpha',    'Lemon',    'Rooster', 'Yellow',         'Yellow',   'Chick',   'Curious',       'Pearl',     '2025-08-01'::date, '0 Months', '0.1 kg', '10 cm', 'Yellow',        'Lemon Storm',    'Lemon Grace',     100, 100, 100, 'Active', ''),
  ('Chick Beta',     'Sweater',  'Hen',     'Yellow',         'Yellow',   'Chick',   'Calm',          'Beanie',    '2025-08-01'::date, '0 Months', '0.1 kg', '10 cm', 'White',         'Sweater Bolt',   'Sweater Angel',   100, 100, 100, 'Active', ''),
  ('Chick Gamma',    'Hatch',    'Rooster', 'Dark Yellow',    'Yellow',   'Chick',   'Bold',          'Sta. Cruz', '2025-07-15'::date, '0 Months', '0.1 kg', '11 cm', 'Green / Slate', 'Hatch Thunder',  'Mountain Rose',   100, 100, 100, 'Active', ''),
  ('Chick Delta',    'Roundhead','Hen',     'Yellow',         'Yellow',   'Chick',   'Gentle',        'Pearl',     '2025-07-15'::date, '0 Months', '0.1 kg', '10 cm', 'Willow',        'Roundhead Ace',  'Silver Princess', 100, 100, 100, 'Active', ''),
  ('Chick Epsilon',  'Kelso',    'Rooster', 'Yellow',         'Yellow',   'Chick',   'Curious',       'Beanie',    '2025-08-10'::date, '0 Months', '0.1 kg', '9 cm',  'Yellow',        'Boss Kelso',     'Red Duchess',     100, 100, 100, 'Active', ''),
  ('Chick Zeta',     'Albany',   'Rooster', 'Dark Yellow',    'Yellow',   'Chick',   'Alert',         'Sta. Cruz', '2025-08-10'::date, '0 Months', '0.1 kg', '9 cm',  'Black',         'Grand Albany',   'Dark Empress',    100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 14: Archived Birds (8)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, archive_reason, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Retired Champion',  'Lemon',    'Rooster', 'Black-Breasted Red', 'Red',     'Cock', 'Calm',      'Pearl',     '2023-01-15'::date, '32 Months', '2.5 kg', '58 cm', 'Yellow',        'Iron Lemon',     'Golden Pearl',    100, 100, 100, 'Archived', 'Retired from active competition', ''),
  ('Sold Warrior',      'Sweater',  'Rooster', 'Wheaten',            'Wheaten', 'Cock', 'Fast',      'Beanie',    '2023-04-20'::date, '30 Months', '2.3 kg', '56 cm', 'White',         'Titan Sweater',  'Sunrise Queen',   100, 100, 100, 'Archived', 'Sold to breeder in Manila',       ''),
  ('Transferred Ace',   'Hatch',    'Rooster', 'Dark Red',           'Red',     'Cock', 'Powerful',  'Sta. Cruz', '2023-03-10'::date, '31 Months', '2.4 kg', '57 cm', 'Green / Slate', 'True Hatch',     'Mountain Rose',   100, 100, 100, 'Archived', 'Transferred to partner farm',     ''),
  ('Inactive Star',     'Roundhead','Rooster', 'Wheaten',            'Wheaten', 'Cock', 'Clever',    'Pearl',     '2023-06-05'::date, '29 Months', '2.1 kg', '54 cm', 'Willow',        'King Roundhead', 'Silver Princess', 100, 100, 100, 'Archived', 'Inactive — no longer fighting',    ''),
  ('Sold Pearl',        'Kelso',    'Hen',     'Red',                'Red',     'Hen',  'Gentle',    'Pearl',     '2023-08-12'::date, '27 Months', '1.7 kg', '45 cm', 'Yellow',        'Boss Kelso',     'Red Duchess',     100, 100, 100, 'Archived', 'Sold to new owner',               ''),
  ('Retired Mother',    'Lemon',    'Hen',     'Wheaten',            'Wheaten', 'Hen',  'Calm',      'Pearl',     '2023-02-28'::date, '31 Months', '1.8 kg', '47 cm', 'Yellow',        'Iron Lemon',     'Golden Pearl',    100, 100, 100, 'Archived', 'Retired from breeding',            ''),
  ('Archived Fighter',  'Albany',   'Rooster', 'Dark Cornish',       'Dark',    'Cock', 'Bold',      'Sta. Cruz', '2023-05-15'::date, '30 Months', '2.6 kg', '59 cm', 'Black',         'Grand Albany',   'Dark Empress',    100, 100, 100, 'Archived', 'Injury — cannot compete',          ''),
  ('Sold Hatch',        'Hatch',    'Rooster', 'Dark Red',           'Red',     'Cock', 'Powerful',  'Sta. Cruz', '2023-07-20'::date, '28 Months', '2.2 kg', '55 cm', 'Green / Slate', 'True Hatch',     'Mountain Rose',   100, 100, 100, 'Archived', 'Sold to derby team',               '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, archive_reason, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 15: Deceased Birds (5)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, death_reason, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Fallen Hero',     'Sweater',  'Rooster', 'Wheaten',        'Wheaten', 'Cock', 'Brave',      'Beanie',    '2023-03-20'::date, '30 Months', '2.2 kg', '55 cm', 'White',         'Titan Sweater',  'Sunrise Queen',   100, 100, 100, 'Deceased', 'Died from injuries after championship match', ''),
  ('Brave Soul',      'Hatch',    'Rooster', 'Dark Red',       'Red',     'Cock', 'Powerful',   'Sta. Cruz', '2023-05-10'::date, '29 Months', '2.3 kg', '56 cm', 'Green / Slate', 'True Hatch',     'Mountain Rose',   100, 100, 100, 'Deceased', 'Fatal injury in derby final',      ''),
  ('Legacy',          'Lemon',    'Rooster', 'Black-Breasted Red','Red',   'Cock', 'Aggressive', 'Pearl',     '2023-02-05'::date, '32 Months', '2.4 kg', '57 cm', 'Yellow',        'Iron Lemon',     'Golden Pearl',    100, 100, 100, 'Deceased', 'Illness — respiratory infection',  ''),
  ('Honored Fallen',  'Roundhead','Rooster', 'Wheaten',        'Wheaten', 'Cock', 'Clever',     'Pearl',     '2023-06-15'::date, '28 Months', '2.0 kg', '53 cm', 'Willow',        'King Roundhead', 'Silver Princess', 100, 100, 100, 'Deceased', 'Critical injury — could not recover', ''),
  ('Remembered',      'Kelso',    'Rooster', 'Red',            'Red',     'Cock', 'Steady',     'Beanie',    '2023-04-25'::date, '30 Months', '2.1 kg', '54 cm', 'Yellow',        'Boss Kelso',     'Red Duchess',     100, 100, 100, 'Deceased', 'Died in transport to arena',       '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, death_reason, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 16: Sire Material Birds (6)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Proven Sire 1',   'Lemon',    'Rooster', 'Black-Breasted Red', 'Red',     'Cock', 'Aggressive',   'Pearl',     '2023-08-10'::date, '28 Months', '2.3 kg', '56 cm', 'Yellow',        'Iron Lemon',     'Golden Pearl',    100, 100, 100, 'Sire Material', ''),
  ('Proven Sire 2',   'Sweater',  'Rooster', 'Wheaten',            'Wheaten', 'Cock', 'Smart Fighter','Beanie',    '2023-09-15'::date, '27 Months', '2.2 kg', '55 cm', 'White',         'Titan Sweater',  'Sunrise Queen',   100, 100, 100, 'Sire Material', ''),
  ('Proven Sire 3',   'Hatch',    'Rooster', 'Dark Red',           'Red',     'Cock', 'Powerful',     'Sta. Cruz', '2023-10-20'::date, '26 Months', '2.4 kg', '57 cm', 'Green / Slate', 'True Hatch',     'Mountain Rose',   100, 100, 100, 'Sire Material', ''),
  ('Proven Sire 4',   'Roundhead','Rooster', 'Wheaten',            'Wheaten', 'Cock', 'Clever',       'Pearl',     '2023-07-25'::date, '29 Months', '2.1 kg', '54 cm', 'Willow',        'King Roundhead', 'Silver Princess', 100, 100, 100, 'Sire Material', ''),
  ('Proven Sire 5',   'Kelso',    'Rooster', 'Red',                'Red',     'Cock', 'Steady',       'Beanie',    '2023-11-01'::date, '25 Months', '2.3 kg', '56 cm', 'Yellow',        'Boss Kelso',     'Red Duchess',     100, 100, 100, 'Sire Material', ''),
  ('Proven Sire 6',   'Albany',   'Rooster', 'Dark Cornish',       'Dark',    'Cock', 'Bold',         'Sta. Cruz', '2023-06-30'::date, '30 Months', '2.5 kg', '58 cm', 'Black',         'Grand Albany',   'Dark Empress',    100, 100, 100, 'Sire Material', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 17: Pullets (4) â€” young females
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Young Pearl',     'Lemon',    'Pullet', 'Wheaten',            'Wheaten', 'Pullet', 'Calm',       'Pearl',     '2025-03-01'::date, '1 Month',  '0.5 kg', '24 cm', 'Yellow',        'Lemon Storm',    'Lemon Grace',     100, 100, 100, 'Active', ''),
  ('Young Angel',     'Sweater',  'Pullet', 'Wheaten',            'Wheaten', 'Pullet', 'Gentle',     'Beanie',    '2025-04-01'::date, '1 Month',  '0.4 kg', '22 cm', 'White',         'Sweater Bolt',   'Sweater Angel',   100, 100, 100, 'Active', ''),
  ('Young Rose',      'Hatch',    'Pullet', 'Dark Cornish',       'Dark',    'Pullet', 'Broody',     'Pearl',     '2025-02-15'::date, '2 Months',  '0.7 kg', '28 cm', 'Black',         'Hatch Thunder',  'Mountain Rose',   100, 100, 100, 'Active', ''),
  ('Young Duchess',   'Kelso',    'Pullet', 'Red',                'Red',     'Pullet', 'Alert',      'Beanie',    '2025-05-01'::date, '0 Months', '0.3 kg', '18 cm', 'Yellow',        'Boss Kelso',     'Red Duchess',     100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 18: Bull Stags (4) â€” 12-24 month males in training
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSERT INTO fowl (user_id, name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('Bull Storm',      'Hatch',    'Rooster', 'Dark Red',           'Red',     'Bull Stag', 'Powerful',   'Sta. Cruz', '2024-08-01'::date, '7 Months',  '1.9 kg', '50 cm', 'Green / Slate', 'Hatch Storm',    'Hatch Rose',      100, 100, 100, 'Active', ''),
  ('Bull Lemon',      'Lemon',    'Rooster', 'Black-Breasted Red', 'Red',     'Bull Stag', 'Aggressive', 'Pearl',     '2024-09-01'::date, '6 Months',  '1.7 kg', '48 cm', 'Yellow',        'Lemon Duke',     'Lemon Grace',     100, 100, 100, 'Active', ''),
  ('Bull Sweater',    'Sweater',  'Rooster', 'Wheaten',            'Wheaten', 'Bull Stag', 'Fast',       'Beanie',    '2024-07-15'::date, '8 Months',  '2.0 kg', '51 cm', 'White',         'Sweater Flash',  'Sweater Angel',   100, 100, 100, 'Active', ''),
  ('Bull Kelso',      'Kelso',    'Rooster', 'Red',                'Red',     'Bull Stag', 'Steady',     'Beanie',    '2024-06-01'::date, '9 Months',  '1.8 kg', '49 cm', 'Yellow',        'Kelso Express',  'Kelso Belle',     100, 100, 100, 'Active', '')
) AS v(name, breed, gender, color, color_category, growth_stage, behavior_trait, eye_variant, birthdate, age, weight, height, leg_color, sire, dam, sire_pct, dam_pct, bloodline_pct, status, image_url);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STEP 19: MATCH RECORDS â€” 100 matches covering all possibilities
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- === 2-COCK DERBY (15 matches) ===
INSERT INTO match (user_id, date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('2025-01-15'::date, 'Lemon Storm',    'Lemon',    'Rival Kelso Express',    'Kelso',    'Dingle Breeding Arena',       '2-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-02-10'::date, 'Lemon Blaze',    'Lemon',    'Rival Whitehackle Pro',  'Whitehackle','Pototan Coliseum',           '2-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-03-05'::date, 'Sweater Flash',  'Sweater',  'Rival Hatch Warrior',    'Hatch',    'Janiuay Cockpit Arena',       '2-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-04-01'::date, 'Sweater Bolt',   'Sweater',  'Rival Roundhead King',   'Roundhead','Dumangas Cockpit Arena',      '2-Cock Derby', 3, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-05-10'::date, 'Hatch Thunder',  'Hatch',    'Rival Kelso Express',    'Kelso',    'San Enrique Arena',           '2-Cock Derby', 1, 'Loss', 'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-06-15'::date, 'Hatch Storm',    'Hatch',    'Rival Sweater Blaze',    'Sweater',  'Iloilo Coliseum',             '2-Cock Derby', 2, 'Win',  'Verified', 'Minor Injury',                 2, 'Cock', 'Derby'),
  ('2025-07-01'::date, 'Lemon Duke',     'Lemon',    'Rival Lemon Fighter',    'Lemon',    'Passi Sports Complex',        '2-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-08-05'::date, 'Roundhead Ace',  'Roundhead','Rival Hatch Dominator',  'Hatch',    'Dingle Breeding Arena',       '2-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Stag', 'Derby'),
  ('2025-09-10'::date, 'Kelso Express',  'Kelso',    'Rival Whitehackle Pro',  'Whitehackle','Santa Barbara Sports Complex','2-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-10-01'::date, 'Elite Thunder',  'Lemon',    'Rival Sweater Bolt',     'Sweater',  'Local Farm Pit',              '2-Cock Derby', 3, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-11-15'::date, 'Lemon-Sweater Cross','Lemon','Rival Hatch Storm',      'Hatch',    'Dingle Breeding Arena',       '2-Cock Derby', 1, 'Loss', 'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-12-01'::date, 'Sweater Gold',   'Sweater',  'Rival Kelso Warrior',    'Kelso',    'Iloilo Coliseum',             '2-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2026-01-10'::date, 'Cross Champion', 'Hatch',    'Rival Roundhead Ace',    'Roundhead','Passi Sports Complex',        '2-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2026-02-15'::date, 'Ace Express',    'Roundhead','Rival Albany Storm',     'Albany',   'Dumangas Cockpit Arena',      '2-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Stag', 'Derby'),
  ('2026-03-20'::date, 'Flash Warrior',  'Kelso',    'Rival Lemon Storm',     'Lemon',    'San Enrique Arena',           '2-Cock Derby', 1, 'Loss', 'Verified', 'Severely Injured / Critical',  2, 'Cock', 'Derby')
) AS v(date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type);

-- === 3-COCK DERBY (15 matches) ===
INSERT INTO match (user_id, date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('2025-01-28'::date, 'Sweater Flash',   'Sweater',  'Rival Lemon Fighter',    'Lemon',    'Iloilo Coliseum',             '3-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-02-20'::date, 'Lemon Storm',     'Lemon',    'Rival Roundhead King',   'Roundhead','Dingle Breeding Arena',       '3-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-03-15'::date, 'Sweater Bolt',    'Sweater',  'Rival Hatch Dominator',  'Hatch',    'Pototan Coliseum',            '3-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-04-22'::date, 'Hatch Thunder',   'Hatch',    'Rival Sweater Blaze',    'Sweater',  'Janiuay Cockpit Arena',       '3-Cock Derby', 3, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-05-05'::date, 'Elite Thunder',   'Lemon',    'Rival Kelso Express',    'Kelso',    'Dumangas Cockpit Arena',      '3-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-06-20'::date, 'Storm Warrior',   'Hatch',    'Rival Lemon Fighter',    'Lemon',    'San Enrique Arena',           '3-Cock Derby', 2, 'Loss', 'Verified', 'Severely Injured / Critical',  3, 'Stag', 'Derby'),
  ('2025-07-15'::date, 'Lemon-Sweater Cross','Lemon','Rival Roundhead King',   'Roundhead','Iloilo Coliseum',             '3-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-08-10'::date, 'Sweater-Lemon Blend','Sweater','Rival Hatch Storm',    'Hatch',    'Passi Sports Complex',        '3-Cock Derby', 3, 'Loss', 'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-09-05'::date, 'Roundhead Ace',   'Roundhead','Rival Albany Storm',     'Albany',   'Dingle Breeding Arena',       '3-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-10-20'::date, 'Kelso Express',   'Kelso',    'Rival Sweater Bolt',     'Sweater',  'Santa Barbara Sports Complex','3-Cock Derby', 1, 'Win',  'Verified', 'Minor Injury',                 3, 'Cock', 'Derby'),
  ('2025-11-10'::date, 'Cross Champion',  'Hatch',    'Rival Lemon Duke',       'Lemon',    'Local Farm Pit',              '3-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-12-15'::date, 'Bull Storm',      'Hatch',    'Rival Kelso Warrior',    'Kelso',    'Iloilo Coliseum',             '3-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Stag', 'Derby'),
  ('2026-01-25'::date, 'Bull Lemon',      'Lemon',    'Rival Roundhead Flash',  'Roundhead','Dumangas Cockpit Arena',      '3-Cock Derby', 3, 'Win',  'Verified', 'Fit / Recovered',              3, 'Stag', 'Derby'),
  ('2026-02-28'::date, 'Elite Flash',     'Lemon',    'Rival Hatch Thunder',    'Hatch',    'San Enrique Arena',           '3-Cock Derby', 1, 'Loss', 'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2026-03-15'::date, 'Ace Express',     'Roundhead','Rival Sweater Flash',    'Sweater',  'Passi Sports Complex',        '3-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              3, 'Stag', 'Derby')
) AS v(date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type);

-- === 4-COCK DERBY (10 matches) ===
INSERT INTO match (user_id, date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('2025-02-05'::date, 'Sweater Bolt',    'Sweater',  'Rival Whitehackle Pro',  'Whitehackle','Passi Sports Complex',        '4-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              4, 'Cock', 'Derby'),
  ('2025-03-20'::date, 'Lemon Duke',      'Lemon',    'Rival Hatch Dominator',  'Hatch',    'Dingle Breeding Arena',       '4-Cock Derby', 2, 'Loss', 'Verified', 'Fit / Recovered',              4, 'Cock', 'Derby'),
  ('2025-04-15'::date, 'Hatch Thunder',   'Hatch',    'Rival Kelso Express',    'Kelso',    'Iloilo Coliseum',             '4-Cock Derby', 3, 'Win',  'Verified', 'Fit / Recovered',              4, 'Cock', 'Derby'),
  ('2025-05-25'::date, 'Kelso Warrior',   'Kelso',    'Rival Lemon Storm',      'Lemon',    'Janiuay Cockpit Arena',       '4-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              4, 'Cock', 'Derby'),
  ('2025-06-30'::date, 'Roundhead Flash', 'Roundhead','Rival Sweater Angel',    'Sweater',  'Dumangas Cockpit Arena',      '4-Cock Derby', 2, 'Win',  'Verified', 'Minor Injury',                 4, 'Cock', 'Derby'),
  ('2025-08-15'::date, 'Albany Storm',    'Albany',   'Rival Hatch Storm',      'Hatch',    'San Enrique Arena',           '4-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              4, 'Stag', 'Derby'),
  ('2025-09-20'::date, 'Storm Warrior',   'Hatch',    'Rival Kelso Mountain',   'Kelso',    'Santa Barbara Sports Complex','4-Cock Derby', 3, 'Loss', 'Verified', 'Severely Injured / Critical',  4, 'Cock', 'Derby'),
  ('2025-11-05'::date, 'Lemon-Mountain',  'Lemon',    'Rival Roundhead Boss',   'Roundhead','Local Farm Pit',              '4-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              4, 'Cock', 'Derby'),
  ('2026-01-05'::date, 'Sweater-Mountain','Sweater',  'Rival Albany Duchess',   'Albany',   'Dingle Breeding Arena',       '4-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              4, 'Cock', 'Derby'),
  ('2026-03-01'::date, 'Bull Sweater',    'Sweater',  'Rival Lemon Duke',       'Lemon',    'Iloilo Coliseum',             '4-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              4, 'Stag', 'Derby')
) AS v(date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type);

-- === 5-COCK DERBY (10 matches) ===
INSERT INTO match (user_id, date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('2025-03-01'::date, 'Hatch Storm',     'Hatch',    'Rival Kelso Express',    'Kelso',    'Iloilo Coliseum',             '5-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              5, 'Cock', 'Derby'),
  ('2025-04-10'::date, 'Lemon Storm',     'Lemon',    'Rival Roundhead King',   'Roundhead','Dingle Breeding Arena',       '5-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              5, 'Cock', 'Derby'),
  ('2025-05-20'::date, 'Sweater Flash',   'Sweater',  'Rival Hatch Warrior',    'Hatch',    'Pototan Coliseum',            '5-Cock Derby', 3, 'Loss', 'Verified', 'Fit / Recovered',              5, 'Cock', 'Derby'),
  ('2025-06-25'::date, 'Kelso Mountain',  'Kelso',    'Rival Whitehackle Pro',  'Whitehackle','Janiuay Cockpit Arena',       '5-Cock Derby', 1, 'Win',  'Verified', 'Minor Injury',                 5, 'Cock', 'Derby'),
  ('2025-07-20'::date, 'Roundhead Boss',  'Roundhead','Rival Sweater Blaze',    'Sweater',  'Dumangas Cockpit Arena',      '5-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              5, 'Cock', 'Derby'),
  ('2025-08-25'::date, 'Albany Duchess',  'Albany',   'Rival Lemon Fighter',    'Lemon',    'San Enrique Arena',           '5-Cock Derby', 3, 'Win',  'Verified', 'Fit / Recovered',              5, 'Cock', 'Derby'),
  ('2025-10-10'::date, 'Lemon-Mountain',  'Lemon',    'Rival Hatch Storm',      'Hatch',    'Passi Sports Complex',        '5-Cock Derby', 1, 'Loss', 'Verified', 'Deceased (Died from injuries)', 5, 'Cock', 'Derby'),
  ('2025-12-01'::date, 'Sweater-Mountain','Sweater',  'Rival Kelso Warrior',    'Kelso',    'Santa Barbara Sports Complex','5-Cock Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              5, 'Cock', 'Derby'),
  ('2026-02-01'::date, 'Hatch White',     'Hatch',    'Rival Roundhead Ace',    'Roundhead','Local Farm Pit',              '5-Cock Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              5, 'Cock', 'Derby'),
  ('2026-03-25'::date, 'Bull Kelso',      'Kelso',    'Rival Albany Storm',     'Albany',   'Dingle Breeding Arena',       '5-Cock Derby', 3, 'Win',  'Verified', 'Fit / Recovered',              5, 'Stag', 'Derby')
) AS v(date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type);

-- === DERBY (15 matches) ===
INSERT INTO match (user_id, date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('2025-01-10'::date, 'Lemon Storm',     'Lemon',    'Rival Kelso Express',    'Kelso',    'Dingle Breeding Arena',       'Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-02-15'::date, 'Lemon Blaze',     'Lemon',    'Rival Roundhead King',   'Roundhead','Iloilo Coliseum',             'Derby', 2, 'Loss', 'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-03-10'::date, 'Sweater Flash',   'Sweater',  'Rival Hatch Dominator',  'Hatch',    'Passi Sports Complex',        'Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-04-05'::date, 'Hatch Thunder',   'Hatch',    'Rival Sweater Blaze',    'Sweater',  'Pototan Coliseum',            'Derby', 3, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-05-15'::date, 'Sweater Bolt',    'Sweater',  'Rival Lemon Fighter',    'Lemon',    'Janiuay Cockpit Arena',       'Derby', 1, 'Win',  'Verified', 'Severely Injured / Critical',  2, 'Cock', 'Derby'),
  ('2025-06-10'::date, 'Hatch Storm',     'Hatch',    'Rival Kelso Express',    'Kelso',    'Dumangas Cockpit Arena',      'Derby', 2, 'Loss', 'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-07-05'::date, 'Lemon Duke',      'Lemon',    'Rival Roundhead King',   'Roundhead','San Enrique Arena',           'Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-08-01'::date, 'Elite Thunder',   'Lemon',    'Rival Sweater Angel',    'Sweater',  'Santa Barbara Sports Complex','Derby', 3, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-09-15'::date, 'Kelso Express',   'Kelso',    'Rival Lemon Duke',       'Lemon',    'Local Farm Pit',              'Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-10-25'::date, 'Roundhead Ace',   'Roundhead','Rival Hatch Storm',      'Hatch',    'Dingle Breeding Arena',       'Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Stag', 'Derby'),
  ('2025-11-20'::date, 'Lemon-Sweater Cross','Lemon','Rival Kelso Warrior',    'Kelso',    'Iloilo Coliseum',             'Derby', 1, 'Loss', 'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-12-20'::date, 'Sweater Gold',    'Sweater',  'Rival Albany Storm',     'Albany',   'Passi Sports Complex',        'Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2026-01-15'::date, 'Cross Champion',  'Hatch',    'Rival Roundhead Ace',    'Roundhead','Pototan Coliseum',            'Derby', 1, 'Win',  'Verified', 'Minor Injury',                 2, 'Cock', 'Derby'),
  ('2026-02-10'::date, 'Ace Express',     'Roundhead','Rival Sweater Bolt',     'Sweater',  'Dumangas Cockpit Arena',      'Derby', 3, 'Win',  'Verified', 'Fit / Recovered',              2, 'Stag', 'Derby'),
  ('2026-03-10'::date, 'Flash Warrior',   'Kelso',    'Rival Lemon Storm',      'Lemon',    'San Enrique Arena',           'Derby', 1, 'Loss', 'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby')
) AS v(date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type);

-- === LUSONG (15 matches) ===
INSERT INTO match (user_id, date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('2025-01-20'::date, 'Lemon Storm',     'Lemon',    'Rival Hatch Warrior',    'Hatch',    'Dingle Breeding Arena',       'Lusong', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Lusong'),
  ('2025-02-25'::date, 'Sweater Bolt',    'Sweater',  'Rival Kelso Express',    'Kelso',    'Iloilo Coliseum',             'Lusong', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Lusong'),
  ('2025-03-25'::date, 'Hatch Thunder',   'Hatch',    'Rival Lemon Fighter',    'Lemon',    'Passi Sports Complex',        'Lusong', 1, 'Loss', 'Verified', 'Fit / Recovered',              2, 'Cock', 'Lusong'),
  ('2025-04-20'::date, 'Lemon Duke',      'Lemon',    'Rival Roundhead King',   'Roundhead','Pototan Coliseum',            'Lusong', 3, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Lusong'),
  ('2025-05-30'::date, 'Sweater Flash',   'Sweater',  'Rival Hatch Dominator',  'Hatch',    'Janiuay Cockpit Arena',       'Lusong', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Lusong'),
  ('2025-06-25'::date, 'Hatch Storm',     'Hatch',    'Rival Whitehackle Pro',  'Whitehackle','Dumangas Cockpit Arena',      'Lusong', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Stag', 'Lusong'),
  ('2025-07-10'::date, 'Roundhead Flash', 'Roundhead','Rival Sweater Blaze',    'Sweater',  'San Enrique Arena',           'Lusong', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Lusong'),
  ('2025-08-20'::date, 'Kelso Warrior',   'Kelso',    'Rival Lemon Storm',      'Lemon',    'Santa Barbara Sports Complex','Lusong', 3, 'Loss', 'Verified', 'Minor Injury',                 2, 'Cock', 'Lusong'),
  ('2025-09-25'::date, 'Elite Flash',     'Lemon',    'Rival Hatch Thunder',    'Hatch',    'Local Farm Pit',              'Lusong', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Lusong'),
  ('2025-10-30'::date, 'Storm Queen',     'Hatch',    'Rival Kelso Express',    'Kelso',    'Dingle Breeding Arena',       'Lusong', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Hen',  'Lusong'),
  ('2025-11-25'::date, 'Lemon-Mountain',  'Lemon',    'Rival Roundhead Ace',    'Roundhead','Iloilo Coliseum',             'Lusong', 1, 'Loss', 'Verified', 'Fit / Recovered',              2, 'Cock', 'Lusong'),
  ('2025-12-25'::date, 'Sweater-Mountain','Sweater',  'Rival Albany Storm',     'Albany',   'Passi Sports Complex',        'Lusong', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Lusong'),
  ('2026-01-20'::date, 'Cross Champion',  'Hatch',    'Rival Lemon Duke',       'Lemon',    'Pototan Coliseum',            'Lusong', 3, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Lusong'),
  ('2026-02-20'::date, 'Bull Storm',      'Hatch',    'Rival Kelso Mountain',   'Kelso',    'Dumangas Cockpit Arena',      'Lusong', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Stag', 'Lusong'),
  ('2026-03-28'::date, 'Bull Lemon',      'Lemon',    'Rival Sweater Flash',    'Sweater',  'San Enrique Arena',           'Lusong', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Stag', 'Lusong')
) AS v(date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type);

-- === SPECIAL DERBY (10 matches) ===
INSERT INTO match (user_id, date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('2025-03-30'::date, 'Lemon Storm',     'Lemon',    'Rival Sweater Blaze',    'Sweater',  'Iloilo Coliseum',             'Special Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-04-25'::date, 'Hatch Thunder',   'Hatch',    'Rival Kelso Express',    'Kelso',    'Dingle Breeding Arena',       'Special Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-05-30'::date, 'Sweater Bolt',    'Sweater',  'Rival Roundhead King',   'Roundhead','Passi Sports Complex',        'Special Derby', 3, 'Loss', 'Verified', 'Severely Injured / Critical',  3, 'Cock', 'Derby'),
  ('2025-07-05'::date, 'Kelso Express',   'Kelso',    'Rival Lemon Fighter',    'Lemon',    'Pototan Coliseum',            'Special Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-08-30'::date, 'Roundhead Ace',   'Roundhead','Rival Hatch Storm',      'Hatch',    'Janiuay Cockpit Arena',       'Special Derby', 2, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-10-05'::date, 'Lemon-Mountain',  'Lemon',    'Rival Sweater Angel',    'Sweater',  'Dumangas Cockpit Arena',      'Special Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-11-30'::date, 'Sweater-Mountain','Sweater',  'Rival Albany Duchess',   'Albany',   'San Enrique Arena',           'Special Derby', 3, 'Win',  'Verified', 'Minor Injury',                 3, 'Cock', 'Derby'),
  ('2026-01-30'::date, 'Cross Champion',  'Hatch',    'Rival Lemon Duke',       'Lemon',    'Santa Barbara Sports Complex','Special Derby', 2, 'Loss', 'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2026-02-25'::date, 'Ace Express',     'Roundhead','Rival Kelso Warrior',    'Kelso',    'Local Farm Pit',              'Special Derby', 1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Stag', 'Derby'),
  ('2026-03-30'::date, 'Flash Warrior',   'Kelso',    'Rival Albany Storm',     'Albany',   'Dingle Breeding Arena',       'Special Derby', 3, 'Win',  'Verified', 'Fit / Recovered',              3, 'Stag', 'Derby')
) AS v(date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type);

-- === CUSTOM TYPES (10 matches) â€” user-typed events ===
INSERT INTO match (user_id, date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type)
SELECT (SELECT id::text FROM auth.users LIMIT 1), v.*
FROM (VALUES
  ('2025-01-05'::date, 'Retired Champion', 'Lemon',    'Rival Old Guard',        'Mixed',    'Local Farm Pit',              'Main Event / Solo', 1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-02-08'::date, 'Fallen Hero',      'Sweater',  'Rival Hatch Warrior',    'Hatch',    'Dingle Breeding Arena',       'Regional Circuit',  1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-03-12'::date, 'Brave Soul',       'Hatch',    'Rival Kelso Express',    'Kelso',    'Iloilo Coliseum',             'Championship',      1, 'Win',  'Verified', 'Fit / Recovered',              4, 'Cock', 'Derby'),
  ('2025-04-18'::date, 'Legacy',           'Lemon',    'Rival Roundhead King',   'Roundhead','Passi Sports Complex',        'Cockfight Derby',   1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-05-22'::date, 'Honored Fallen',   'Roundhead','Rival Sweater Blaze',    'Sweater',  'Pototan Coliseum',            'Local Derby',       1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-06-18'::date, 'Remembered',       'Kelso',    'Rival Lemon Fighter',    'Lemon',    'Janiuay Cockpit Arena',       'Special Lusong',    1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Lusong'),
  ('2025-07-25'::date, 'Retired Champion', 'Lemon',    'Rival Old Guard',        'Mixed',    'Local Farm Pit',              'Main Event / Solo', 2, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby'),
  ('2025-08-15'::date, 'Sold Warrior',     'Sweater',  'Rival Hatch Dominator',  'Hatch',    'Dumangas Cockpit Arena',      'Regional Circuit',  1, 'Win',  'Verified', 'Fit / Recovered',              3, 'Cock', 'Derby'),
  ('2025-09-30'::date, 'Transferred Ace',  'Hatch',    'Rival Kelso Express',    'Kelso',    'San Enrique Arena',           'Championship',      1, 'Loss', 'Verified', 'Deceased (Died from injuries)', 4, 'Cock', 'Derby'),
  ('2025-11-15'::date, 'Inactive Star',    'Roundhead','Rival Whitehackle Pro',  'Whitehackle','Santa Barbara Sports Complex','Local Derby',       1, 'Win',  'Verified', 'Fit / Recovered',              2, 'Cock', 'Derby')
) AS v(date, entry_name, breed, opponent, opponent_breed, location, type, derby_match_number, outcome, status, post_fight_condition, cock_count, age_category, event_type);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- VERIFICATION QUERIES
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Total counts
SELECT 'FOWL COUNT' as label, COUNT(*) as total FROM fowl WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1)
UNION ALL
SELECT 'MATCH COUNT', COUNT(*) FROM match WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1);

-- Fowl by status
SELECT status, COUNT(*) as count FROM fowl WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1) GROUP BY status ORDER BY count DESC;

-- Fowl by growth_stage
SELECT growth_stage, COUNT(*) as count FROM fowl WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1) GROUP BY growth_stage ORDER BY count DESC;

-- Fowl by breed
SELECT breed, COUNT(*) as count FROM fowl WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1) GROUP BY breed ORDER BY count DESC;

-- Match outcomes
SELECT outcome, COUNT(*) as count FROM match WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1) GROUP BY outcome ORDER BY count DESC;

-- Match by type
SELECT type, COUNT(*) as count FROM match WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1) GROUP BY type ORDER BY count DESC;

-- Match by event_type
SELECT event_type, COUNT(*) as count FROM match WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1) GROUP BY event_type ORDER BY count DESC;

-- Match by cock_count
SELECT cock_count, COUNT(*) as count FROM match WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1) GROUP BY cock_count ORDER BY cock_count;

-- Match by age_category
SELECT age_category, COUNT(*) as count FROM match WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1) GROUP BY age_category ORDER BY count DESC;

-- Post-fight conditions
SELECT post_fight_condition, COUNT(*) as count FROM match WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1) GROUP BY post_fight_condition ORDER BY count DESC;

-- Win rates per bird
SELECT entry_name,
       COUNT(*) as total_fights,
       SUM(CASE WHEN outcome = 'Win' THEN 1 ELSE 0 END) as wins,
       SUM(CASE WHEN outcome = 'Loss' THEN 1 ELSE 0 END) as losses,
       SUM(CASE WHEN outcome = 'Draw' THEN 1 ELSE 0 END) as draws,
       ROUND(100.0 * SUM(CASE WHEN outcome = 'Win' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN outcome IN ('Win','Loss','Draw') THEN 1 ELSE 0 END), 0), 1) as win_rate
FROM match
WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1)
GROUP BY entry_name
ORDER BY total_fights DESC, win_rate DESC NULLS LAST;

-- Full sibling families
SELECT 'FULL SIBLINGS' as group_type, sire, dam, COUNT(*) as bird_count,
       STRING_AGG(name, ', ' ORDER BY name) as members
FROM fowl
WHERE user_id = (SELECT id::text FROM auth.users LIMIT 1)
  AND sire != 'Foundation Stock' AND dam != 'Foundation Stock'
GROUP BY sire, dam
HAVING COUNT(*) >= 2
ORDER BY bird_count DESC;

-- DONE! 100 Fowls + 100 Matches seeded successfully.
