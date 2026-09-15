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

  const [fowlsResult, matchesResult, profilesResult, activeProfilesResult] = await Promise.all([
    admin.from('fowl').select('id', { count: 'exact', head: true }),
    admin.from('match').select('id', { count: 'exact', head: true }),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  if (fowlsResult.error) return NextResponse.json({ error: fowlsResult.error.message }, { status: 500 });
  if (matchesResult.error) return NextResponse.json({ error: matchesResult.error.message }, { status: 500 });
  if (profilesResult.error) return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });

  return NextResponse.json({
    total_fowls: fowlsResult.count || 0,
    total_matches: matchesResult.count || 0,
    total_users: profilesResult.count || 0,
    active_users: activeProfilesResult.count || 0,
  });
}
