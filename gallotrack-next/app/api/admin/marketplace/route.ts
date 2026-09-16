import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/verify-admin';
import { logAdminAction } from '@/lib/api/audit-log';

export async function GET(request: NextRequest) {
  const result = await verifyAdmin(request);
  if (!result.ok) return result.response;

  const { data: listings, error } = await result.adminClient
    .from('marketplace_listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((listings || []).map((l: { user_id: string }) => l.user_id))];
  const { data: profiles } = await result.adminClient
    .from('profiles')
    .select('id, full_name, farm_name')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map((p: { id: string; full_name?: string; farm_name?: string }) => [p.id, p]));
  const enriched = (listings || []).map((l: Record<string, unknown>) => ({
    ...l,
    seller_name: profileMap.get(l.user_id as string)?.full_name || 'Unknown',
    farm_name: profileMap.get(l.user_id as string)?.farm_name || 'Unknown',
  }));

  return NextResponse.json({ listings: enriched });
}

export async function PATCH(request: NextRequest) {
  const result = await verifyAdmin(request);
  if (!result.ok) return result.response;

  try {
    const body = await request.json();
    const { id, status, admin_notes } = body;

    if (!id) return NextResponse.json({ error: 'Missing listing id' }, { status: 400 });
    if (!status || !['approved', 'flagged', 'removed', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    const { error: updateErr } = await result.adminClient
      .from('marketplace_listings')
      .update(updates)
      .eq('id', id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    await logAdminAction(result.adminClient, {
      adminId: result.userId,
      action: `marketplace_${status}`,
      targetType: 'marketplace_listing',
      targetId: id,
      details: { status, admin_notes: admin_notes || null },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
