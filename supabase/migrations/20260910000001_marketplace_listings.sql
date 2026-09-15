-- Marketplace listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  fowl_id TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'PHP',
  breed TEXT NOT NULL,
  gender TEXT NOT NULL,
  age TEXT DEFAULT '',
  weight TEXT DEFAULT '',
  color TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged', 'removed', 'sold')),
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Farm owners can view approved listings + their own
CREATE POLICY "view_listings" ON marketplace_listings
  FOR SELECT USING (
    status = 'approved'
    OR user_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND (is_admin = true OR role = 'admin'))
  );

-- Farm owners can create listings
CREATE POLICY "create_listings" ON marketplace_listings
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND is_active != false)
  );

-- Farm owners can update their own listings
CREATE POLICY "update_own_listings" ON marketplace_listings
  FOR UPDATE USING (
    user_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND (is_admin = true OR role = 'admin'))
  );

-- Farm owners can delete their own, admins can delete any
CREATE POLICY "delete_listings" ON marketplace_listings
  FOR DELETE USING (
    user_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND (is_admin = true OR role = 'admin'))
  );

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_marketplace_user_id ON marketplace_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_listings(status);
