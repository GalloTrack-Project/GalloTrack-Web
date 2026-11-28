-- ==============================================================================
-- GALLOTRACK: DERIVED MILESTONE NOTIFICATION STATE
-- ==============================================================================
-- Additive only. These tables store per-user read/dismiss state and preferences
-- for notifications that are derived in the browser from chicken birth dates.
-- No existing table is altered and no notification rows are generated here.
--
-- REVIEW BEFORE APPLY: do not apply until the migration review is approved.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notification_state (
  user_id      UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,
  read_at      TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id    UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  settings   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_state_owner_select" ON public.notification_state;
CREATE POLICY "notification_state_owner_select" ON public.notification_state
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_state_owner_insert" ON public.notification_state;
CREATE POLICY "notification_state_owner_insert" ON public.notification_state
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_state_owner_update" ON public.notification_state;
CREATE POLICY "notification_state_owner_update" ON public.notification_state
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_state_owner_delete" ON public.notification_state;
CREATE POLICY "notification_state_owner_delete" ON public.notification_state
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_preferences_owner_select" ON public.notification_preferences;
CREATE POLICY "notification_preferences_owner_select" ON public.notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_preferences_owner_insert" ON public.notification_preferences;
CREATE POLICY "notification_preferences_owner_insert" ON public.notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_preferences_owner_update" ON public.notification_preferences;
CREATE POLICY "notification_preferences_owner_update" ON public.notification_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_preferences_owner_delete" ON public.notification_preferences;
CREATE POLICY "notification_preferences_owner_delete" ON public.notification_preferences
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;

REVOKE ALL ON public.notification_state FROM anon;
REVOKE ALL ON public.notification_preferences FROM anon;

CREATE OR REPLACE FUNCTION public.set_notification_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_preferences_set_updated_at ON public.notification_preferences;
CREATE TRIGGER notification_preferences_set_updated_at
  BEFORE INSERT OR UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notification_preferences_updated_at();

COMMENT ON TABLE public.notification_state IS
  'Per-user read and dismissed state for client-derived milestone notifications.';
COMMENT ON TABLE public.notification_preferences IS
  'Per-user preferences for client-derived milestone notifications.';
