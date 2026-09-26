import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sanitize } from '@/lib/sanitize';
import type { FowlRecord } from '@/lib/types';
import {
  computeBloodlineComposition,
  getBloodlineStats,
} from '@/lib/bloodline-composition';
import {
  buildCodeSet,
  isValidBirdCode,
  previewBirdCode,
  resolveBirdCodes,
} from '@/lib/bird-code';

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

async function verifyActiveUser(supabaseClient: SupabaseClient) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return { error: 'Unauthorized' as const };
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .maybeSingle<{ is_active?: boolean | null }>();
  if (profile?.is_active === false) return { error: 'Account deactivated' as const };
  return { user };
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase(request);
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const auth = await verifyActiveUser(supabase);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 });
  }

  const { data, error } = await supabase
    .from('fowl')
    .select('*')
    .eq('user_id', auth.user.id)
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

  const auth = await verifyActiveUser(supabase);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 });
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
      user_id: auth.user.id,
      name: sanitize(String(body.name)),
      breed: sanitize(String(body.breed)) || 'Unspecified Strain',
      gender: body.gender || 'Rooster',
      color: body.color || 'Bright Red',
      color_category: body.color_category || 'Red',
      growth_stage: body.growth_stage || '',
      behavior_trait: body.behavior_trait || 'Wave-Motion Tracker',
      eye_variant: body.eye_variant || 'Standard Eye',
      birthdate: body.birthdate || null,
      age: body.age || 'N/A',
      weight: body.weight || '',
      height: body.height || '',
      leg_color: body.leg_color || 'N/A',
      sire: body.sire ? sanitize(String(body.sire)) : 'Foundation Stock',
      dam: body.dam ? sanitize(String(body.dam)) : 'Foundation Stock',
      sire_pct: Number(body.sire_pct) || 0,
      dam_pct: Number(body.dam_pct) || 0,
      bloodline_pct: Number(body.bloodline_pct) || 0,
      bloodline_composition: null as Record<string, number> | null,
      bird_code: null as string | null,
      status: 'Active',
      image_url: body.image_url || '',
    };

    if (payload.name.length > 100) {
      return NextResponse.json({ error: 'Name too long (max 100 characters)' }, { status: 400 });
    }

    if (payload.sire_pct < 0 || payload.sire_pct > 100 || payload.dam_pct < 0 || payload.dam_pct > 100) {
      return NextResponse.json({ error: 'Bloodline percentages must be between 0 and 100' }, { status: 400 });
    }

    // ── Genetics: per-strain bloodline composition (50/50 inheritance rule) ──
    const { data: registryRows } = await supabase
      .from('fowl')
      .select('*')
      .eq('user_id', auth.user.id);
    const fowls = (registryRows || []) as FowlRecord[];

    const composition = computeBloodlineComposition(
      {
        id: -1,
        name: payload.name,
        breed: payload.breed,
        gender: payload.gender,
        sire: payload.sire,
        dam: payload.dam,
      } as FowlRecord,
      fowls
    );
    const stats = getBloodlineStats(composition);
    if (stats) {
      payload.bloodline_composition = composition;
      payload.bloodline_pct = stats.specificPct;
    }

    // ── Standardized bird code (1A / 1B / 1Ax1B) ──
    const codes = resolveBirdCodes(fowls);
    const taken = buildCodeSet(Array.from(codes.values()));
    // Validate the raw input first — normalizing would silently truncate oversize codes.
    const rawCode = String(body.bird_code ?? '').replace(/\s+/g, '');
    if (rawCode && !isValidBirdCode(rawCode)) {
      return NextResponse.json(
        { error: 'Invalid chicken code — use letters, numbers, x, - or . only, max 24 chars (e.g. 1A, 1Ax1B)' },
        { status: 400 }
      );
    }
    const requestedCode = rawCode;
    if (requestedCode && taken.has(requestedCode.toLowerCase())) {
      return NextResponse.json({ error: `Chicken code "${requestedCode}" is already in use` }, { status: 409 });
    }
    payload.bird_code =
      requestedCode ||
      previewBirdCode({
        gender: payload.gender,
        sireName: payload.sire,
        damName: payload.dam,
        fowls,
        taken,
      });

    const { error: insertErr } = await supabase.from('fowl').insert([payload]);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
