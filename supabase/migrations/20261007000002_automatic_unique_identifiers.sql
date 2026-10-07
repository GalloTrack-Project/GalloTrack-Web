-- ==============================================================================
-- GALLOTRACK: AUTOMATIC UNIQUE IDENTIFIERS & CONCURRENCY COUNTERS (idempotent)
-- ==============================================================================
-- Format:
--   Sires     -> 1, 2, 3 ... (integer)
--   Dams      -> A, B, C ... Z, AA, AB ... (spreadsheet-style letter, skipping single 'X')
--   Offspring -> sire number + dam letter + sequence per pair (e.g. 1A1, 1A2, 2B1)
--   Unknowns  -> 0 for unknown sire, X for unknown dam (e.g. 1X1, 0B1, 0X1)
-- ==============================================================================

-- ── 0. Rename bird_code to chicken_code (chicken kasi hindi bird) ───────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fowl' AND column_name = 'bird_code'
  ) THEN
    ALTER TABLE fowl RENAME COLUMN bird_code TO chicken_code;
  END IF;
END $$;

-- ── 1. Counter table with row-level locking for concurrent generation ─────────
CREATE TABLE IF NOT EXISTS fowl_identifier_counters (
  user_id uuid NOT NULL,
  counter_type text NOT NULL, -- 'sire', 'dam', 'offspring'
  prefix text NOT NULL DEFAULT '', -- '' for sire/dam, or pair prefix (e.g. '1A', '1X')
  last_seq integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, counter_type, prefix)
);

ALTER TABLE fowl_identifier_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fowl_identifier_counters_owner_all" ON fowl_identifier_counters;
CREATE POLICY "fowl_identifier_counters_owner_all"
  ON fowl_identifier_counters
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 2. Unique index on fowl table (never reuse code, case-insensitive) ────────
CREATE UNIQUE INDEX IF NOT EXISTS fowl_user_chicken_code_key
  ON fowl (user_id, lower(btrim(chicken_code)))
  WHERE chicken_code IS NOT NULL AND btrim(chicken_code) <> '';

-- ── 3. Stored function: atomic sequence generator with row locking ───────────
CREATE OR REPLACE FUNCTION get_next_fowl_identifier(
  p_user_id uuid,
  p_role text, -- 'sire', 'dam', 'offspring'
  p_sire_code text DEFAULT NULL,
  p_dam_code text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter_type text;
  v_prefix text;
  v_next_val integer;
  v_code text;
  v_sire text;
  v_dam text;
  v_letter text;
  v_temp integer;
BEGIN
  IF p_role = 'sire' THEN
    v_counter_type := 'sire';
    v_prefix := '';

    -- Initialize counter with at least max existing sire code in fowl table
    INSERT INTO fowl_identifier_counters (user_id, counter_type, prefix, last_seq)
    VALUES (
      p_user_id, 
      v_counter_type, 
      v_prefix,
      COALESCE((
        SELECT MAX(chicken_code::integer)
        FROM fowl
        WHERE user_id = p_user_id
          AND chicken_code ~ '^[0-9]+$'
      ), 0)
    )
    ON CONFLICT (user_id, counter_type, prefix) DO NOTHING;

    -- Atomically lock row and increment
    LOOP
      UPDATE fowl_identifier_counters
         SET last_seq = last_seq + 1,
             updated_at = now()
       WHERE user_id = p_user_id
         AND counter_type = v_counter_type
         AND prefix = v_prefix
      RETURNING last_seq INTO v_next_val;

      -- Make sure it does not collide with any existing fowl row
      IF NOT EXISTS (
        SELECT 1 FROM fowl 
        WHERE user_id = p_user_id 
          AND lower(btrim(chicken_code)) = v_next_val::text
      ) THEN
        RETURN v_next_val::text;
      END IF;
    END LOOP;

  ELSIF p_role = 'dam' THEN
    v_counter_type := 'dam';
    v_prefix := '';

    INSERT INTO fowl_identifier_counters (user_id, counter_type, prefix, last_seq)
    VALUES (
      p_user_id, 
      v_counter_type, 
      v_prefix, 
      0
    )
    ON CONFLICT (user_id, counter_type, prefix) DO NOTHING;

    LOOP
      UPDATE fowl_identifier_counters
         SET last_seq = last_seq + 1,
             updated_at = now()
       WHERE user_id = p_user_id
         AND counter_type = v_counter_type
         AND prefix = v_prefix
      RETURNING last_seq INTO v_next_val;

      -- Convert v_next_val to spreadsheet letters (1=A, 2=B... 27=AA)
      v_temp := v_next_val;
      v_letter := '';
      WHILE v_temp > 0 LOOP
        v_temp := v_temp - 1;
        v_letter := chr(65 + (v_temp % 26)) || v_letter;
        v_temp := v_temp / 26;
      END LOOP;

      -- Single 'X' is reserved strictly for unknown dam
      IF v_letter <> 'X' THEN
        IF NOT EXISTS (
          SELECT 1 FROM fowl 
          WHERE user_id = p_user_id 
            AND lower(btrim(chicken_code)) = lower(v_letter)
        ) THEN
          RETURN v_letter;
        END IF;
      END IF;
    END LOOP;

  ELSIF p_role = 'offspring' THEN
    v_sire := COALESCE(NULLIF(btrim(p_sire_code), ''), '0');
    v_dam := COALESCE(NULLIF(btrim(p_dam_code), ''), 'X');
    
    -- Format: sire + dam
    v_prefix := upper(v_sire || v_dam);
    v_counter_type := 'offspring';

    -- Initialize counter with at least max existing sequence for this pair
    INSERT INTO fowl_identifier_counters (user_id, counter_type, prefix, last_seq)
    VALUES (
      p_user_id,
      v_counter_type,
      v_prefix,
      COALESCE((
        SELECT MAX(substring(chicken_code FROM '^[0-9]+[A-Za-z]+([0-9]+)$')::integer)
        FROM fowl
        WHERE user_id = p_user_id
          AND upper(substring(chicken_code FROM '^([0-9]+[A-Za-z]+)')) = v_prefix
      ), 0)
    )
    ON CONFLICT (user_id, counter_type, prefix) DO NOTHING;

    LOOP
      UPDATE fowl_identifier_counters
         SET last_seq = last_seq + 1,
             updated_at = now()
       WHERE user_id = p_user_id
         AND counter_type = v_counter_type
         AND prefix = v_prefix
      RETURNING last_seq INTO v_next_val;

      v_code := v_prefix || v_next_val::text;

      IF NOT EXISTS (
        SELECT 1 FROM fowl 
        WHERE user_id = p_user_id 
          AND lower(btrim(chicken_code)) = lower(v_code)
      ) THEN
        RETURN v_code;
      END IF;
    END LOOP;
  ELSE
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;
END;
$$;
