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

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (userId) {
    const { data: matches, error } = await admin
      .from('match')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ matches: matches || [] });
  }

  const { data: matches, error } = await admin
    .from('match')
    .select('*')
    .order('id', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((matches || []).map((m: { user_id: string }) => m.user_id))];
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, farm_name')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map((p: { id: string; full_name?: string; farm_name?: string }) => [p.id, p]));

  const enriched = (matches || []).map((m: Record<string, unknown>) => ({
    ...m,
    owner_name: profileMap.get(m.user_id as string)?.full_name || 'Unknown',
    farm_name: profileMap.get(m.user_id as string)?.farm_name || 'Unknown',
  }));

  return NextResponse.json({ matches: enriched });
}
