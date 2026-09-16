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
