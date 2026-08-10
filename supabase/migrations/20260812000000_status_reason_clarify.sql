-- ==============================================================================
-- GALLOTRACK: ARCHIVED vs DECEASED STATUS REASON CLARITY (idempotent)
-- ==============================================================================
-- Run this file in the Supabase SQL Editor once. It:
--   1. Guarantees the mortality/archive reason + date columns exist on `fowl`.
--   2. NORMALIZES legacy data where a fowl was ARCHIVED with a mortality reason
--      (DIED / CULLED from the old, confusing archive dropdown). Those rows are
--      genuinely deceased, so they are converted to status = 'Deceased' with a
--      proper cause of death + date, and their archive reason is cleared.
--   3. Fills neutral defaults so every Deceased row has a cause and every
--      Archived row has a non-mortality reason.
--
-- NEW VOCABULARY:
--   status = 'Archived'  -> non-mortality disposition only
--                           (archive_reason: SOLD, TRANSFERRED, RETIRED, INACTIVE, OTHER)
--   status = 'Deceased'  -> mortality only
--                           (death_reason: Illness, Injury, Natural, Culling, Other; death_date set)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ensure reason/date columns exist (no-op when already present)
-- ------------------------------------------------------------------------------
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS death_reason text;
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS death_date date;
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS archive_reason text;
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS archive_date date;

-- ------------------------------------------------------------------------------
-- 2. Normalize legacy rows: Archived + mortality reason -> truly Deceased
-- ------------------------------------------------------------------------------
UPDATE fowl
   SET status        = 'Deceased',
       death_reason  = CASE archive_reason
                         WHEN 'DIED'   THEN 'Injury'
                         WHEN 'CULLED' THEN 'Culling'
                         ELSE COALESCE(NULLIF(death_reason, ''), 'Unspecified')
                       END,
       death_date    = COALESCE(death_date, created_at::date, CURRENT_DATE),
       archive_reason = NULL
 WHERE status = 'Archived'
   AND UPPER(COALESCE(archive_reason, '')) IN ('DIED', 'CULLED');

-- ------------------------------------------------------------------------------
-- 3. Neutral defaults for remaining rows
-- ------------------------------------------------------------------------------
-- Deceased rows always carry a documented cause of death.
UPDATE fowl
   SET death_reason = 'Unspecified'
 WHERE status = 'Deceased'
   AND (death_reason IS NULL OR death_reason = '');

-- Archived rows always carry a non-mortality reason.
UPDATE fowl
   SET archive_reason = 'OTHER'
 WHERE status = 'Archived'
   AND (archive_reason IS NULL OR archive_reason = '');

-- ------------------------------------------------------------------------------
-- 4. POST-RUN VERIFICATION (run these yourself afterwards)
-- ------------------------------------------------------------------------------
-- (1) No Archived row may reference a mortality reason (expect 0 rows):
--     SELECT count(*) FROM fowl
--     WHERE status = 'Archived'
--       AND UPPER(COALESCE(archive_reason,'')) IN ('DIED','CULLED');
--
-- (2) Every Deceased row has a cause + date (expect 0 rows):
--     SELECT count(*) FROM fowl
--     WHERE status = 'Deceased'
--       AND (death_reason IS NULL OR death_reason = '' OR death_date IS NULL);
--
-- (3) Status/reason distribution:
--     SELECT status, death_reason, archive_reason, count(*)
--     FROM fowl GROUP BY 1,2,3 ORDER BY 1,2,3;
-- ==============================================================================