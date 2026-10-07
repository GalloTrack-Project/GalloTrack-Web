-- ============================================================================
-- 20261007000010_registry_role_column.sql
-- SAFE / RUN NOW (schema only — no row data is changed).
--
-- Task A (single source of truth for status + role):
--   * registry_role  = ONE role field: 'Breeding Male' | 'Breeding Female' |
--                      'Non-Breeding' (NULL = pending the approved backfill).
--                      'Sire Material' is NOT stored here — it stays the
--                      breeding_role = 'material' designation.
--   * status         = ONE lifecycle status: Active | Archived | Deceased
--                      (legacy 'Sire Material' rows keep working until the
--                      pending normalization in 20261007000011 runs).
-- Task B (natural-order identifier sorting):
--   * index (user_id, status, chicken_code) supports server-side ordering.
--     Works before AND after the bird_code -> chicken_code rename migration.
-- ============================================================================

ALTER TABLE fowl ADD COLUMN IF NOT EXISTS registry_role text;

DO $$ BEGIN
  ALTER TABLE fowl DROP CONSTRAINT IF EXISTS fowl_registry_role_check;
EXCEPTION WHEN undefined_object THEN null;
END $$;

ALTER TABLE fowl ADD CONSTRAINT fowl_registry_role_check
  CHECK (registry_role IS NULL OR registry_role IN ('Breeding Male','Breeding Female','Non-Breeding'));

-- Server-side sort index (Task B). The identifier column is chicken_code after
-- the rename migration and bird_code before it — the index follows the rename.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fowl' AND column_name = 'chicken_code'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS fowl_user_status_code_idx ON fowl (user_id, status, chicken_code)';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fowl' AND column_name = 'bird_code'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS fowl_user_status_code_idx ON fowl (user_id, status, bird_code)';
  END IF;
END $$;

-- Verify:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'fowl' AND column_name IN ('registry_role','chicken_code','bird_code');
--   SELECT indexname FROM pg_indexes WHERE tablename = 'fowl' AND indexname = 'fowl_user_status_code_idx';
