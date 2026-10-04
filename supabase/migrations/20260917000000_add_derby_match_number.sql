-- ==============================================================================
-- GALLOTRACK: ADD DERBY MATCH NUMBER TO MATCH TABLE
-- Adds derby_match_number column for tracking match sequence (1-10)
-- ==============================================================================

ALTER TABLE match
  ADD COLUMN IF NOT EXISTS derby_match_number integer DEFAULT 1;
