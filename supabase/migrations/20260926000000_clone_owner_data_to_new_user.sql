-- ==============================================================================
-- GALLOTRACK: CLONE (COPY) ALL OWNER DATA TO A NEW ACCOUNT
-- ==============================================================================
-- Run this in the Supabase SQL Editor (one paste, one click).
--
-- DIFFERENCE FROM THE EXISTING TRANSFER SCRIPTS
--   supabase/migrations/20260910000000_transfer_admin_data_to_farm_owner.sql
--   app/api/admin/transfer-data/route.ts
--     -> both do `UPDATE ... SET user_id = target` (MOVE: the source loses data)
--   THIS FILE
--     -> does `INSERT ... SELECT` (COPY: the source keeps everything, the new
--        account gets its own independent rows with fresh primary keys)
--   The new user never sees the source account's email or password. Each account
--   only ever reads its own rows (RLS: user_id = auth.uid()).
--
-- WHAT IS CLONED
--   profiles               -> identity row (flags forced to owner / non-admin /
--                             active, so the new user is NOT an admin)
--   farms                  -> farm row, only if the source has one (owner_id is
--                             UNIQUE, one per owner); never invented
--   fowl                   -> the manok inventory (new ids, bird_code kept:
--                             the unique index is per user_id so no conflict)
--   match                  -> sabong records (new ids)
--   match_options          -> bets, re-linked to the CLONED match ids
--   marketplace_listings   -> listings, re-linked to the CLONED fowl ids
--   Tables that do not exist yet in your project (match_options,
--   marketplace_listings) are skipped automatically - no error.
--
-- WHAT IS DELIBERATELY NOT CLONED
--   strains, leg_colors    -> shared reference library, not per-user data
--   admin_audit_logs       -> admin trail, must stay with the acting admin
--   system_settings        -> global config
--   Storage objects        -> NOT copied; fowl-images and match-videos buckets
--     are public, so image_url / video_url values copied as-is still resolve.
--     (Caveat: both accounts point at the SAME physical file. If the source
--      owner ever deletes that image/video, the clone's link breaks too.)
--
-- BEFORE RUNNING
--   1. Let the new owner register FIRST, with their OWN email + password
--      (/register). You never see or handle their credentials - you only need
--      their UUID afterwards.
--   2. Supabase Dashboard -> Authentication -> Users -> copy the UUID of that
--      new user, paste it into DST_ID below. (Or set DST_EMAIL instead - the
--      script resolves the UUID from the email either way.)
--   3. SRC_EMAIL should already be correct.
--   4. Re-running is SAFE: every table is guarded, so an already-cloned table
--      is skipped instead of duplicated.
--
--   Order does not matter much: run the seed before or after the new user's
--   first login - whichever table already has a row is simply skipped.
-- ==============================================================================

-- Only needed when CREATE_TARGET := true (bcrypt for the new account password).
-- Wrapped so a missing/forbidden extension can never abort the clone itself.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgcrypto unavailable (%) - CREATE_TARGET will not work, create the user in the Dashboard instead.', SQLERRM;
END $$;

-- --------------------------------------------------------------------------------
-- Helper: builds the (insert-list, select-list) pair for a table copy.
--   * p_excl      -> columns never copied (primary keys, owner columns)
--   * p_overrides -> columns copied as a literal instead of the source value
--                    (skipped automatically when the column does not exist, so
--                     the script survives partially-applied migrations)
-- --------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._gct_cols(
  p_table     text,
  p_excl      text[] DEFAULT '{}',
  p_overrides jsonb  DEFAULT '{}'::jsonb
) RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  v_ins text := '';
  v_sel text := '';
  v_ovr text[];
  c     record;
  k     text;
BEGIN
  SELECT COALESCE(array_agg(lower(x)), '{}')
    INTO v_ovr
    FROM jsonb_object_keys(p_overrides) AS t(x);

  FOR c IN
    SELECT column_name
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = p_table
       AND NOT (lower(column_name) = ANY (p_excl))
       AND NOT (lower(column_name) = ANY (v_ovr))
       AND lower(column_name) NOT LIKE '%token%'
       AND lower(column_name) NOT LIKE '%password%'
       AND lower(column_name) NOT IN (
             'email_confirmed_at', 'last_sign_in_at', 'deleted_at',
             'confirmation_sent_at', 'recovery_sent_at', 'invited_at',
             'banned_until', 'instance_id', 'aud'
           )
     ORDER BY ordinal_position
  LOOP
    v_ins := v_ins || format('%I, ', c.column_name);
    v_sel := v_sel || format('%I, ', c.column_name);
  END LOOP;

  FOR k IN SELECT jsonb_object_keys(p_overrides) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = p_table AND column_name = k
    ) THEN
      v_ins := v_ins || format('%I, ', k);
      v_sel := v_sel || format('%L, ', p_overrides ->> k);
    END IF;
  END LOOP;

  IF v_ins = '' THEN RETURN NULL; END IF;
  RETURN ARRAY[left(v_ins, length(v_ins) - 2), left(v_sel, length(v_sel) - 2)];
