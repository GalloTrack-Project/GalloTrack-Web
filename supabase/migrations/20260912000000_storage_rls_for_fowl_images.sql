-- Storage RLS policies for fowl-images bucket
-- Allows authenticated users to upload/view images in profiles/ and fowl/ subfolders

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload to profiles/ subfolder
CREATE POLICY "authenticated_upload_profiles"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fowl-images'
    AND (storage.foldername(name))[1] = 'profiles'
  );

-- Allow authenticated users to upload to fowl/ subfolder
CREATE POLICY "authenticated_upload_fowl"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fowl-images'
    AND (storage.foldername(name))[1] = 'fowl'
  );

-- Allow public read access to fowl-images bucket
CREATE POLICY "public_read_fowl_images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'fowl-images');

-- Allow authenticated users to update their own profile images
CREATE POLICY "authenticated_update_own_profile_images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'fowl-images'
    AND (storage.foldername(name))[1] = 'profiles'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Allow authenticated users to delete their own profile images
CREATE POLICY "authenticated_delete_own_profile_images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fowl-images'
    AND (storage.foldername(name))[1] = 'profiles'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
