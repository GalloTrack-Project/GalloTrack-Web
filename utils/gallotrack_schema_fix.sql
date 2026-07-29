-- ==============================================================================
-- GALLOTRACK: COMPLETE SCHEMA MIGRATION FIX
-- ==============================================================================
-- RUN THIS ONCE in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Adds all missing columns and fixes status constraints.
-- ==============================================================================

-- 1. Add death_reason column for mortality audit
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS death_reason VARCHAR(100) DEFAULT NULL;

-- 2. Add death_date column for mortality audit
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS death_date DATE DEFAULT NULL;

-- 3. Add archive_reason column for archive reasons (RETIRED, SOLD, CULLED, etc.)
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(100) DEFAULT 'RETIRED';

-- 4. Fix status check constraint to allow all three states
ALTER TABLE fowl DROP CONSTRAINT IF EXISTS fowl_status_check;
ALTER TABLE fowl ADD CONSTRAINT fowl_status_check CHECK (status IN ('Active', 'Archived', 'Deceased'));

-- 5. Create mortality breakdown analytics view
CREATE OR REPLACE VIEW vw_mortality_breakdown AS
SELECT 
    COALESCE(death_reason, 'Unspecified') AS cause_of_death,
    COUNT(*) AS total_count,
    ROUND((COUNT(*)::decimal / NULLIF((SELECT COUNT(*) FROM fowl WHERE status = 'Deceased'), 0)) * 100, 2) AS mortality_percentage
FROM fowl
WHERE status = 'Deceased'
GROUP BY death_reason;

-- 6. Create archive reasons summary view
CREATE OR REPLACE VIEW vw_archive_reasons_summary AS
SELECT 
    COALESCE(archive_reason, 'RETIRED') AS archive_reason,
    COUNT(*) AS total_count
FROM fowl
WHERE status = 'Archived'
GROUP BY archive_reason;
