-- ==============================================================================
-- GALLOTRACK: DECEASED MORTALITY ANALYTICS SCHEMA MIGRATION
-- ==============================================================================
-- RUN THIS in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ==============================================================================

-- 1. Add death_reason column if missing
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS death_reason VARCHAR(100) DEFAULT NULL;

-- 2. Add death_date column if missing
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS death_date DATE DEFAULT NULL;

-- 3. Ensure status check constraint allows 'Deceased' (drop & recreate)
ALTER TABLE fowl DROP CONSTRAINT IF EXISTS fowl_status_check;
ALTER TABLE fowl ADD CONSTRAINT fowl_status_check CHECK (status IN ('Active', 'Archived', 'Deceased'));

-- 4. Mortality Breakdown View
CREATE OR REPLACE VIEW vw_mortality_breakdown AS
SELECT 
    COALESCE(death_reason, 'Unspecified') AS cause_of_death,
    COUNT(*) AS total_count,
    ROUND((COUNT(*)::decimal / NULLIF((SELECT COUNT(*) FROM fowl WHERE status = 'Deceased'), 0)) * 100, 2) AS mortality_percentage
FROM fowl
WHERE status = 'Deceased'
GROUP BY death_reason;
