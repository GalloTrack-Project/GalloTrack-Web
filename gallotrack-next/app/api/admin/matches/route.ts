import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/verify-admin';

export async function GET(request: NextRequest) {
  const result = await verifyAdmin(request);
  if (!result.ok) return result.response;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (userId) {
    const { data: matches, error } = await result.adminClient
      .from('match')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ matches: matches || [] });
  }

  const { data: matches, error } = await result.adminClient
    .from('match')
    .select('*')
    .order('id', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((matches || []).map((m: { user_id: string }) => m.user_id))];
  const [profilesRes, farmsRes] = await Promise.all([
    result.adminClient.from('profiles').select('id, full_name, farm_name').in('id', userIds),
    result.adminClient.from('farms').select('owner_id, farm_name').in('owner_id', userIds),
  ]);

  const profileMap = new Map((profilesRes.data || []).map((p: { id: string; full_name?: string; farm_name?: string }) => [p.id, p]));
  const farmMap = new Map((farmsRes.data || []).map((f: { owner_id: string; farm_name?: string }) => [f.owner_id, f]));

  const enriched = (matches || []).map((m: Record<string, unknown>) => {
    const profile = profileMap.get(m.user_id as string);
    const farm = farmMap.get(m.user_id as string);
    const resolvedName = (profile?.farm_name || farm?.farm_name || '').trim();
    return {
      ...m,
      owner_name: (profile?.full_name || '').trim() || 'Unknown',
      farm_name: resolvedName || (profile?.full_name || '').trim() || 'Unknown',
    };
  });

  return NextResponse.json({ matches: enriched });
}
