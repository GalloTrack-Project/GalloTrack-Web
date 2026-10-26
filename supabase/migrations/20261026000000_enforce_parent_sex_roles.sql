-- ============================================================================
-- 20261026000000_enforce_parent_sex_roles.sql
-- PARENT ROLE / SEX HARD RULE
--
-- A sire is a cock (male) and a dam is a hen (female). This trigger rejects
-- new or changed parent assignments whose resolved registry row has the wrong
-- sex, so the rule holds even when a write bypasses the application UI.
--
-- Scope:
--   * INSERT always validates the new sire/dam.
--   * UPDATE only validates when sire/dam/sire_id/dam_id change, so editing
--     an existing legacy-mismatched row for an unrelated field still works.
--   * Names that resolve to no registry row (Foundation Stock / external
--     custom parents) are not checked - there is no stored sex to compare.
--   * Existing bad rows are NOT modified or deleted. Run
--     `npm run check:parent-sex` to list them (report only).
-- ============================================================================

CREATE OR REPLACE FUNCTION fowl_enforce_parent_sex()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_name text;
  v_gender      text;
  v_label       text;
  v_matches     integer;
BEGIN
  -- Leave legacy rows untouched unless a parent field actually changes.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.sire    IS NOT DISTINCT FROM OLD.sire
       AND NEW.dam     IS NOT DISTINCT FROM OLD.dam
       AND NEW.sire_id IS NOT DISTINCT FROM OLD.sire_id
       AND NEW.dam_id  IS NOT DISTINCT FROM OLD.dam_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- ── Sire must be male (cock) ──────────────────────────────────────────
  v_parent_name := NULL;
  v_gender := NULL;

  IF NEW.sire_id IS NOT NULL THEN
    SELECT name, gender INTO v_parent_name, v_gender
      FROM fowl WHERE id = NEW.sire_id;
  ELSIF NEW.sire IS NOT NULL
        AND btrim(NEW.sire) <> ''
        AND lower(btrim(NEW.sire)) <> 'foundation stock' THEN
    SELECT count(*) INTO v_matches
      FROM fowl
     WHERE user_id = NEW.user_id
       AND lower(btrim(name)) = lower(btrim(NEW.sire));
    IF v_matches = 1 THEN
      SELECT name, gender INTO v_parent_name, v_gender
        FROM fowl
       WHERE user_id = NEW.user_id
         AND lower(btrim(name)) = lower(btrim(NEW.sire))
       LIMIT 1;
    END IF;
  END IF;

  IF v_parent_name IS NOT NULL
     AND lower(btrim(coalesce(v_gender, ''))) NOT IN ('rooster', 'cock', 'stag', 'male') THEN
    v_label := CASE
      WHEN lower(btrim(coalesce(v_gender, ''))) IN ('hen', 'pullet', 'female') THEN 'Hen'
      ELSE 'Unknown'
    END;
    RAISE EXCEPTION 'Sire must be male (cock). "%" is recorded as % (gender "%").',
      v_parent_name, v_label, coalesce(v_gender, '')
      USING ERRCODE = '23514';
  END IF;

  -- ── Dam must be female (hen) ──────────────────────────────────────────
  v_parent_name := NULL;
  v_gender := NULL;

  IF NEW.dam_id IS NOT NULL THEN
    SELECT name, gender INTO v_parent_name, v_gender
      FROM fowl WHERE id = NEW.dam_id;
  ELSIF NEW.dam IS NOT NULL
        AND btrim(NEW.dam) <> ''
        AND lower(btrim(NEW.dam)) <> 'foundation stock' THEN
    SELECT count(*) INTO v_matches
      FROM fowl
     WHERE user_id = NEW.user_id
       AND lower(btrim(name)) = lower(btrim(NEW.dam));
    IF v_matches = 1 THEN
      SELECT name, gender INTO v_parent_name, v_gender
        FROM fowl
       WHERE user_id = NEW.user_id
         AND lower(btrim(name)) = lower(btrim(NEW.dam))
       LIMIT 1;
    END IF;
  END IF;

  IF v_parent_name IS NOT NULL
     AND lower(btrim(coalesce(v_gender, ''))) NOT IN ('hen', 'pullet', 'female') THEN
    v_label := CASE
      WHEN lower(btrim(coalesce(v_gender, ''))) IN ('rooster', 'cock', 'stag', 'male') THEN 'Cock'
      ELSE 'Unknown'
    END;
    RAISE EXCEPTION 'Dam must be female (hen). "%" is recorded as % (gender "%").',
      v_parent_name, v_label, coalesce(v_gender, '')
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fowl_enforce_parent_sex ON fowl;

CREATE TRIGGER fowl_enforce_parent_sex
BEFORE INSERT OR UPDATE OF sire, dam, sire_id, dam_id ON fowl
FOR EACH ROW EXECUTE FUNCTION fowl_enforce_parent_sex();

-- ============================================================================
-- VERIFICATION (report only, no changes):
--   SELECT tgname FROM pg_trigger WHERE tgname = 'fowl_enforce_parent_sex';
--   npm run check:parent-sex     -- lists existing sire/dam sex mismatches
-- ============================================================================