END;
$$;

-- --------------------------------------------------------------------------------
-- Helper: single-statement copy of every row of p_table owned by p_src_val.
-- Returns the number of rows inserted.
-- --------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._gct_copy(
  p_table     text,
  p_src_col   text,
  p_src_val   text,
  p_excl      text[] DEFAULT '{}',
  p_overrides jsonb  DEFAULT '{}'::jsonb
) RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v text[];
  n bigint;
BEGIN
  v := public._gct_cols(p_table, p_excl, p_overrides);
  IF v IS NULL THEN RETURN 0; END IF;

  EXECUTE format(
    'INSERT INTO %I (%s) SELECT %s FROM %I WHERE %I = %L',
    p_table, v[1], v[2], p_table, p_src_col, p_src_val
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ==============================================================================
-- THE CLONE
-- ==============================================================================
DO $$
DECLARE
  -- ========================= CONFIG - EDIT THIS ==============================
  SRC_EMAIL  text := 'hazeldato-on@isufst.edu.ph';   -- data owner (source)

  -- TARGET: paste the UUID of the newly registered user (preferred).
  -- DST_ID alone is enough; DST_EMAIL is then resolved from auth.users.
  DST_ID          uuid    := '21adb196-dec8-48cd-bde6-b1e9bac16da8';
                   -- Ciruaco Coste Perucho (booterrcap@gmail.com)
  DST_EMAIL       text    := NULL;     -- optional alternative to DST_ID

  CREATE_TARGET   boolean := false;   -- only with DST_EMAIL: create the account
  TARGET_PASSWORD text    := 'ChangeMe123!';  -- only with CREATE_TARGET
  COPY_OWNER_NAME boolean := false;   -- false = keep the TARGET's own name from
                                      -- /register; true = clone the source name
                                      -- + avatar instead
  -- ==========================================================================

  src_id    uuid;
  dst_id    uuid;
  dst_email text;   -- resolved from DST_ID or DST_EMAIL
  dst_meta  jsonb := '{}'::jsonb;  -- what the target typed during registration
  v_src_farm   text;
  v_src_phone  text;

  v       text[];
  v_ins   text;
  v_sel   text;
  v_ovr   jsonb;
  v_n     bigint;
  v_idx   int;
  r       record;
  new_id  text;
  mapped  text;

  v_tbl      text;
  v_col      text;
  v_src_txt  text := '';
  v_dst_txt  text := '';
  v_fullname text;

  fowl_old  text[] := '{}';
  fowl_new  text[] := '{}';
  match_old text[] := '{}';
  match_new text[] := '{}';
BEGIN
  -- ---------------------------------------------------------------- 0. guard
  IF DST_ID IS NULL
     AND (DST_EMAIL IS NULL OR upper(DST_EMAIL) LIKE 'CHANGE-ME%') THEN
    RAISE EXCEPTION 'Set DST_ID - paste the new user''s UUID from Dashboard -> Authentication -> Users (DST_EMAIL also works).';
  END IF;
  IF DST_ID IS NULL AND lower(DST_EMAIL) = lower(SRC_EMAIL) THEN
    RAISE EXCEPTION 'Source and target are the same account (%)', SRC_EMAIL;
  END IF;

  -- ------------------------------------------- 1. optional target account
  -- Only for the DST_EMAIL path: the normal flow is "register the user first",
  -- in which case there is nothing to create here.
  IF CREATE_TARGET AND DST_ID IS NULL AND DST_EMAIL IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(DST_EMAIL)) THEN
    BEGIN
      INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), 'authenticated', 'authenticated',
      DST_EMAIL, crypt(TARGET_PASSWORD, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"provider":"email"}'::jsonb, now(), now()
    );

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'auth' AND table_name = 'identities'
         AND column_name = 'provider_id'
    ) THEN
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      )
      SELECT gen_random_uuid(), u.id,
             jsonb_build_object('sub', u.id::text, 'email', u.email,
                                'email_verified', true),
             'email', u.id::text, now(), now(), now()
        FROM auth.users u
       WHERE lower(u.email) = lower(DST_EMAIL);
    ELSE
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      )
      SELECT gen_random_uuid(), u.id,
             jsonb_build_object('sub', u.id::text, 'email', u.email,
                                'email_verified', true),
             'email', now(), now(), now()
        FROM auth.users u
       WHERE lower(u.email) = lower(DST_EMAIL);
    END IF;

      RAISE NOTICE 'Created auth account for % (password set by this script)', DST_EMAIL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create the auth account via SQL (%). Create it instead: Dashboard -> Authentication -> Users -> Add user (email + password, auto-confirm), then run this again.', SQLERRM;
    END;
  END IF;

  -- -------------------------------------------------------- 2. resolve ids
  SELECT id INTO src_id FROM auth.users WHERE lower(email) = lower(SRC_EMAIL);
  IF src_id IS NULL THEN
    RAISE EXCEPTION 'Source user not found: %', SRC_EMAIL;
  END IF;

  IF DST_ID IS NOT NULL THEN
    SELECT id, email, coalesce(raw_user_meta_data, '{}'::jsonb)
      INTO dst_id, dst_email, dst_meta
      FROM auth.users WHERE id = DST_ID;
    IF dst_id IS NULL THEN
      RAISE EXCEPTION 'No auth user with UUID %. Register the user first - their UUID is listed in Dashboard -> Authentication -> Users.', DST_ID;
    END IF;
  ELSE
    SELECT id, email, coalesce(raw_user_meta_data, '{}'::jsonb)
      INTO dst_id, dst_email, dst_meta
      FROM auth.users WHERE lower(email) = lower(DST_EMAIL);
    IF dst_id IS NULL THEN
      RAISE EXCEPTION 'Target user not found: %. Register that account first (/register), or paste its UUID into DST_ID.', DST_EMAIL;
    END IF;
  END IF;

  IF dst_id = src_id THEN
    RAISE EXCEPTION 'Source and target are the same account (%)', SRC_EMAIL;
  END IF;

  RAISE NOTICE '=== CLONING % -> % (uuid %) ===', SRC_EMAIL, dst_email, dst_id;

  -- ------------------------------------------------------------ 3. profiles
  -- Identity rules:
  --   * name   -> whatever the TARGET typed at /register (their
  --               raw_user_meta_data), falling back to the email prefix, so the
  --               new owner keeps their own identity. COPY_OWNER_NAME := true
  --               copies the SOURCE owner's name instead (demo cloning).
  --   * farm / phone -> the TARGET's registration values first, then the
  --               source's, so the cloned farm data still shows up.
  --   * flags  -> always owner / non-admin / active; never cloned.
  SELECT coalesce(farm_name, ''), coalesce(phone_number, '')
    INTO v_src_farm, v_src_phone
    FROM profiles WHERE id::text = src_id::text;

  v_fullname := btrim(concat_ws(' ',
                   nullif(dst_meta ->> 'first_name', ''),
                   nullif(dst_meta ->> 'middle_name', ''),
                   nullif(dst_meta ->> 'last_name', '')));
  IF coalesce(v_fullname, '') = '' THEN
    v_fullname := nullif(btrim(coalesce(dst_meta ->> 'full_name', '')), '');
  END IF;
  IF v_fullname IS NULL THEN
    v_fullname := nullif(split_part(coalesce(dst_email, ''), '@', 1), '');
  END IF;
  v_fullname := coalesce(v_fullname, 'Farm Owner');

  v_ovr := jsonb_build_object(
    'id',          dst_id::text,
    'user_id',     dst_id::text,
    'email',       coalesce(dst_email, ''),
    'is_admin',    'false',
    'role',        'owner',
    'is_active',   'true',
    'is_verified', 'false',
    'account_status', 'active',
    'farm_name',    coalesce(nullif(dst_meta ->> 'farm_name', ''), v_src_farm, ''),
    'phone_number', coalesce(nullif(dst_meta ->> 'contact_number', ''), v_src_phone, '')
  );
  IF NOT COPY_OWNER_NAME THEN
    v_ovr := v_ovr || jsonb_build_object(
      'first_name', '', 'middle_name', '', 'last_name', '',
      'full_name', v_fullname, 'avatar_url', ''
    );
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id::text = src_id::text) THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id::text = dst_id::text) THEN
      v_n := public._gct_copy('profiles', 'id', src_id::text,
                              ARRAY['id', 'user_id'], v_ovr);
      RAISE NOTICE 'profiles: cloned % row(s)', v_n;
    ELSE
      RAISE NOTICE 'profiles: target already has a row -> skipped';
    END IF;
  ELSE
    RAISE NOTICE 'profiles: source has no row -> skipped';
  END IF;

  -- --------------------------------------------------------------- 4. farms
  IF to_regclass('public.farms') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM farms WHERE owner_id::text = dst_id::text) THEN
      IF EXISTS (SELECT 1 FROM farms WHERE owner_id::text = src_id::text) THEN
        v_n := public._gct_copy('farms', 'owner_id', src_id::text,
                                ARRAY['id', 'owner_id'],
                                jsonb_build_object('owner_id', dst_id::text));
        RAISE NOTICE 'farms: cloned % row(s)', v_n;
      ELSE
        RAISE NOTICE 'farms: source has no farm row -> skipped (nothing to clone)';
      END IF;
    ELSE
      RAISE NOTICE 'farms: target already has a row -> skipped';
    END IF;
  END IF;

  -- --------------------------------------------------------------- 5. fowl
  IF to_regclass('public.fowl') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM fowl WHERE user_id::text = dst_id::text) THEN
      RAISE NOTICE 'fowl: target already has % row(s) -> skipped (no duplicates)', (SELECT count(*) FROM fowl WHERE user_id::text = dst_id::text);
    ELSE
      -- sire_id / dam_id are numeric links to OTHER fowl rows. The app never
      -- writes them (they are always NULL today), and copying them would make
      -- the clone point at the SOURCE owner's bird ids, so they are reset.
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'fowl'
           AND column_name IN ('sire_id', 'dam_id')
      ) THEN
        IF EXISTS (
          SELECT 1 FROM fowl
           WHERE user_id::text = src_id::text
             AND (sire_id IS NOT NULL OR dam_id IS NOT NULL)
        ) THEN
          RAISE NOTICE 'fowl: source has sire_id/dam_id values -> cloned as NULL (they would otherwise point at the source owner bird ids)';
        END IF;
      END IF;

      v := public._gct_cols('fowl', ARRAY['id', 'user_id'],
                            jsonb_build_object('user_id', dst_id::text,
                                               'sire_id', null,
                                               'dam_id', null));
      IF v IS NOT NULL THEN
        FOR r IN
          EXECUTE format('SELECT id::text AS old_id FROM fowl
                           WHERE user_id::text = %L ORDER BY id', src_id::text)
        LOOP
          EXECUTE format('INSERT INTO fowl (%s) SELECT %s FROM fowl WHERE id = %L
                          RETURNING id::text', v[1], v[2], r.old_id)
             INTO new_id;
          fowl_old := fowl_old || r.old_id;
          fowl_new := fowl_new || new_id;
        END LOOP;
        RAISE NOTICE 'fowl: cloned % row(s)', coalesce(array_length(fowl_old, 1), 0);
      END IF;
    END IF;
  END IF;

  -- -------------------------------------------------------------- 6. match
  IF to_regclass('public.match') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM match WHERE user_id::text = dst_id::text) THEN
      RAISE NOTICE 'match: target already has % row(s) -> skipped', (SELECT count(*) FROM match WHERE user_id::text = dst_id::text);
    ELSE
      v := public._gct_cols('match', ARRAY['id', 'user_id'],
                            jsonb_build_object('user_id', dst_id::text));
      IF v IS NOT NULL THEN
        FOR r IN
          EXECUTE format('SELECT id::text AS old_id FROM match
                           WHERE user_id::text = %L ORDER BY id', src_id::text)
        LOOP
          EXECUTE format('INSERT INTO match (%s) SELECT %s FROM match WHERE id = %L
                          RETURNING id::text', v[1], v[2], r.old_id)
             INTO new_id;
          match_old := match_old || r.old_id;
          match_new := match_new || new_id;
        END LOOP;
        RAISE NOTICE 'match: cloned % row(s)', coalesce(array_length(match_old, 1), 0);
      END IF;
    END IF;
  END IF;

  -- ------------------------------------------------------ 7. match_options
  IF to_regclass('public.match_options') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM match_options WHERE user_id::text = dst_id::text) THEN
      RAISE NOTICE 'match_options: target already has rows -> skipped';
    ELSE
      v := public._gct_cols('match_options', ARRAY['id', 'user_id', 'match_id'],
                            jsonb_build_object('user_id', dst_id::text));
      IF v IS NOT NULL THEN
        v_ins := v[1];
        v_sel := v[2];
        FOR r IN
          EXECUTE format('SELECT id::text AS old_id, match_id::text AS old_match
                            FROM match_options
                           WHERE user_id::text = %L ORDER BY id', src_id::text)
        LOOP
          mapped := NULL;
          IF r.old_match IS NOT NULL THEN
            v_idx := array_position(match_old, r.old_match);
            IF v_idx IS NOT NULL THEN mapped := match_new[v_idx]; END IF;
          END IF;

          EXECUTE format(
            'INSERT INTO match_options (%s, match_id) SELECT %s, %s FROM match_options WHERE id = %L',
            v_ins, v_sel, COALESCE(format('%L', mapped), 'NULL'), r.old_id
          );
        END LOOP;
        RAISE NOTICE 'match_options: target rows now = %', (SELECT count(*) FROM match_options WHERE user_id::text = dst_id::text);
      END IF;
    END IF;
  END IF;

  -- ------------------------------------------------ 8. marketplace_listings
  IF to_regclass('public.marketplace_listings') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM marketplace_listings WHERE user_id = dst_id::text) THEN
      RAISE NOTICE 'marketplace_listings: target already has rows -> skipped';
    ELSE
      v := public._gct_cols('marketplace_listings',
                            ARRAY['id', 'user_id', 'fowl_id'],
                            jsonb_build_object('user_id', dst_id::text));
      IF v IS NOT NULL THEN
        v_ins := v[1];
        v_sel := v[2];
        FOR r IN
          EXECUTE format('SELECT id::text AS old_id, fowl_id AS old_fowl
                            FROM marketplace_listings
                           WHERE user_id = %L ORDER BY id', src_id::text)
        LOOP
          mapped := NULL;
          IF r.old_fowl IS NOT NULL THEN
            v_idx := array_position(fowl_old, r.old_fowl::text);
            IF v_idx IS NOT NULL THEN mapped := fowl_new[v_idx]; END IF;
          END IF;

          EXECUTE format(
            'INSERT INTO marketplace_listings (%s, fowl_id) SELECT %s, %s FROM marketplace_listings WHERE id = %L',
            v_ins, v_sel, COALESCE(format('%L', mapped), 'NULL'), r.old_id
          );
        END LOOP;
        RAISE NOTICE 'marketplace_listings: target rows now = %', (SELECT count(*) FROM marketplace_listings WHERE user_id = dst_id::text);
      END IF;
    END IF;
  END IF;

  -- -------------------------------------------------------- 9. verification
  -- Built dynamically so tables that do not exist in this project yet
  -- (match_options, marketplace_listings) cannot break the run.
  FOR v_tbl IN
    SELECT unnest(ARRAY['fowl', 'match', 'match_options',
                        'marketplace_listings', 'farms', 'profiles'])
  LOOP
    v_col := CASE v_tbl
               WHEN 'farms'   THEN 'owner_id'
               WHEN 'profiles' THEN 'id'
               ELSE 'user_id'
             END;
    CONTINUE WHEN to_regclass('public.' || v_tbl) IS NULL;

    EXECUTE format('SELECT count(*) FROM %I WHERE %I::text = %L',
                   v_tbl, v_col, src_id::text) INTO v_n;
    v_src_txt := v_src_txt || format(' %s=%s', v_tbl, v_n);

    EXECUTE format('SELECT count(*) FROM %I WHERE %I::text = %L',
                   v_tbl, v_col, dst_id::text) INTO v_n;
    v_dst_txt := v_dst_txt || format(' %s=%s', v_tbl, v_n);
  END LOOP;

  RAISE NOTICE '================ CLONE RESULT ================';
  RAISE NOTICE 'source (%):% ', SRC_EMAIL, v_src_txt;
  RAISE NOTICE 'target (%):% ', coalesce(dst_email, dst_id::text), v_dst_txt;
  RAISE NOTICE 'source rows are UNCHANGED (this was a copy, not a move).';
  RAISE NOTICE '==============================================';
END $$;

-- Clean up the helpers so they do not linger in the schema.
DROP FUNCTION IF EXISTS public._gct_copy(text, text, text, text[], jsonb);
DROP FUNCTION IF EXISTS public._gct_cols(text, text[], jsonb);

-- ==============================================================================
-- POST-RUN VERIFICATION (run these yourself afterwards)
--   NOTE: match_options and marketplace_listings do NOT exist in this project
--   yet, so skip any statement below that touches them until those migrations
--   are applied.
-- ==============================================================================
-- (1) Source must be untouched, target must be populated.
--     Expected today: source fowl=31, match=5, profiles=1, farms=0.
--     Paste the two UUIDs (Dashboard -> Authentication -> Users).
--     SELECT 'source' AS side, count(*) FROM fowl WHERE user_id = 'SOURCE-UUID'
--     UNION ALL
--     SELECT 'target', count(*) FROM fowl WHERE user_id = 'TARGET-UUID';
--
-- (2) No admin rights leaked to the new account:
--     SELECT id, email, full_name, role, is_admin, is_active
--       FROM profiles WHERE id = 'TARGET-UUID';
--     EXPECT: role='owner', is_admin=false, is_active=true
--
-- (3) Cloned bets point at the cloned matches (only when match_options exists):
--     SELECT mo.match_id, m.user_id
--       FROM match_options mo LEFT JOIN match m ON m.id = mo.match_id
--      WHERE mo.user_id = 'TARGET-UUID'
--        AND (m.id IS NULL OR m.user_id <> mo.user_id);
--     EXPECT: 0 rows
--
-- (4) Everything the new user can see (what their session will return):
--     SELECT count(*) FROM fowl WHERE user_id = auth.uid();  -- run as that user
--
-- SHARED MEDIA: image_url / video_url were copied as-is. Both accounts point at
-- the same public files in the fowl-images / match-videos buckets, so the new
-- owner sees the pictures and videos right away. If the source owner ever
-- deletes an image/video, the clone's link to that file disappears too.
--
-- ROLLBACK (undo the clone, source is never affected):
--     DELETE FROM marketplace_listings WHERE user_id = 'TARGET-UUID';
--     DELETE FROM match_options        WHERE user_id = 'TARGET-UUID';
--     DELETE FROM match                WHERE user_id = 'TARGET-UUID';
--     DELETE FROM fowl                 WHERE user_id = 'TARGET-UUID';
--     DELETE FROM farms                WHERE owner_id = 'TARGET-UUID';
--     DELETE FROM profiles             WHERE id       = 'TARGET-UUID';
-- ==============================================================================
