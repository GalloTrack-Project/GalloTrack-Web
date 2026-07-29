-- ==============================================================================
-- GALLOTRACK: SPECIFIC ARCHIVE REASONS SCHEMA MIGRATION
-- ==============================================================================
-- RUN THIS in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ==============================================================================

-- 1. Add archive_reason column if missing
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(100) DEFAULT 'RETIRED';

-- 2. Ensure status check constraint allows 'Archived' and 'Deceased' (drop & recreate)
ALTER TABLE fowl DROP CONSTRAINT IF EXISTS fowl_status_check;
ALTER TABLE fowl ADD CONSTRAINT fowl_status_check CHECK (status IN ('Active', 'Archived', 'Deceased'));

-- 3. Archived Reasons Audit Summary View
CREATE OR REPLACE VIEW vw_archive_reasons_summary AS
SELECT 
    COALESCE(archive_reason, 'RETIRED') AS archive_reason,
    COUNT(*) AS total_count
FROM fowl
WHERE status = 'Archived'
GROUP BY archive_reason;
