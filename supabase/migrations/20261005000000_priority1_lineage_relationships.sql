-- Priority 1 — Chicken profiles, wing band, sire/dam coding, offspring codes,
-- nicknames, and sire/dam/pair/offspring RELATIONSHIPS.
--
-- What this migration does:
--   1. fowl gets real parent links (sire_id / dam_id -> fowl.id) and an origin
--      pairing link (pairing_id -> breeding_pairings.id). The existing text
--      columns fowl.sire / fowl.dam are KEPT as a denormalized display
--      snapshot so renaming a bird never rewrites recorded history.
--   2. breeding_pairings gets an auto pairing code, an offspring counter, an
--      ended date, real FKs to fowl, one-active-partner-per-bird uniqueness,
--      and one-pairing-code-per-farm uniqueness.
--   3. Backfill: resolve parent ids from names (unambiguous matches only),
--      backfill pairing ids, and synthesize missing pairing rows for every
--      sire x dam couple that already has offspring.
--   4. A trigger keeps breeding_pairings.offspring_seq in sync with reality.
--
-- Wing band uniqueness is unchanged (per farm):
--   fowl_user_wing_band_key ON fowl (user_id, upper(btrim(wing_band))).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. fowl — lineage link columns
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE fowl
  ADD COLUMN IF NOT EXISTS sire_id    BIGINT,
  ADD COLUMN IF NOT EXISTS dam_id     BIGINT,
  ADD COLUMN IF NOT EXISTS pairing_id BIGINT;

-- No self-parenting, ever.
DO $$ BEGIN
  ALTER TABLE fowl ADD CONSTRAINT fowl_no_self_sire CHECK (sire_id IS NULL OR sire_id <> id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE fowl ADD CONSTRAINT fowl_no_self_dam CHECK (dam_id IS NULL OR dam_id <> id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS fowl_sire_id_idx ON fowl(sire_id) WHERE sire_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS fowl_dam_id_idx  ON fowl(dam_id)  WHERE dam_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS fowl_pairing_id_idx ON fowl(pairing_id) WHERE pairing_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. breeding_pairings — pairing code, offspring counter, ended date
-- NOTE: fowl.user_id is TEXT while breeding_pairings.user_id is UUID, so every
-- cross-table owner comparison in this file casts BOTH sides to text.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE breeding_pairings
  ADD COLUMN IF NOT EXISTS pairing_code  TEXT,
  ADD COLUMN IF NOT EXISTS offspring_seq INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ended_date    DATE;

-- Orphan parent ids, and parent ids belonging to a different farm, would break
-- the FK / cross-account isolation, so clear them first.
UPDATE breeding_pairings bp
SET sire_id = NULL
WHERE bp.sire_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM fowl f WHERE f.id = bp.sire_id AND f.user_id::text = bp.user_id::text);

UPDATE breeding_pairings bp
SET dam_id = NULL
WHERE bp.dam_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM fowl f WHERE f.id = bp.dam_id AND f.user_id::text = bp.user_id::text);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Backfill — parent ids from unambiguous name matches
-- ═══════════════════════════════════════════════════════════════════════════

-- 3a. breeding_pairings.sire_id / dam_id from sire_name / dam_name.
--     Both links are written in one step (and never onto a couple that is
--     already recorded), so re-running the migration cannot trip the
--     one-row-per-couple unique index.
WITH names AS (
  SELECT id, user_id, lower(btrim(name)) AS name_key FROM fowl
),
sires AS (
  SELECT user_id, name_key, MIN(id) AS id
  FROM names GROUP BY user_id, name_key HAVING COUNT(*) = 1
),
dams AS (
  SELECT user_id, name_key, MIN(id) AS id
  FROM names GROUP BY user_id, name_key HAVING COUNT(*) = 1
),
resolved AS (
  SELECT bp.id AS pid, sr.id AS sid, dm.id AS did, bp.user_id AS uid
  FROM breeding_pairings bp
  JOIN sires sr ON sr.user_id::text = bp.user_id::text AND sr.name_key = lower(btrim(bp.sire_name))
  JOIN dams   dm ON dm.user_id::text = bp.user_id::text AND dm.name_key = lower(btrim(bp.dam_name))
  WHERE bp.sire_id IS NULL
    AND bp.dam_id  IS NULL
)
UPDATE breeding_pairings bp
SET sire_id = r.sid,
    dam_id  = r.did
