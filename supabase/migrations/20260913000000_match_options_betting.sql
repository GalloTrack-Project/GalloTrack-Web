-- Match options/betting mechanics table
-- Supports options 1-5, bet types (durbe/lusok/contra/bulsay), and partner matching

CREATE TABLE IF NOT EXISTS match_options (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES match(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  option_number INT NOT NULL CHECK (option_number >= 1 AND option_number <= 5),
  fowl_entry TEXT NOT NULL,
  partner_entry TEXT,
  bet_type TEXT NOT NULL DEFAULT 'durbe' CHECK (bet_type IN ('durbe', 'lusok', 'contra', 'bulsay')),
  target_number INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'settled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_options_user_id ON match_options(user_id);
CREATE INDEX IF NOT EXISTS idx_match_options_match_id ON match_options(match_id);
CREATE INDEX IF NOT EXISTS idx_match_options_status ON match_options(status);
CREATE INDEX IF NOT EXISTS idx_match_options_target ON match_options(target_number, bet_type, status);

-- RLS: Owner isolation
ALTER TABLE match_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_options_owner_select" ON match_options;
CREATE POLICY "match_options_owner_select" ON match_options
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "match_options_owner_insert" ON match_options;
CREATE POLICY "match_options_owner_insert" ON match_options
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "match_options_owner_update" ON match_options;
CREATE POLICY "match_options_owner_update" ON match_options
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "match_options_owner_delete" ON match_options;
CREATE POLICY "match_options_owner_delete" ON match_options
  FOR DELETE USING (user_id = auth.uid());

-- Admin read access
DROP POLICY IF EXISTS "match_options_admin_select" ON match_options;
CREATE POLICY "match_options_admin_select" ON match_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id::uuid = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );
