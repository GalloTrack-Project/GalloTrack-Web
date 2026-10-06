-- ==============================================================================
-- GALLOTRACK: PROFILE PRIVILEGE GUARD (idempotent)
-- ==============================================================================
-- `profiles_owner_update` (20260804000000) lets a user update their OWN row,
-- but it is row-level only — it does not restrict WHICH columns move. Without
-- this guard any signed-in account could run:
--
--     update profiles set is_admin = true where id = auth.uid();
--
-- and would then be honoured as an admin by `lib/api/verify-admin.ts` and
-- `proxy.ts`, which both read the caller's own profile row.
--
-- The INSERT half closes the mirror-image hole: `auth-context.tsx` inserts the
-- profile row at signup and passes `role`/`is_admin` from the
-- `system_settings.default_user_role` config, so a configured default of
-- `admin` would make every new signup an admin.
--
-- Rule enforced here: privilege columns (role, is_admin, is_active) are
-- writable only by the service role (admin API routes, migrations, scripts)
-- or by a caller who is ALREADY an admin (the admin panel's own client-side
-- calls). Everyone else may edit their profile, but never its powers.
--
-- Fires before `sync_admin_flags_trigger` (BEFORE triggers run in alphabetical
-- order, `protect...` < `sync...`). Either order is safe: this function only
-- ever reverts to the row's existing values, and the sync trigger then merely
-- keeps role/is_admin consistent with whatever survived here.
-- ==============================================================================

CREATE OR REPLACE FUNCTION protect_profile_privileges()
RETURNS TRIGGER AS $$
DECLARE
  v_claims_text text;
  v_claims      jsonb;
  v_service     boolean := false;
  v_admin       boolean := false;
  v_uid         uuid;
BEGIN
  -- ── 1. Who is writing? ────────────────────────────────────────────────────
  BEGIN
    v_claims_text := nullif(current_setting('request.jwt.claims', true), '');
    v_claims := v_claims_text::jsonb;
  EXCEPTION WHEN others THEN
    v_claims := NULL;
    v_claims_text := NULL;
  END;

  -- No JWT context at all => direct SQL / migration session: trusted.
  IF v_claims_text IS NULL AND current_setting('request.jwt.claims', true) IS NULL THEN
    v_service := true;
  ELSIF v_claims ->> 'role' = 'service_role' THEN
    v_service := true;
  END IF;

  IF NOT v_service THEN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id::uuid = v_uid AND (p.is_admin = true OR p.role = 'admin')
      ) INTO v_admin;
    END IF;
  END IF;

  IF v_service OR v_admin THEN
    RETURN NEW;
  END IF;

  -- ── 2. INSERT: a self-created row can never grant itself admin ────────────
  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.role, 'owner') <> 'owner' OR coalesce(NEW.is_admin, false) THEN
      NEW.role := 'owner';
      NEW.is_admin := false;
    END IF;
    RETURN NEW;
  END IF;

  -- ── 3. UPDATE: unprivileged callers may edit the profile, never its powers ─
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.is_active := OLD.is_active;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_privileges_trigger ON profiles;
CREATE TRIGGER protect_profile_privileges_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_privileges();

-- ==============================================================================
-- POST-RUN VERIFICATION
-- ==============================================================================
-- (1) As a normal (non-admin) signed-in user this must silently do nothing:
--       UPDATE profiles SET is_admin = true, role = 'admin' WHERE id = auth.uid();
--       SELECT is_admin, role FROM profiles WHERE id = auth.uid();  -- unchanged
--
-- (2) Trigger exists:
--       SELECT trigger_name FROM information_schema.triggers
--        WHERE event_object_table = 'profiles'
--          AND trigger_name = 'protect_profile_privileges_trigger';
--
-- (3) Admin panel still works: promote a user from the admin users tab and
--     confirm the row flips (the admin caller is exempt above).
-- ==============================================================================
