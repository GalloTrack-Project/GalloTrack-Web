-- Ensure farm_name column exists on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS farm_name text;

-- Backfill profiles.farm_name from farms table (source of truth for registration data)
UPDATE profiles p
SET farm_name = f.farm_name,
    updated_at = now()
FROM farms f
WHERE p.id = f.owner_id
  AND (p.farm_name IS NULL OR p.farm_name = '');

-- Backfill profiles.farm_name from auth.users user_metadata
UPDATE profiles p
SET farm_name = au.raw_user_meta_data ->> 'farm_name',
    updated_at = now()
FROM auth.users au
WHERE p.id = au.id
  AND (p.farm_name IS NULL OR p.farm_name = '')
  AND au.raw_user_meta_data ->> 'farm_name' IS NOT NULL
  AND au.raw_user_meta_data ->> 'farm_name' != '';

-- Sync farms table from profiles where farms is missing but profiles has data
INSERT INTO farms (owner_id, farm_name, contact_number, created_at, updated_at)
SELECT p.id, p.farm_name, p.contact_number, now(), now()
FROM profiles p
LEFT JOIN farms f ON f.owner_id = p.id
WHERE f.id IS NULL
  AND p.farm_name IS NOT NULL
  AND p.farm_name != ''
ON CONFLICT (owner_id) DO UPDATE
SET farm_name = EXCLUDED.farm_name,
    contact_number = EXCLUDED.contact_number,
    updated_at = now();
