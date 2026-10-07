-- Match media privacy hardening (videos + photos)
--
-- 1) poster_url column on match_videos (client-captured first frame, optional)
-- 2) match-videos bucket -> private (100 MB cap, video mime allow-list)
-- 3) new private match-photos bucket (10 MB cap, image mime allow-list)
-- 4) revoke public read on match-videos; owner-scoped SELECT policies so only
--    the file's owner can mint signed URLs for private match media
--
-- The app is designed to work BEFORE and AFTER this migration:
--   * lib/media-privacy.ts signs storage paths for private buckets and passes
--     public/legacy URLs through unchanged (fallback to the raw URL if signing
--     is unavailable).
--   * Until the match-photos bucket exists, /api/match/photo falls back to the
--     legacy public fowl-images bucket so recording matches never breaks.
-- Legacy match photos already stored in fowl-images remain public: that bucket
-- also serves app-wide chicken gallery images, so it is intentionally NOT
-- privatized here.

-- ---------------------------------------------------------------------------
-- 1) Poster frames for match videos
-- ---------------------------------------------------------------------------
ALTER TABLE match_videos ADD COLUMN IF NOT EXISTS poster_url TEXT;

COMMENT ON COLUMN match_videos.poster_url IS
  'Optional first-frame thumbnail captured in the browser at upload time; stored in the private match-photos bucket.';

-- ---------------------------------------------------------------------------
-- 2) match-videos: ensure bucket row exists and is private
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'match-videos',
  'match-videos',
  false,
  104857600, -- 100 MB
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 3) match-photos: new private bucket (match photos + video poster frames)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'match-photos',
  'match-photos',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 4) RLS: no anonymous reads of match videos; owner-only signed reads
-- ---------------------------------------------------------------------------
-- storage.objects is owned by supabase_storage_admin. On hosted Supabase the
-- SQL editor / `supabase db push` connect as postgres, which CANNOT edit
-- storage policies (ERROR 42501 must be owner of table objects). The block
-- below therefore degrades to a NOTICE; add the policies manually in
-- Dashboard -> Storage -> Policies (paste the two CREATE POLICY statements).
DO $$
BEGIN
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  -- Anyone-with-the-URL read is no longer acceptable for match videos.
  DROP POLICY IF EXISTS "public_read_match_videos" ON storage.objects;

  -- createSignedUrl() checks SELECT permission on the object row, so this is
  -- what lets an owner open their own private media — and nobody else's.
  -- Objects are uploaded under {owner_uid}/... so folder check = ownership.
  DROP POLICY IF EXISTS "owner_select_match_videos" ON storage.objects;
  CREATE POLICY "owner_select_match_videos"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'match-videos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "owner_select_match_photos" ON storage.objects;
  CREATE POLICY "owner_select_match_photos"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'match-photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'storage policies NOT applied (must be owner of storage.objects). Run in Dashboard -> Storage -> Policies: DELETE "public_read_match_videos", then CREATE "owner_select_match_videos" and "owner_select_match_photos" (statements are in this migration file, section 4).';
END $$;

-- NOTE: uploads/deletes for both buckets go through the authenticated API
-- routes with the service role key (RLS bypassed), and the legacy
-- authenticated_upload_match_videos / authenticated_delete_match_videos
-- policies remain in place for compatibility with older clients.

-- ---------------------------------------------------------------------------
-- Verification (expected output shown after each statement)
-- ---------------------------------------------------------------------------
-- Buckets: match-videos=false/104857600, match-photos=false/10485760,
--          fowl-images=true (unchanged, app-wide galleries)
SELECT id, public, file_size_limit FROM storage.buckets
WHERE id IN ('match-videos', 'match-photos', 'fowl-images')
ORDER BY id;

-- Policies: owner_select_match_videos + owner_select_match_photos present,
--           public_read_match_videos gone
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE '%match%'
ORDER BY policyname;
