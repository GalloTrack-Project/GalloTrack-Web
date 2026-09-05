import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function sanitizeInput(value: string): string {
  return value.replace(/[<>&"'/]/g, '').trim();
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase(request);
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('fowl')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase(request);
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const requiredFields = ['name', 'breed', 'gender'];
    for (const field of requiredFields) {
      if (!body[field] || String(body[field]).trim() === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const payload = {
      user_id: user.id,
      name: sanitizeInput(String(body.name)),
      breed: sanitizeInput(String(body.breed)) || 'Unspecified Strain',
      gender: body.gender || 'Rooster',
      color: body.color || 'Bright Red',
      color_category: body.color_category || 'Red',
      growth_stage: body.growth_stage || '',
      behavior_trait: body.behavior_trait || 'Wave-Motion Tracker',
      eye_variant: body.eye_variant || 'Standard Eye',
      birthdate: body.birthdate || '',
      age: body.age || 'N/A',
      weight: body.weight || 'N/A',
      height: body.height || 'N/A',
      leg_color: body.leg_color || 'N/A',
      sire: body.sire ? sanitizeInput(String(body.sire)) : 'Foundation Stock',
      dam: body.dam ? sanitizeInput(String(body.dam)) : 'Foundation Stock',
      sire_pct: Number(body.sire_pct) || 0,
      dam_pct: Number(body.dam_pct) || 0,
      bloodline_pct: Number(body.bloodline_pct) || 0,
      status: 'Active',
      image_url: body.image_url || '',
    };

    if (payload.name.length > 100) {
      return NextResponse.json({ error: 'Name too long (max 100 characters)' }, { status: 400 });
    }

    if (payload.sire_pct < 0 || payload.sire_pct > 100 || payload.dam_pct < 0 || payload.dam_pct > 100) {
      return NextResponse.json({ error: 'Bloodline percentages must be between 0 and 100' }, { status: 400 });
    }

    const { error: insertErr } = await supabase.from('fowl').insert([payload]);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