FROM resolved r
WHERE bp.id = r.pid
  AND NOT EXISTS (
    SELECT 1 FROM breeding_pairings other
    WHERE other.id <> r.pid
      AND other.user_id  = r.uid
      AND other.sire_id  = r.sid
      AND other.dam_id   = r.did
  );

-- 3b. fowl.sire_id / dam_id from fowl.sire / fowl.dam text.
WITH names AS (
  SELECT id, user_id, lower(btrim(name)) AS name_key FROM fowl
),
unique_names AS (
  SELECT user_id, name_key, MIN(id) AS id
  FROM names
  GROUP BY user_id, name_key
  HAVING COUNT(*) = 1
)
UPDATE fowl child
SET sire_id = u.id
FROM unique_names u
WHERE child.sire_id IS NULL
  AND u.user_id = child.user_id
  AND u.name_key = lower(btrim(child.sire))
  AND u.id <> child.id
  AND u.name_key <> 'foundation stock';

WITH names AS (
  SELECT id, user_id, lower(btrim(name)) AS name_key FROM fowl
),
unique_names AS (
  SELECT user_id, name_key, MIN(id) AS id
  FROM names
  GROUP BY user_id, name_key
  HAVING COUNT(*) = 1
)
UPDATE fowl child
SET dam_id = u.id
FROM unique_names u
WHERE child.dam_id IS NULL
  AND u.user_id = child.user_id
  AND u.name_key = lower(btrim(child.dam))
  AND u.id <> child.id
  AND u.name_key <> 'foundation stock';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. One CURRENT partner per bird — demote older duplicate "Active" rows
--    (history stays intact: losers become 'Completed' with an ended date)
-- ═══════════════════════════════════════════════════════════════════════════

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, sire_id
           ORDER BY COALESCE(pairing_date, created_at::date) DESC, id DESC
         ) AS rn
  FROM breeding_pairings
  WHERE outcome = 'Active' AND sire_id IS NOT NULL
)
UPDATE breeding_pairings bp
SET outcome = 'Completed',
    ended_date = COALESCE(bp.ended_date, CURRENT_DATE),
    updated_at = now()
FROM ranked r
WHERE bp.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, dam_id
           ORDER BY COALESCE(pairing_date, created_at::date) DESC, id DESC
         ) AS rn
  FROM breeding_pairings
  WHERE outcome = 'Active' AND dam_id IS NOT NULL
)
UPDATE breeding_pairings bp
SET outcome = 'Completed',
    ended_date = COALESCE(bp.ended_date, CURRENT_DATE),
    updated_at = now()
FROM ranked r
WHERE bp.id = r.id AND r.rn > 1;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Synthesize pairing rows for couples that have offspring but no record,
--    then attach every offspring to its pairing.
-- ═══════════════════════════════════════════════════════════════════════════

-- 5a. Exact-couple duplicates written before this migration existed: keep the
--     ids on the newest row only, older copies stay as name-only history.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, sire_id, dam_id
           ORDER BY id DESC
         ) AS rn
  FROM breeding_pairings
  WHERE sire_id IS NOT NULL AND dam_id IS NOT NULL
)
UPDATE breeding_pairings bp
SET sire_id = NULL, dam_id = NULL
FROM ranked r
WHERE bp.id = r.id AND r.rn > 1;

