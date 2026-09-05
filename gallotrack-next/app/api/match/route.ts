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

const VALID_OUTCOMES = ['win', 'loss', 'draw', 'no contest'];
const VALID_TYPES = ['Derby Match', 'Sweepstakes', 'Main Stage', 'Uncategorized'];
const VALID_POST_FIGHT = [
  'Fit / Recovered',
  'Minor Injury',
  'Severely Injured',
  'Critical Condition',
  'Deceased',
];

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
    .from('match')
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

    if (!body.entry_name || String(body.entry_name).trim() === '') {
      return NextResponse.json({ error: 'Missing required field: entry_name' }, { status: 400 });
    }

    if (body.outcome && !VALID_OUTCOMES.includes(body.outcome.toLowerCase())) {
      return NextResponse.json({ error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(', ')}` }, { status: 400 });
    }

    if (body.type && !VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: `Invalid match type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    if (body.post_fight_condition && !VALID_POST_FIGHT.includes(body.post_fight_condition)) {
      return NextResponse.json({ error: `Invalid post-fight condition. Must be one of: ${VALID_POST_FIGHT.join(', ')}` }, { status: 400 });
    }

    if (body.date) {
      const dateObj = new Date(body.date);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }
      if (dateObj > new Date()) {
        return NextResponse.json({ error: 'Match date cannot be in the future' }, { status: 400 });
      }
    }

    const payload = {
      user_id: user.id,
      date: body.date || new Date().toISOString().split('T')[0],
      entry_name: sanitizeInput(String(body.entry_name)),
      breed: body.breed || 'Unknown',
      opponent: body.opponent ? sanitizeInput(String(body.opponent)) : 'Anonymous Opponent',
      opponent_breed: body.opponent_breed ? sanitizeInput(String(body.opponent_breed)) : '',
      location: body.location ? sanitizeInput(String(body.location)) : 'Local Breeding Yard',
      type: body.type || 'Derby Match',
      outcome: body.outcome || 'Win',
      status: 'Verified',
      post_fight_condition: body.post_fight_condition || 'Fit / Recovered',
      video_url: body.video_url || null,
    };

    const { error: insertErr } = await supabase.from('match').insert([payload]);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
