import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/api/verify-admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  const result = await verifyAdmin(request);
  if (!result.ok) return result.response;

  const { data: authUsers, error: authError } = await result.adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const { data: profiles } = await result.adminClient
    .from('profiles')
    .select('*');

  const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));

  const users = (authUsers.users || []).map((au) => {
    const profile = profilesMap.get(au.id);
    return {
      id: au.id,
      email: au.email || '',
      created_at: au.created_at,
      last_sign_in_at: au.last_sign_in_at,
      email_confirmed_at: au.email_confirmed_at,
      user_metadata: au.user_metadata || {},
      profile: profile || null,
    };
  });

  return NextResponse.json({ users });
}
