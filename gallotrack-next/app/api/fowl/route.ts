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
import { isFoundationStock } from '@/lib/helpers';
import { parentLinkIds } from '@/lib/lineage';

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

    const sireValue = body.sire ? sanitize(String(body.sire)) : 'Foundation Stock';
    const damValue = body.dam ? sanitize(String(body.dam)) : 'Foundation Stock';

    // ── Genetics: per-strain bloodline composition (50/50 inheritance rule) ──
    const { data: registryRows } = await supabase
      .from('fowl')
      .select('*')
      .eq('user_id', auth.user.id);
    const fowls = (registryRows || []) as FowlRecord[];

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
      sire: sireValue,
      dam: damValue,
      ...parentLinkIds({ user_id: auth.user.id }, sireValue, damValue, fowls),
      sire_pct: Number(body.sire_pct) || 0,
      dam_pct: Number(body.dam_pct) || 0,
      bloodline_pct: Number(body.bloodline_pct) || 0,
      bloodline_composition: null as Record<string, number> | null,
      bird_code: null as string | null,
      wing_band: null as string | null,
      status: 'Active',
      image_url: body.image_url || '',
    };

    // ── Wing Band ID — physical band number, must be unique per user ──
    const rawBand = String(body.wing_band ?? '').trim();
    if (rawBand) {
      if (!/^[A-Za-z0-9._-]{1,24}$/.test(rawBand)) {
        return NextResponse.json(
          { error: 'Invalid wing band ID — use letters, numbers, . _ - only, max 24 chars (e.g. W-001)' },
          { status: 400 }
        );
      }
      payload.wing_band = rawBand;
    }

    if (payload.name.length > 100) {
      return NextResponse.json({ error: 'Name too long (max 100 characters)' }, { status: 400 });
    }

    if (payload.sire_pct < 0 || payload.sire_pct > 100 || payload.dam_pct < 0 || payload.dam_pct > 100) {
      return NextResponse.json({ error: 'Bloodline percentages must be between 0 and 100' }, { status: 400 });
    }

    // ── Purity rule: a registered (non-foundation) pair must total 100% ──
    // 0/0 is treated as "unknown heritage" and allowed (matches the client's blank-pct flow).
    if (!isFoundationStock(payload.sire) && !isFoundationStock(payload.dam)) {
      const total = payload.sire_pct + payload.dam_pct;
      if (total !== 0 && total !== 100) {
        return NextResponse.json(
          { error: `Sire and Dam purity must total 100% (got ${total}%). Foundation Stock pairs are exempt.` },
          { status: 400 }
        );
      }
    }

    // ── Wing band must be unique across the owner's registry ──
    if (payload.wing_band) {
      const dupe = fowls.find(
        (f) => (f.wing_band || '').trim().toUpperCase() === payload.wing_band!.toUpperCase()
      );
      if (dupe) {
        return NextResponse.json(
          { error: `Wing band "${payload.wing_band}" is already used by "${dupe.name}"` },
          { status: 409 }
        );
      }
    }

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

    // ── Standardized bird code (sire = 1, dam = A, offspring = 1A1 / 1A₂) ──
    const codes = resolveBirdCodes(fowls);
    const taken = buildCodeSet(Array.from(codes.values()));
    // Validate the raw input first — normalizing would silently truncate oversize codes.
    const rawCode = String(body.bird_code ?? '').replace(/\s+/g, '');
    if (rawCode && !isValidBirdCode(rawCode)) {
      return NextResponse.json(
        { error: 'Invalid chicken code — use letters, numbers, x, - or . only, max 24 chars (e.g. 1, A, 1A1)' },
        { status: 400 }
      );
    }
    const requestedCode = rawCode;
    if (requestedCode && taken.has(requestedCode.toLowerCase())) {
      return NextResponse.json({ error: `Chicken code "${requestedCode}" is already in use` }, { status: 409 });
    }
    const assignedCode =
      requestedCode ||
      previewBirdCode({
        gender: payload.gender,
        sireName: payload.sire,
        damName: payload.dam,
        fowls,
        taken,
      });
    payload.bird_code = assignedCode;
    (payload as Record<string, unknown>).chicken_code = assignedCode;

    let { error: insertErr } = await supabase.from('fowl').insert([payload]);
    if (insertErr && insertErr.message.includes('chicken_code')) {
      const copy = { ...payload };
      delete (copy as Record<string, unknown>).chicken_code;
      const res = await supabase.from('fowl').insert([copy]);
      insertErr = res.error;
    } else if (insertErr && insertErr.message.includes('bird_code')) {
      const copy = { ...payload };
      delete (copy as Record<string, unknown>).bird_code;
      const res = await supabase.from('fowl').insert([copy]);
      insertErr = res.error;
    }

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
