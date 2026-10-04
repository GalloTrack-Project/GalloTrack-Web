-- Add verification and suspend support to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- Backfill: existing active users get 'active', deactivated get 'deactivated'
UPDATE profiles SET account_status = 'active' WHERE is_active = true AND account_status = 'active';
UPDATE profiles SET account_status = 'deactivated' WHERE is_active = false AND account_status = 'active';

-- Add RLS for audit_logs insert (authenticated admins)
DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );
