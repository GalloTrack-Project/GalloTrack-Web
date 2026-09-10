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

export async function GET(request: NextRequest) {
  const supabase = getSupabase(request);
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await verifyActiveUser(supabase);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 });

  const { data: listings, error } = await supabase
    .from('marketplace_listing')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((listings || []).map((l: { user_id: string }) => l.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, farm_name, phone_number, contact_number')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map((p: Record<string, unknown>) => [p.id, p]));
  const enriched = (listings || []).map((l: Record<string, unknown>) => ({
    ...l,
    seller_name: profileMap.get(l.user_id as string)?.full_name || 'Unknown',
    farm_name: profileMap.get(l.user_id as string)?.farm_name || 'Unknown',
    seller_contact: profileMap.get(l.user_id as string)?.contact_number || profileMap.get(l.user_id as string)?.phone_number || '',
  }));

  return NextResponse.json({ listings: enriched });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase(request);
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await verifyActiveUser(supabase);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 });

  try {
    const body = await request.json();

    if (!body.title || String(body.title).trim() === '') {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 });
    }
    if (!body.breed || String(body.breed).trim() === '') {
      return NextResponse.json({ error: 'Missing required field: breed' }, { status: 400 });
    }
    if (!body.gender) {
      return NextResponse.json({ error: 'Missing required field: gender' }, { status: 400 });
    }
    if (body.price === undefined || body.price === null || Number(body.price) < 0) {
      return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
    }

    const payload = {
      user_id: auth.user.id,
      fowl_id: body.fowl_id || null,
      title: sanitize(String(body.title)),
      description: body.description ? sanitize(String(body.description)) : '',
      price: Number(body.price),
      currency: body.currency || 'PHP',
      breed: sanitize(String(body.breed)),
      gender: body.gender,
      age: body.age || '',
      weight: body.weight || '',
      color: body.color || '',
      image_url: body.image_url || '',
      status: 'pending',
    };

    const { error: insertErr } = await supabase.from('marketplace_listing').insert([payload]);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
