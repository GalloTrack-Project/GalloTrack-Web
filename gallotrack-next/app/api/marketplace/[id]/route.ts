import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function verifyActiveUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' as const };
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .maybeSingle<{ is_active?: boolean | null }>();
  if (profile?.is_active === false) return { error: 'Account deactivated' as const };
  return { user };
}

function sanitize(value: string): string {
  return value.replace(/[<>&"'/]/g, '').trim();
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase(request);
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await verifyActiveUser(supabase);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 });

  const { id } = await params;

  const { data: existing } = await supabase
    .from('marketplace_listing')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', auth.user.id)
    .maybeSingle();

  const isAdmin = profile?.is_admin || profile?.role === 'admin';
  if (existing.user_id !== auth.user.id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) updates.title = sanitize(String(body.title));
    if (body.description !== undefined) updates.description = sanitize(String(body.description));
    if (body.price !== undefined) updates.price = Number(body.price);
    if (body.breed !== undefined) updates.breed = sanitize(String(body.breed));
    if (body.gender !== undefined) updates.gender = body.gender;
    if (body.age !== undefined) updates.age = body.age;
    if (body.weight !== undefined) updates.weight = body.weight;
    if (body.color !== undefined) updates.color = body.color;
    if (body.image_url !== undefined) updates.image_url = body.image_url;
    if (isAdmin && body.status !== undefined) updates.status = body.status;
    if (isAdmin && body.admin_notes !== undefined) updates.admin_notes = body.admin_notes;

    const { error: updateErr } = await supabase
      .from('marketplace_listing')
      .update(updates)
      .eq('id', id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase(request);
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await verifyActiveUser(supabase);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 });

  const { id } = await params;

  const { data: existing } = await supabase
    .from('marketplace_listing')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', auth.user.id)
    .maybeSingle();

  const isAdmin = profile?.is_admin || profile?.role === 'admin';
  if (existing.user_id !== auth.user.id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error: deleteErr } = await supabase
    .from('marketplace_listing')
    .delete()
    .eq('id', id);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
