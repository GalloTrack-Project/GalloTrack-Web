import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const updatePayload: Record<string, unknown> = {};
  if (body.farm_name !== undefined) updatePayload.farm_name = body.farm_name;
  if (body.phone_number !== undefined) updatePayload.phone_number = body.phone_number;
  if (body.full_name !== undefined) updatePayload.full_name = body.full_name;

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ success: true });
  }

  updatePayload.updated_at = new Date().toISOString();

  const { error } = await userClient
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message, column_hints: error.details }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
