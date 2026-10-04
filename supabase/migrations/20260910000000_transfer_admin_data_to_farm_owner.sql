-- Transfer fowl and match data from admin account to farm owner account
-- Run this in Supabase SQL Editor

-- Step 1: Find both user IDs
DO $$
DECLARE
  admin_user_id UUID;
  owner_user_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'datoonhazel092@gmail.com';
  
  -- Get farm owner user ID
  SELECT id INTO owner_user_id FROM auth.users WHERE email = 'hazeldato-on@isufst.edu.ph';
  
  -- Step 2: Transfer fowls
  UPDATE fowl SET user_id = owner_user_id WHERE user_id = admin_user_id;
  
  -- Step 3: Transfer matches
  UPDATE match SET user_id = owner_user_id WHERE user_id = admin_user_id;
  
  -- Step 4: Verify transfer
  RAISE NOTICE 'Transferred data from admin (%) to farm owner (%)', admin_user_id, owner_user_id;
  RAISE NOTICE 'Fowls transferred: %', (SELECT COUNT(*) FROM fowl WHERE user_id = owner_user_id);
  RAISE NOTICE 'Matches transferred: %', (SELECT COUNT(*) FROM match WHERE user_id = owner_user_id);
END $$;
