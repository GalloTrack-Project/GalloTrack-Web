import { SupabaseClient } from '@supabase/supabase-js';

export interface AuditLogEntry {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

/**
 * Insert an audit log entry using the service-role client.
 * Call this after successful admin actions to maintain an audit trail.
 */
export async function logAdminAction(
  adminClient: SupabaseClient,
  entry: AuditLogEntry
): Promise<void> {
  const { error } = await adminClient.from('admin_audit_logs').insert({
    admin_id: entry.adminId,
    action: entry.action,
    target_type: entry.targetType || null,
    target_id: entry.targetId || null,
    details: entry.details || null,
  });

  if (error) {
    console.error('[audit] Failed to write audit log:', error.message);
  }
}

/**
 * Best-effort audit entry for admin actions performed from the browser
 * (profile status changes, role grants, system settings). The write happens
 * server-side because the audit table is service-role only, so this posts to
 * `/api/admin/audit-logs`, which re-verifies the caller is an admin and stamps
 * the entry with that admin's own id.
 *
 * Failures are swallowed on purpose: auditing must never block the action
 * that was already applied.
 */
export async function recordAdminAction(entry: Omit<AuditLogEntry, 'adminId'>): Promise<void> {
  try {
    const { supabase } = await import('@/lib/registry');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    await fetch('/api/admin/audit-logs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch (err) {
    console.error('[audit] Failed to record admin action:', err);
  }
}
