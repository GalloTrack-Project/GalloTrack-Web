-- ============================================================================
-- 20261007000011_registry_role_backfill_PENDING_APPROVAL.sql
-- ⛔ DATA CHANGES — DO NOT RUN UNTIL YOU APPROVE THE PREVIEW.
--
-- Every data-changing statement below is COMMENTED OUT. Running this file as
-- it ships does NOTHING except the safe verification SELECTs at the bottom.
-- To apply: uncomment ONLY the blocks you approve, then run the file.
--
-- Requires: 20261007000010_registry_role_column.sql (adds registry_role).
-- Nothing here touches identifiers, wing bands, bloodline %, or pairings.
--
-- ── PREVIEW SUMMARY (audit 2026-10-07, your farm hazeldato-on) ──────────────
-- Before (legacy derivation, overlapping):  M=15  F=14  NB=20  SM=0  sum=49 vs 29 Active
-- After  (stored roles, material overlay): M=2   F=7   NB=16  SM=4  sum=29 vs 29 Active
--   * SM=4: Iron Lemon [1], Sweater Bolt [8], Hatch Silver [12],
--           Sweater Red Storm [17] — breeding_role = 'material' (their status
--           was flipped Sire Material -> Active on 2026-10-07; the Sire Material
--           tab now reads breeding_role, so they are visible there again).
--   * Tab moves approved here: 20 active chickens leave Breeding Male/Female
--     (kids=0 growers) and join Non-Breeding; 1 foundation hen needs a decision.
--   * Other accounts: registry_role stays NULL (legacy fallback = no visual
--     change anywhere).
--   * Renumbering: NOT included — preview only, see the final report.
-- ============================================================================

-- ── BLOCK A — registry_role backfill for your farm (UNCOMMENT TO APPLY) ─────

-- UPDATE fowl f SET registry_role = v.role
-- FROM (VALUES
--   (30, 'Breeding Male'),
--   (31, 'Breeding Male'),
--   (32, 'Breeding Male'),
--   (35, 'Breeding Female'),
--   (36, 'Breeding Female'),
--   (37, 'Breeding Female'),
--   (38, 'Breeding Female'),
--   (39, 'Breeding Female'),
--   (41, 'Breeding Female'),
--   (42, 'Non-Breeding'),
--   (43, 'Non-Breeding'),
--   (44, 'Non-Breeding'),
--   (45, 'Non-Breeding'),
--   (46, 'Non-Breeding'),
--   (47, 'Non-Breeding'),
--   (48, 'Non-Breeding'),
--   (49, 'Non-Breeding'),
--   (50, 'Non-Breeding'),
--   (51, 'Non-Breeding'),
--   (52, 'Non-Breeding'),
--   (53, 'Non-Breeding'),
--   (54, 'Non-Breeding'),
--   (55, 'Non-Breeding'),
--   (56, 'Non-Breeding'),
--   (57, 'Non-Breeding'),
--   (58, 'Non-Breeding'),
--   (59, 'Non-Breeding'),
--   (60, 'Non-Breeding'),
--   (61, 'Non-Breeding'),
--   (62, 'Non-Breeding')
-- ) AS v(id, role)
-- WHERE f.id = v.id AND f.user_id = '9cc100d9-c855-41d3-a6a8-3c10fd65221c';
--
-- WHITE FLAME [F] (fowl id 40) — NEEDS YOUR DECISION. Foundation hen: no
-- parents, no registered offspring. Uncomment EXACTLY ONE of these two lines:
--   (matches today's Breeding Female tab — zero visual movement):  40 -> Breeding Female
--   (treated as a grower/foundation keeper):                        40 -> Non-Breeding
-- Then add the chosen line to a copy of the UPDATE above before running, e.g.:
--   ... (39,'Breeding Female'), (40,'Breeding Female'), (41,'Breeding Female'), ...

-- ── BLOCK B — history entries for Block A (UNCOMMENT TO APPLY) ──────────────

-- INSERT INTO fowl_status_history (fowl_id, field, old_value, new_value, reason, note, changed_at, changed_by)
-- SELECT v.id, 'registry_role', NULL, v.role, 'backfill',
--        'Initial registry role per approved role table (registry cleanup 20261007)',
--        now(), f.user_id
-- FROM (VALUES
--   (30,'Breeding Male'),(31,'Breeding Male'),(32,'Breeding Male'),
--   (35,'Breeding Female'),(36,'Breeding Female'),(37,'Breeding Female'),
--   (38,'Breeding Female'),(39,'Breeding Female'),(41,'Breeding Female'),
--   (42,'Non-Breeding'),(43,'Non-Breeding'),(44,'Non-Breeding'),
--   (45,'Non-Breeding'),(46,'Non-Breeding'),(47,'Non-Breeding'),
--   (48,'Non-Breeding'),(49,'Non-Breeding'),(50,'Non-Breeding'),
--   (51,'Non-Breeding'),(52,'Non-Breeding'),(53,'Non-Breeding'),
--   (54,'Non-Breeding'),(55,'Non-Breeding'),(56,'Non-Breeding'),
--   (57,'Non-Breeding'),(58,'Non-Breeding'),(59,'Non-Breeding'),
--   (60,'Non-Breeding'),(61,'Non-Breeding'),(62,'Non-Breeding')
-- ) AS v(id, role)
-- JOIN fowl f ON f.id = v.id AND f.user_id = '9cc100d9-c855-41d3-a6a8-3c10fd65221c'
-- WHERE f.registry_role IS NULL;

-- ── BLOCK C — status normalization on OTHER accounts (UNCOMMENT TO APPLY) ───
-- 14 rows still carry the legacy status 'Sire Material' (10 on the demo farm,
-- 4 on booterrcap). Sire Material is the breeding_role = 'material' DESIGNATION
-- — every one of these rows already has it, so their Sire Material tab stays
-- exactly the same after status -> Active. Your farm has 0 such rows.

-- INSERT INTO fowl_status_history (fowl_id, field, old_value, new_value, reason, note, changed_at, changed_by)
-- SELECT id, 'status', 'Sire Material', 'Active', 'normalization',
--        'Sire Material is a breeding role (breeding_role=material), not a lifecycle status — registry cleanup 20261007',
--        now(), user_id
-- FROM fowl WHERE status = 'Sire Material';

-- UPDATE fowl SET status = 'Active' WHERE status = 'Sire Material';

-- ── BLOCK D — tighten the status CHECK after Block C (UNCOMMENT LAST) ───────
-- Keeps the legacy value only while any row still uses it.

-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM fowl WHERE status NOT IN ('Active','Archived','Deceased')) THEN
--     ALTER TABLE fowl DROP CONSTRAINT IF EXISTS fowl_status_check;
--     ALTER TABLE fowl ADD CONSTRAINT fowl_status_check
--       CHECK (status IS NULL OR status IN ('Active','Archived','Deceased'));
--   END IF;
-- END $$;

