-- ==============================================================================
-- GALLOTRACK: OWNER-DECLARED BREED COMPOSITION FOR FOUNDATION STOCK
-- ==============================================================================
-- Phase 1 migration file. DO NOT RUN AUTOMATICALLY ON PRODUCTION.
--
-- Adds `declared_composition` (jsonb, nullable) to table `fowl`.
-- Stores: [{"breed": string, "percent": number}, ...] or NULL.
-- NULL represents: "assumed 100% of the registered breed".
-- Offspring with recorded parents ignore this field and auto-compute from parents.
-- ==============================================================================

-- 1. Add column if it doesn't exist
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS declared_composition jsonb DEFAULT NULL;

COMMENT ON COLUMN fowl.declared_composition IS
  'Owner-declared breed composition for foundation stock (birds with no recorded parents), e.g. [{"breed": "Lemon", "percent": 75}, {"breed": "Sweater", "percent": 25}]. Null means assumed 100% of registered breed.';

-- 2. Add CHECK constraint verifying NULL or JSON array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fowl_declared_composition_is_array'
  ) THEN
    ALTER TABLE fowl
      ADD CONSTRAINT fowl_declared_composition_is_array
      CHECK (declared_composition IS NULL OR jsonb_typeof(declared_composition) = 'array');
  END IF;
END $$;
