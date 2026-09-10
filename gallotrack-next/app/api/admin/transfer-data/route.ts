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
  return { adminClient: userClient, adminUserId: user.id, serviceClient: createClient(supabaseUrl, supabaseServiceKey) };
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { target_email } = body;

    if (!target_email || typeof target_email !== 'string') {
      return NextResponse.json({ error: 'Missing target_email' }, { status: 400 });
    }

    // Find target user by email using admin lookup
    const { data: targetUser, error: lookupError } = await admin.serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (lookupError) {
      return NextResponse.json({ error: `Lookup failed: ${lookupError.message}` }, { status: 500 });
    }

    const target = targetUser.users?.find((u) => u.email === target_email);
    if (!target) {
      return NextResponse.json({ error: `No user found with email: ${target_email}` }, { status: 404 });
    }

    if (target.id === admin.adminUserId) {
      return NextResponse.json({ error: 'Cannot transfer to the same account' }, { status: 400 });
    }

    // Transfer fowls
    const { count: fowlsTransferred, error: fowlError } = await admin.serviceClient
      .from('fowl')
      .update({ user_id: target.id }, { count: 'exact' })
      .eq('user_id', admin.adminUserId);

    if (fowlError) {
      return NextResponse.json({ error: `Fowl transfer failed: ${fowlError.message}` }, { status: 500 });
    }

    // Transfer matches
    const { count: matchesTransferred, error: matchError } = await admin.serviceClient
      .from('match')
      .update({ user_id: target.id }, { count: 'exact' })
      .eq('user_id', admin.adminUserId);

    if (matchError) {
      return NextResponse.json({ error: `Match transfer failed: ${matchError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fowls_transferred: fowlsTransferred || 0,
      matches_transferred: matchesTransferred || 0,
      target_email,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
