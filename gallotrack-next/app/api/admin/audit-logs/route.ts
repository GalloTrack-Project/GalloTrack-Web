import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/api/verify-admin';
import { logAdminAction } from '@/lib/api/audit-log';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];

  const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await userClient
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin' || profile?.is_admin === true;
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: logs, error } = await adminClient
    .from('admin_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: logs || [] });
}

/**
 * Records an audit entry on behalf of an admin whose own client cannot write
 * the table directly (RLS keeps `admin_audit_logs` service-role only). Used by
 * the in-app admin actions — suspending a user, changing a role, saving system
 * settings — that run from the browser.
 */
export async function POST(request: NextRequest) {
  const result = await verifyAdmin(request);
  if (!result.ok) return result.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action.trim() : '';
  if (!action || action.length > 64) {
    return NextResponse.json({ error: 'A short action name is required' }, { status: 400 });
  }

  await logAdminAction(result.adminClient, {
    adminId: result.userId,
    action,
    targetType: typeof body.targetType === 'string' ? body.targetType : undefined,
    targetId: typeof body.targetId === 'string' ? body.targetId : undefined,
    details:
      body.details && typeof body.details === 'object' && !Array.isArray(body.details)
        ? (body.details as Record<string, unknown>)
        : undefined,
  });

  return NextResponse.json({ ok: true });
}

/**
 * Purges the audit trail. The purge itself is written back as the newest
 * entry, so clearing the log is never invisible to the next reader.
 */
export async function DELETE(request: NextRequest) {
  const result = await verifyAdmin(request);
  if (!result.ok) return result.response;

  const { error } = await result.adminClient.from('admin_audit_logs').delete().neq('id', '');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(result.adminClient, {
    adminId: result.userId,
    action: 'audit_logs_cleared',
    targetType: 'admin_audit_logs',
  });

  return NextResponse.json({ ok: true });
}
