import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const { data: profile } = await userClient.from('profiles').select('is_admin, role').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin && profile?.role !== 'admin') return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: listings, error } = await admin
    .from('marketplace_listing')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((listings || []).map((l: { user_id: string }) => l.user_id))];
  const { data: profiles } = await admin
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
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { id, status, admin_notes } = body;

    if (!id) return NextResponse.json({ error: 'Missing listing id' }, { status: 400 });
    if (!status || !['approved', 'flagged', 'removed', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    const { error: updateErr } = await admin
      .from('marketplace_listing')
      .update(updates)
      .eq('id', id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
