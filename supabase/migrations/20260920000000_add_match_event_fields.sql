-- Add event_type, cock_count, and age_category columns to match table
-- These support the new match event form with Derby/Lusong event types,
-- number of cocks per match (2-5), and age category (Cock/Stag)

ALTER TABLE match
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'Derby',
  ADD COLUMN IF NOT EXISTS cock_count INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS age_category TEXT DEFAULT 'Cock';

-- Add CHECK constraints for data integrity
ALTER TABLE match
  ADD CONSTRAINT match_cock_count_check CHECK (cock_count >= 2 AND cock_count <= 5);

ALTER TABLE match
  ADD CONSTRAINT match_age_category_check CHECK (age_category IN ('Cock', 'Stag'));

-- Backfill existing rows with sensible defaults based on current type values
UPDATE match
SET
  event_type = CASE
    WHEN type ILIKE '%derby%' THEN 'Derby'
    WHEN type ILIKE '%lusong%' THEN 'Lusong'
    ELSE 'Derby'
  END,
  cock_count = CASE
    WHEN type ILIKE '%2-cock%' THEN 2
    WHEN type ILIKE '%3-cock%' THEN 3
    WHEN type ILIKE '%4-cock%' THEN 4
    WHEN type ILIKE '%5-cock%' THEN 5
    ELSE 2
  END,
  age_category = 'Cock'
WHERE event_type IS NULL OR cock_count IS NULL OR age_category IS NULL;