-- 5b. One row per couple that is missing one. A bird that already has an
--     Active partner gets the new row as 'Completed' so the one-active-partner
--     indexes below can never fail.
WITH couples AS (
  SELECT child.user_id, child.sire_id, child.dam_id, COUNT(*) AS offspring_count
  FROM fowl child
  WHERE child.sire_id IS NOT NULL
    AND child.dam_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM breeding_pairings bp
      WHERE bp.user_id::text = child.user_id::text
        AND bp.sire_id = child.sire_id
        AND bp.dam_id  = child.dam_id
    )
  GROUP BY child.user_id, child.sire_id, child.dam_id
),
resolved AS (
  SELECT c.user_id, c.sire_id, c.dam_id, c.offspring_count,
         s.name AS sire_name, d.name AS dam_name,
         s.bird_code AS sire_code, d.bird_code AS dam_code
  FROM couples c
  JOIN fowl s ON s.id = c.sire_id
  JOIN fowl d ON d.id = c.dam_id
),
-- flagged / outcome_ready: a row may only be 'Active' when it is the batch
-- winner for BOTH of its birds (rows in the same INSERT cannot see each other,
-- so the rank is computed here) AND neither bird already has an Active partner.
flagged AS (
  SELECT r.*,
         ROW_NUMBER() OVER (
           PARTITION BY r.user_id, r.sire_id
           ORDER BY r.offspring_count DESC, r.dam_name, r.dam_id
         ) AS sire_rn,
         ROW_NUMBER() OVER (
           PARTITION BY r.user_id, r.dam_id
           ORDER BY r.offspring_count DESC, r.sire_name, r.sire_id
         ) AS dam_rn
  FROM resolved r
),
outcome_ready AS (
  SELECT f.*,
         CASE
           WHEN f.sire_rn = 1
            AND f.dam_rn  = 1
            AND NOT EXISTS (
                  SELECT 1 FROM breeding_pairings bp
                  WHERE bp.user_id::text = f.user_id::text AND bp.outcome = 'Active'
                    AND bp.sire_id = f.sire_id
                )
            AND NOT EXISTS (
                  SELECT 1 FROM breeding_pairings bp
                  WHERE bp.user_id::text = f.user_id::text AND bp.outcome = 'Active'
                    AND bp.dam_id = f.dam_id
                )
           THEN 'Active'
           ELSE 'Completed'
         END AS outcome
  FROM flagged f
)
INSERT INTO breeding_pairings (
  user_id, sire_id, dam_id, sire_name, dam_name, sire_code, dam_code,
  pairing_code, outcome, offspring_seq
)
SELECT
  user_id::uuid,
  sire_id, dam_id, sire_name, dam_name, sire_code, dam_code,
  CASE
    WHEN nullif(btrim(sire_code), '') IS NOT NULL
     AND nullif(btrim(dam_code), '') IS NOT NULL
    THEN btrim(sire_code) || btrim(dam_code)
  END,
  outcome,
  offspring_count::int
FROM outcome_ready;

-- Attach offspring to their pairing (only the newest Active couple row exists
-- per couple at this point, so the match is deterministic).
UPDATE fowl child
SET pairing_id = bp.id
FROM breeding_pairings bp
WHERE child.pairing_id IS NULL
  AND child.sire_id IS NOT NULL
  AND child.dam_id IS NOT NULL
  AND bp.user_id::text = child.user_id::text
  AND bp.sire_id = child.sire_id
  AND bp.dam_id = child.dam_id;

-- Truthful offspring counters: recount every pairing from the children that
-- actually point at it (pre-existing rows start at 0 and the trigger does not
-- exist yet, so nothing is double-counted here).
UPDATE breeding_pairings bp
SET offspring_seq = COALESCE(
      (SELECT COUNT(*) FROM fowl c WHERE c.pairing_id = bp.id), 0)
WHERE bp.offspring_seq IS DISTINCT FROM COALESCE(
      (SELECT COUNT(*) FROM fowl c WHERE c.pairing_id = bp.id), 0);

