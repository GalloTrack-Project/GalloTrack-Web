-- ==============================================================================
-- GALLOTRACK: MATCH RECORD COMPLETENESS (suggestions round 2)
-- (idempotent, re-run safe)
--
-- 1. Opponent details on match: bloodline, hatch date, photo
-- 2. Media: match_videos (up to 3 per match), match_photos, fowl_photos gallery
-- 3. share_links: view-only share tokens (public read goes through the
--    /api/share/[token] route using the service role — anon has NO table access)
--
-- Storage note: match photos upload to the existing fowl/ folder of the
-- fowl-images bucket (covered by authenticated_upload_fowl + public read).
-- storage.objects is owned by supabase_storage_admin and cannot be altered
-- from the SQL editor, so no storage statements are included here.
-- ==============================================================================

ALTER TABLE match ADD COLUMN IF NOT EXISTS opponent_bloodline TEXT;
ALTER TABLE match ADD COLUMN IF NOT EXISTS opponent_birthdate TEXT;
ALTER TABLE match ADD COLUMN IF NOT EXISTS opponent_photo_url TEXT;

-- Match videos (multi-upload, capped at 3 in app code)
CREATE TABLE IF NOT EXISTS match_videos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id    BIGINT NOT NULL REFERENCES match(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_match_videos_match ON match_videos(match_id);

-- Match photos
CREATE TABLE IF NOT EXISTS match_photos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id    BIGINT NOT NULL REFERENCES match(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  caption     TEXT,
  sort_order  INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_match_photos_match ON match_photos(match_id);

-- Chicken photo gallery (image_url stays the main/first photo)
CREATE TABLE IF NOT EXISTS fowl_photos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fowl_id     BIGINT NOT NULL REFERENCES fowl(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  caption     TEXT,
  sort_order  INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fowl_photos_fowl ON fowl_photos(fowl_id);

-- View-only share links
CREATE TABLE IF NOT EXISTS share_links (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('match', 'fowl')),
  entity_id   BIGINT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_share_links_entity ON share_links(entity_type, entity_id);

-- RLS: owner-only (public access only via /api/share/[token] service route)
ALTER TABLE match_videos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_photos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fowl_photos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links   ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['match_videos', 'match_photos', 'fowl_photos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (user_id = auth.uid())', t || '_owner_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (user_id = auth.uid())', t || '_owner_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t || '_owner_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner_delete', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (user_id = auth.uid())', t || '_owner_delete', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "share_links_owner_select" ON share_links;
CREATE POLICY "share_links_owner_select" ON share_links
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "share_links_owner_insert" ON share_links;
CREATE POLICY "share_links_owner_insert" ON share_links
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "share_links_owner_delete" ON share_links;
CREATE POLICY "share_links_owner_delete" ON share_links
  FOR DELETE USING (user_id = auth.uid());
