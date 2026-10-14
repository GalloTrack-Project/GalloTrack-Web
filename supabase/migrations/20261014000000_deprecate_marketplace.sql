-- ============================================================
-- DEPRECATED: marketplace_listings table
-- Marketplace feature has been removed from GalloTrack.
-- ============================================================
--
-- This migration:
--   1. Checks if marketplace_listings exists
--   2. Drops all RLS policies on marketplace_listings
--   3. Disables RLS on the table
--   4. Drops the indexes
--   5. Renames the table to marketplace_listings_deprecated
--
-- The underlying data is PRESERVED for historical reference.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'marketplace_listings'
  ) THEN
    -- Drop RLS policies
    DROP POLICY IF EXISTS "view_listings" ON marketplace_listings;
    DROP POLICY IF EXISTS "create_listings" ON marketplace_listings;
    DROP POLICY IF EXISTS "update_own_listings" ON marketplace_listings;
    DROP POLICY IF EXISTS "delete_listings" ON marketplace_listings;

    -- Disable RLS
    ALTER TABLE marketplace_listings DISABLE ROW LEVEL SECURITY;

    -- Rename table
    ALTER TABLE marketplace_listings RENAME TO marketplace_listings_deprecated;
  END IF;
END $$;

-- Drop performance indexes (safe even if table was renamed or never existed)
DROP INDEX IF EXISTS idx_marketplace_user_id;
DROP INDEX IF EXISTS idx_marketplace_status;

-- Add comment documenting deprecation if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'marketplace_listings_deprecated'
  ) THEN
    COMMENT ON TABLE marketplace_listings_deprecated IS
      'DEPRECATED as of 2026-10-14. Marketplace feature was removed from GalloTrack. This table is kept for historical data only and is no longer accessed by the application.';
  END IF;
END $$;