-- Backfill pairing_code on pre-existing rows, then clear any code collisions
-- so the unique index below cannot fail (a null code simply means "uncoded").
UPDATE breeding_pairings bp
SET pairing_code = NULLIF(btrim(x.code), '')
FROM (
  SELECT bp2.id,
         CASE
           WHEN nullif(btrim(f1.bird_code), '') IS NOT NULL
            AND nullif(btrim(f2.bird_code), '') IS NOT NULL
           THEN btrim(f1.bird_code) || btrim(f2.bird_code)
         END AS code
  FROM breeding_pairings bp2
  LEFT JOIN fowl f1 ON f1.id = bp2.sire_id
  LEFT JOIN fowl f2 ON f2.id = bp2.dam_id
  WHERE bp2.pairing_code IS NULL
) x
WHERE bp.id = x.id;

WITH collisions AS (
  SELECT user_id, pairing_code
  FROM breeding_pairings
  WHERE pairing_code IS NOT NULL
  GROUP BY user_id, pairing_code
  HAVING COUNT(*) > 1
)
UPDATE breeding_pairings bp
SET pairing_code = NULL
FROM collisions c
WHERE bp.user_id = c.user_id
  AND bp.pairing_code = c.pairing_code;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5c. Final safety pass — guarantee ONE Active partner per bird AFTER every
--     insert above, so section 6 can never fail. Same rule as section 4; the
--     losers become 'Completed' with an ended date (history stays intact).
-- ═══════════════════════════════════════════════════════════════════════════

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, sire_id
           ORDER BY COALESCE(pairing_date, created_at::date) DESC, id DESC
         ) AS rn
  FROM breeding_pairings
  WHERE outcome = 'Active' AND sire_id IS NOT NULL
)
UPDATE breeding_pairings bp
SET outcome = 'Completed',
    ended_date = COALESCE(bp.ended_date, CURRENT_DATE),
    updated_at = now()
FROM ranked r
WHERE bp.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, dam_id
           ORDER BY COALESCE(pairing_date, created_at::date) DESC, id DESC
         ) AS rn
  FROM breeding_pairings
  WHERE outcome = 'Active' AND dam_id IS NOT NULL
)
UPDATE breeding_pairings bp
SET outcome = 'Completed',
    ended_date = COALESCE(bp.ended_date, CURRENT_DATE),
    updated_at = now()
FROM ranked r
WHERE bp.id = r.id AND r.rn > 1;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Uniqueness constraints
-- ═══════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS breeding_pairings_user_code_uq
  ON breeding_pairings(user_id, pairing_code)
  WHERE pairing_code IS NOT NULL AND btrim(pairing_code) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS breeding_pairings_active_sire_uq
  ON breeding_pairings(user_id, sire_id)
  WHERE outcome = 'Active' AND sire_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS breeding_pairings_active_dam_uq
  ON breeding_pairings(user_id, dam_id)
  WHERE outcome = 'Active' AND dam_id IS NOT NULL;

-- One couple row per farm (a re-pair is the SAME couple: flip the old row back
-- to Active instead of inserting a duplicate).
CREATE UNIQUE INDEX IF NOT EXISTS breeding_pairings_couple_uq
  ON breeding_pairings(user_id, sire_id, dam_id)
  WHERE sire_id IS NOT NULL AND dam_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Foreign keys (added last, after backfill has cleaned the data)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE fowl
  DROP CONSTRAINT IF EXISTS fowl_sire_id_fkey;
ALTER TABLE fowl
  ADD CONSTRAINT fowl_sire_id_fkey FOREIGN KEY (sire_id) REFERENCES fowl(id) ON DELETE SET NULL;

ALTER TABLE fowl
  DROP CONSTRAINT IF EXISTS fowl_dam_id_fkey;
ALTER TABLE fowl
  ADD CONSTRAINT fowl_dam_id_fkey FOREIGN KEY (dam_id) REFERENCES fowl(id) ON DELETE SET NULL;

ALTER TABLE fowl
  DROP CONSTRAINT IF EXISTS fowl_pairing_id_fkey;
ALTER TABLE fowl
  ADD CONSTRAINT fowl_pairing_id_fkey FOREIGN KEY (pairing_id) REFERENCES breeding_pairings(id) ON DELETE SET NULL;

ALTER TABLE breeding_pairings
  DROP CONSTRAINT IF EXISTS breeding_pairings_sire_id_fkey;
