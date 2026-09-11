import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
  const { farm_name, phone_number, full_name } = body;

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (farm_name !== undefined) updatePayload.farm_name = farm_name;
  if (phone_number !== undefined) updatePayload.phone_number = phone_number;
  if (full_name !== undefined) updatePayload.full_name = full_name;

  const { error } = await serviceClient
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
