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

  // If user_id is provided, fetch fowls for that specific user
  if (userId) {
    const { data: fowls, error } = await admin
      .from('fowl')
      .select('id, name, breed, gender, growth_stage, birthdate, status, created_at, sire, dam, image_url')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ fowls: fowls || [] });
  }

  // If no user_id, fetch ALL fowls (admin flock audit)
  const { data: fowls, error } = await admin
    .from('fowl')
    .select('id, name, breed, gender, growth_stage, birthdate, status, created_at, sire, dam, image_url, user_id')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch owner names for each fowl
  const userIds = [...new Set((fowls || []).map((f: { user_id: string }) => f.user_id))];
  const [profilesRes, farmsRes] = await Promise.all([
    admin.from('profiles').select('id, full_name, farm_name').in('id', userIds),
    admin.from('farms').select('owner_id, farm_name').in('owner_id', userIds),
  ]);

  const profileMap = new Map((profilesRes.data || []).map((p: { id: string; full_name?: string; farm_name?: string }) => [p.id, p]));
  const farmMap = new Map((farmsRes.data || []).map((f: { owner_id: string; farm_name?: string }) => [f.owner_id, f]));

  const enriched = (fowls || []).map((f: Record<string, unknown>) => {
    const profile = profileMap.get(f.user_id as string);
    const farm = farmMap.get(f.user_id as string);
    const resolvedName = (profile?.farm_name || farm?.farm_name || profile?.full_name || '').trim();
    return {
      ...f,
      owner_name: (profile?.full_name || '').trim() || 'Unknown',
      farm_name: resolvedName || 'Unknown',
    };
  });

  return NextResponse.json({ fowls: enriched });
}