ALTER TABLE breeding_pairings
  ADD CONSTRAINT breeding_pairings_sire_id_fkey FOREIGN KEY (sire_id) REFERENCES fowl(id) ON DELETE SET NULL;

ALTER TABLE breeding_pairings
  DROP CONSTRAINT IF EXISTS breeding_pairings_dam_id_fkey;
ALTER TABLE breeding_pairings
  ADD CONSTRAINT breeding_pairings_dam_id_fkey FOREIGN KEY (dam_id) REFERENCES fowl(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. offspring_seq stays truthful without any client involvement
-- ═══════════════════════════════════════════════════════════════════════════

-- 8a. Every bird with a known sire AND dam is pointed at that couple's pairing
--     row automatically, so no write path has to remember to set pairing_id.
CREATE OR REPLACE FUNCTION autofill_fowl_pairing_id() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  target BIGINT;
BEGIN
  IF NEW.sire_id IS NULL OR NEW.dam_id IS NULL THEN
    NEW.pairing_id := NULL;
    RETURN NEW;
  END IF;

  SELECT bp.id INTO target
  FROM breeding_pairings bp
  WHERE bp.user_id::text = NEW.user_id::text
    AND bp.sire_id = NEW.sire_id
    AND bp.dam_id  = NEW.dam_id
  ORDER BY (bp.outcome = 'Active') DESC, bp.id DESC
  LIMIT 1;

  IF target IS NOT NULL THEN
    NEW.pairing_id := target;
  ELSIF NEW.pairing_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM breeding_pairings bp
      WHERE bp.id = NEW.pairing_id
        AND bp.sire_id = NEW.sire_id
        AND bp.dam_id  = NEW.dam_id
    ) THEN
    NEW.pairing_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fowl_autofill_pairing_id ON fowl;
CREATE TRIGGER fowl_autofill_pairing_id
  BEFORE INSERT OR UPDATE OF sire_id, dam_id, pairing_id, user_id ON fowl
  FOR EACH ROW
  EXECUTE FUNCTION autofill_fowl_pairing_id();

-- 8b. Keep breeding_pairings.offspring_seq equal to the real child count.

CREATE OR REPLACE FUNCTION sync_pairing_offspring_seq() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.pairing_id IS NOT NULL THEN
      UPDATE breeding_pairings
      SET offspring_seq = offspring_seq + 1, updated_at = now()
      WHERE id = NEW.pairing_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Relinked to another pairing (or unlinked): move the count.
  IF NEW.pairing_id IS DISTINCT FROM OLD.pairing_id THEN
    IF OLD.pairing_id IS NOT NULL THEN
      UPDATE breeding_pairings
      SET offspring_seq = GREATEST(offspring_seq - 1, 0), updated_at = now()
      WHERE id = OLD.pairing_id;
    END IF;
    IF NEW.pairing_id IS NOT NULL THEN
      UPDATE breeding_pairings
      SET offspring_seq = offspring_seq + 1, updated_at = now()
      WHERE id = NEW.pairing_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fowl_pairing_offspring_seq ON fowl;
CREATE TRIGGER fowl_pairing_offspring_seq
  AFTER INSERT OR UPDATE OF pairing_id, sire_id, dam_id ON fowl
  FOR EACH ROW
  EXECUTE FUNCTION sync_pairing_offspring_seq();

COMMENT ON COLUMN fowl.sire_id IS
  'FK to the registered sire. fowl.sire (text) stays as the display snapshot.';
COMMENT ON COLUMN fowl.dam_id IS
  'FK to the registered dam. fowl.dam (text) stays as the display snapshot.';
COMMENT ON COLUMN fowl.pairing_id IS
  'The breeding_pairings row this bird was produced by.';
COMMENT ON COLUMN breeding_pairings.pairing_code IS
  'Auto: sire bird_code + dam bird_code (e.g. 1A). Unique per farm.';
COMMENT ON COLUMN breeding_pairings.offspring_seq IS
  'Number of offspring recorded for this pair; maintained by trigger.';