-- ── VERIFICATION (safe to run at any time) ──────────────────────────────────

-- 1. Pending roles (should be 0 for your farm after Block A):
SELECT user_id, count(*) AS active_without_role
FROM fowl
WHERE status = 'Active' AND registry_role IS NULL AND breeding_role IS DISTINCT FROM 'material'
GROUP BY user_id;

-- 2. Invariant: Registry(M + F + Non-Breeding) = Active excluding Sire Material:
SELECT
  (SELECT count(*) FROM fowl WHERE user_id = '9cc100d9-c855-41d3-a6a8-3c10fd65221c'
     AND status = 'Active' AND registry_role = 'Breeding Male' AND breeding_role IS DISTINCT FROM 'material')
  + (SELECT count(*) FROM fowl WHERE user_id = '9cc100d9-c855-41d3-a6a8-3c10fd65221c'
     AND status = 'Active' AND registry_role = 'Breeding Female' AND breeding_role IS DISTINCT FROM 'material')
  + (SELECT count(*) FROM fowl WHERE user_id = '9cc100d9-c855-41d3-a6a8-3c10fd65221c'
     AND status = 'Active' AND registry_role = 'Non-Breeding' AND breeding_role IS DISTINCT FROM 'material') AS registry_tab_sum,
  (SELECT count(*) FROM fowl WHERE user_id = '9cc100d9-c855-41d3-a6a8-3c10fd65221c'
     AND status = 'Active' AND breeding_role IS DISTINCT FROM 'material') AS active_excluding_sire_material;

-- 3. Inventory rule: All = Active + Archived + Deceased:
SELECT count(*) AS all_rows,
       count(*) FILTER (WHERE status = 'Active')   AS active,
       count(*) FILTER (WHERE status = 'Archived') AS archived,
       count(*) FILTER (WHERE status = 'Deceased') AS deceased,
       count(*) FILTER (WHERE status NOT IN ('Active','Archived','Deceased')) AS legacy_pending
FROM fowl;
