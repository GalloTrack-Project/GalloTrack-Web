import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/verify-admin';

export async function GET(request: NextRequest) {
  const result = await verifyAdmin(request);
  if (!result.ok) return result.response;

  const [fowlsResult, matchesResult, profilesResult, activeProfilesResult] = await Promise.all([
    result.adminClient.from('fowl').select('id', { count: 'exact', head: true }),
    result.adminClient.from('match').select('id', { count: 'exact', head: true }),
    result.adminClient.from('profiles').select('id', { count: 'exact', head: true }),
    result.adminClient.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
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
