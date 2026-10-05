-- ==============================================================================
-- GALLOTRACK: M3 - MATCH DETAIL FIELDS + EDITABLE LIST SEEDS
-- (idempotent, re-run safe)
--
-- Adds the match-detail fields requested in the suggestions video:
--   side : color / side of the entry (e.g. "Red - left")
--   notes: free-text notes for the match
-- and seeds the extra editable list entries:
--   post_match_condition: "Badly hurt"
--   match_type: new separate Match Type list (Main Event / Elimination /
--               Finals / Exhibition) — Event Type stays Derby / Lusok.
-- ==============================================================================

ALTER TABLE match ADD COLUMN IF NOT EXISTS side  TEXT;
ALTER TABLE match ADD COLUMN IF NOT EXISTS notes TEXT;

INSERT INTO registry_options (user_id, list_key, value, label, sort_order)
VALUES
  (NULL::text, 'post_match_condition', 'Badly hurt',   'Badly hurt',   6),
  (NULL::text, 'match_type',           'Main Event',   'Main Event',   1),
  (NULL::text, 'match_type',           'Elimination',  'Elimination',  2),
  (NULL::text, 'match_type',           'Finals',       'Finals',       3),
  (NULL::text, 'match_type',           'Exhibition',   'Exhibition',   4)
ON CONFLICT DO NOTHING;
