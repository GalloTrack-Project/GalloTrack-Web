-- ==============================================================================
-- GALLOTRACK: BIRTH DATE BACKFILL FOR AUTOMATIC AGE TRACKING (idempotent)
-- ==============================================================================
-- Run this file in the Supabase SQL Editor once. It:
--   1. Guarantees the `birthdate` column exists on `fowl`.
--   2. Backfills a derived birth date for legacy rows whose stored `age`
--      (e.g. "12 Months") can be parsed. Birth date is computed as
--      (today - stored months), so automatic age tracking has a basis for
--      every existing record. Rows with age "N/A" are left untouched.
--
-- New behaviour after this migration:
--   - Encoded fowl now store a real `birthdate` (form field is required).
--   - Age / growth stage / calendar milestones are computed live from the
--     current date vs `birthdate` inside the app.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ensure the birthdate column exists (no-op when already present)
-- ------------------------------------------------------------------------------
ALTER TABLE fowl ADD COLUMN IF NOT EXISTS birthdate text;

-- ------------------------------------------------------------------------------
-- 2. Backfill birthdate from the stored age (text like "12 Months" / "N/A")
-- ------------------------------------------------------------------------------
UPDATE fowl
   SET birthdate = to_char(
         CURRENT_DATE - (make_interval(months => parsed.months)),
         'YYYY-MM-DD'
       )
  FROM (
    SELECT id,
           round(ABS(
             NULLIF(split_part(age, ' ', 1)::numeric, 0)
           ))::int AS months
      FROM fowl
     WHERE age IS NOT NULL
       AND age <> ''
       AND UPPER(age) <> 'N/A'
       AND split_part(age, ' ', 1) ~ '^[0-9.]+$'
  ) parsed
 WHERE fowl.id = parsed.id
   AND parsed.months >= 1
   AND (fowl.birthdate IS NULL OR fowl.birthdate = '')
   AND fowl.status <> 'Deceased';

-- ------------------------------------------------------------------------------
-- 3. POST-RUN VERIFICATION (run these yourself afterwards)
-- ------------------------------------------------------------------------------
-- (1) Sanity — every active fowl now has a birth date (active rows may still be
--     missing if their stored age was "N/A"; they will get one via the form):
--     SELECT count(*) AS missing_birthdate FROM fowl
--     WHERE status <> 'Deceased' AND (birthdate IS NULL OR birthdate = '');
--
-- (2) Check the derived dates look plausible (age should match the stored age):
--     SELECT name, age, birthdate,
--            extract(YEAR FROM age(CURRENT_DATE, birthdate::date)) * 12
--              + extract(MONTH FROM age(CURRENT_DATE, birthdate::date)) AS months
--     FROM fowl
--     WHERE birthdate IS NOT NULL AND birthdate <> ''
--     ORDER BY created_at DESC
--     LIMIT 20;
-- ==============================================================================