import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];

  const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  return userClient;
}

export async function GET(request: NextRequest) {
  const userClient = getAdminClient(request);
  if (!userClient) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await userClient
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_admin && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const { data: profiles } = await adminClient
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
