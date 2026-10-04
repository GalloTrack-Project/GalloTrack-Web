-- ==============================================================================
-- GALLOTRACK: ADD MISSING COLUMNS TO MATCH TABLE
-- Both opponent_breed and post_fight_condition were added to the code but
-- never applied to the live database. This migration adds them both.
-- ==============================================================================

-- Add opponent_breed (opponent's breed/rasa)
ALTER TABLE match
  ADD COLUMN IF NOT EXISTS opponent_breed text DEFAULT '';

-- Add post_fight_condition (health status after fight)
-- CHECK constraint removed to allow all values from the form
ALTER TABLE match
  ADD COLUMN IF NOT EXISTS post_fight_condition text DEFAULT 'Fit / Recovered';
