-- ==============================================================================
-- GALLOTRACK: ADVISER BIRD CODE SCHEME (idempotent)
-- ==============================================================================
-- Run this in the Supabase SQL Editor once, AFTER
-- 20260926000000_clone_owner_data_to_new_user.sql.
--
-- Adviser convention:
--   Sires     -> 1, 2, 3 ...        (number)
--   Dams      -> A, B, C ...        (letter)
--   Offspring -> sire number + dam letter + sibling index,
--                sire 1 x dam A -> 1A1, 1A2, 1A3  (shown as 1A₁, 1A₂, 1A₃)
--
-- This migration converts the legacy foundation tags produced by the previous
-- scheme (1A/2A... for roosters, 1B/2B... for hens) into the scheme above:
--   12A -> 12   (rooster #12)
--    1B -> A    (hen #1)
-- The mapping is injective (digits never collide with letters), so the unique
-- index fowl_user_bird_code_key stays satisfied. Stored codes are kept as
-- plain text; the app renders the sibling index as a subscript.
-- All statements are idempotent.
-- ==============================================================================

-- ── 0. Pre-check (optional): make sure no target code is already in use ─────
-- SELECT bird_code, count(*) FROM fowl WHERE bird_code ~* '^[0-9]+[ab]$'
--  GROUP BY 1 HAVING count(*) > 1;   -- must be empty

-- ── 1. Helper: integer -> letter (1 -> A ... 26 -> Z, 27 -> AA) ─────────────
CREATE OR REPLACE FUNCTION _gct_int_to_letter(n integer) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
  result text := '';
  value  integer := GREATEST(1, n);
BEGIN
  WHILE value > 0 LOOP
    value := value - 1;
    result := chr(65 + (value % 26)) || result;
    value := value / 26;
  END LOOP;
  RETURN result;
END;
$fn$;

-- ── 2. Legacy rooster tags 12A -> 12 ────────────────────────────────────────
UPDATE fowl
   SET bird_code = substring(bird_code FROM '^[0-9]+')
 WHERE bird_code ~* '^[0-9]+a$';

-- ── 3. Legacy hen tags 1B -> A ──────────────────────────────────────────────
UPDATE fowl
   SET bird_code = _gct_int_to_letter((substring(bird_code FROM '^[0-9]+'))::integer)
 WHERE bird_code ~* '^[0-9]+b$';

-- ── 4. Document the scheme on the column ────────────────────────────────────
COMMENT ON COLUMN fowl.bird_code IS
  'Standardized tag (adviser scheme): sires 1,2,3...; dams A,B,C...; offspring = sire number + dam letter + sibling index (1A1, displayed 1A₁). Auto-generated, manually overridable.';

-- ── 5. Cleanup ──────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS _gct_int_to_letter(integer);

-- ── 6. Verification ─────────────────────────────────────────────────────────
-- SELECT count(*) AS foundation_sires FROM fowl WHERE bird_code ~ '^[0-9]+$';
-- SELECT count(*) AS foundation_dams  FROM fowl WHERE bird_code ~ '^[A-Z]+$';
-- SELECT count(*) AS offspring        FROM fowl WHERE bird_code ~ '^[0-9]+[A-Z][0-9]+$';
-- SELECT bird_code, count(*) FROM fowl GROUP BY user_id, bird_code HAVING count(*) > 1;  -- must be empty
