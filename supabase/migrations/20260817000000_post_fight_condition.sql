-- ==============================================================================
-- GALLOTRACK: POST-FIGHT CONDITION / HEALTH STATUS (idempotent)
-- Adds post_fight_condition to the match table so every logged fight records
-- how the bird came out (fit, critical, or deceased). Drives the bloodline
-- Survivability / Health Resilience analytics score.
-- ==============================================================================

ALTER TABLE match
  ADD COLUMN IF NOT EXISTS post_fight_condition text
    DEFAULT 'Fit / Recovered'
    CHECK (
      post_fight_condition IN (
        'Fit / Recovered',
        'Severely Injured / Critical',
        'Deceased (Died from injuries)'
      )
    );

-- Existing rows default to 'Fit / Recovered' (neutral survival). Re-run safe.
