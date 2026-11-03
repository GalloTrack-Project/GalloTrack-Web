-- Chicken photo support
--
-- Additive only: existing fowl.image_url and the fowl_photos gallery are left
-- untouched. New uploads store only private storage paths on the fowl row.
--
-- Storage layout:
--   chicken-photos/<user_id>/<fowl_id>/<timestamp>-<random>-full.webp
--   chicken-photos/<user_id>/<fowl_id>/<timestamp>-<random>-thumb.webp
--
-- The bucket is private. The app signs paths for the owner, and all upload and
-- delete calls go through authenticated API routes that also verify fowl
-- ownership. These policies make the ownership rule explicit if clients ever
-- talk to Storage directly.

ALTER TABLE public.fowl ADD COLUMN IF NOT EXISTS photo_path TEXT;
ALTER TABLE public.fowl ADD COLUMN IF NOT EXISTS photo_thumb_path TEXT;

COMMENT ON COLUMN public.fowl.photo_path IS
  'Private chicken-photos object path for the full-size chicken photo.';
COMMENT ON COLUMN public.fowl.photo_thumb_path IS
  'Private chicken-photos object path for the 256px square chicken thumbnail.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chicken-photos',
  'chicken-photos',
  false,
  5242880, -- 5 MB per processed image
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- storage.objects is owned by supabase_storage_admin on hosted Supabase, so the
-- SQL editor may not be able to edit storage policies. If this block raises a
-- NOTICE instead of applying, paste the CREATE POLICY statements below into
-- Dashboard -> Storage -> Policies.
DO $$
BEGIN
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "owner_select_chicken_photos" ON storage.objects;
  CREATE POLICY "owner_select_chicken_photos"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'chicken-photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "owner_insert_chicken_photos" ON storage.objects;
  CREATE POLICY "owner_insert_chicken_photos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'chicken-photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
      AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    );

  DROP POLICY IF EXISTS "owner_update_chicken_photos" ON storage.objects;
  CREATE POLICY "owner_update_chicken_photos"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'chicken-photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'chicken-photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
      AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    );

  DROP POLICY IF EXISTS "owner_delete_chicken_photos" ON storage.objects;
  CREATE POLICY "owner_delete_chicken_photos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'chicken-photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'chicken-photos storage policies were NOT applied. Create owner_select_chicken_photos, owner_insert_chicken_photos, owner_update_chicken_photos and owner_delete_chicken_photos in Dashboard -> Storage -> Policies.';
END $$;

-- Verification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'fowl'
  AND column_name IN ('photo_path', 'photo_thumb_path')
ORDER BY column_name;

SELECT id, public, file_size_limit
FROM storage.buckets
WHERE id = 'chicken-photos';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE '%chicken_photos%'
ORDER BY policyname;
