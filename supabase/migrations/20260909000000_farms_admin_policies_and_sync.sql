-- ==============================================================================
-- GALLOTRACK: FARMS ADMIN POLICIES + CLEANUP (idempotent)
-- ==============================================================================
-- Adds admin read-all and delete-any policies to the `farms` table so that
-- admin users can view and manage farm records for user deletion workflows.
--
-- Also consolidates the dual is_admin/role flags by adding a trigger that
-- keeps them in sync automatically.
-- ==============================================================================

-- ==============================================================================
-- 1. FARMS: admin read-all and delete-any policies
-- ==============================================================================
DROP POLICY IF EXISTS admin_read_all_farms ON farms;
CREATE POLICY admin_read_all_farms ON farms
  FOR SELECT USING (
    owner_id::uuid = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

DROP POLICY IF EXISTS admin_delete_any_farms ON farms;
CREATE POLICY admin_delete_any_farms ON farms
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles adm WHERE adm.id::uuid = auth.uid() AND (adm.is_admin = true OR adm.role = 'admin'))
  );

-- ==============================================================================
-- 2. SYNC TRIGGER: keep is_admin and role columns in sync
--    Prevents desync between the two parallel admin flags.
-- ==============================================================================
CREATE OR REPLACE FUNCTION sync_admin_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- When role changes, update is_admin to match
  IF NEW.role = 'admin' AND NEW.is_admin = false THEN
    NEW.is_admin := true;
  ELSIF NEW.role = 'owner' AND NEW.is_admin = true THEN
    NEW.is_admin := false;
  END IF;

  -- When is_admin changes, update role to match
  IF NEW.is_admin = true AND NEW.role != 'admin' THEN
    NEW.role := 'admin';
  ELSIF NEW.is_admin = false AND NEW.role != 'owner' THEN
    NEW.role := 'owner';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_admin_flags_trigger ON profiles;
CREATE TRIGGER sync_admin_flags_trigger
  BEFORE INSERT OR UPDATE OF is_admin, role
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_flags();

-- ==============================================================================
-- 3. POST-RUN VERIFICATION
-- ==============================================================================
-- (1) Admin policies on farms:
--     SELECT policyname FROM pg_policies
--     WHERE schemaname = 'public' AND tablename = 'farms'
--     ORDER BY policyname;
--     EXPECT: admin_delete_any_farms, admin_read_all_farms,
--             farms_owner_delete, farms_owner_insert,
--             farms_owner_select, farms_owner_update
--
-- (2) Verify trigger exists:
--     SELECT trigger_name FROM information_schema.triggers
--     WHERE event_object_table = 'profiles' AND trigger_name = 'sync_admin_flags_trigger';
-- ==============================================================================
