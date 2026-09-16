import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type AdminVerifyResult =
  | { ok: true; adminClient: SupabaseClient; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Shared admin verification for API routes.
 * Returns a service-role Supabase client if the caller is an admin,
 * or a 403/401 NextResponse if not.
 */
export async function verifyAdmin(request: NextRequest): Promise<AdminVerifyResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = authHeader.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile } = await userClient
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_admin && profile?.role !== 'admin') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  return { ok: true, adminClient, userId: user.id };
}
