import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sanitize } from '@/lib/sanitize';
import { fetchMatchMediaBatch } from '@/lib/services/media-service';
import { filterAllowedColumns } from '@/lib/schema-contract';

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

const VALID_OUTCOMES = ['win', 'loss', 'draw', 'no contest'];

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
    .from('match')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('id', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rawMatches = data || [];
  const mediaMap = await fetchMatchMediaBatch(rawMatches, supabase);
  const enriched = rawMatches.map((m) => {
    const media = mediaMap.get(m.id) || { videos: [], photos: [], videoPosters: [] };
    const videos = media.videos.length > 0 ? media.videos : (m.video_url ? [m.video_url] : []);
    const photos = media.photos || [];
    return {
      ...m,
      video_count: videos.length,
      photo_count: photos.length,
      videos,
      photos,
      video_posters: media.videoPosters,
    };
  });

  return NextResponse.json({ data: enriched });
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

    let fowlId: number | null = null;
    let entryName = body.entry_name ? sanitize(String(body.entry_name)) : '';
    let breed = body.breed ? sanitize(String(body.breed)) : 'Unknown';

    if (body.fowl_id != null) {
      const parsedFowlId = Number(body.fowl_id);
      if (isNaN(parsedFowlId)) {
        return NextResponse.json({ error: 'Invalid fowl_id parameter' }, { status: 400 });
      }

      // Query fowl for ownership, gender, and status validation
      const { data: fowlData, error: fowlErr } = await supabase
        .from('fowl')
        .select('id, user_id, name, breed, gender, status')
        .eq('id', parsedFowlId)
        .maybeSingle();

      if (fowlErr || !fowlData) {
        return NextResponse.json({ error: 'Chicken record not found' }, { status: 400 });
      }

      // Ensure chicken belongs to authenticated user
      if (fowlData.user_id !== auth.user.id) {
        return NextResponse.json({ error: 'Chicken record does not belong to your account' }, { status: 403 });
      }

      // Only active chickens can participate in competitive matches
      if (fowlData.status !== 'Active') {
        return NextResponse.json({
          error: `Chicken "${fowlData.name}" is marked as ${fowlData.status}. Only active roosters can be entered in matches.`,
        }, { status: 400 });
      }

      // Male roosters only
      const genderLower = (fowlData.gender || '').toLowerCase();
      const isMale = genderLower === 'rooster' || genderLower === 'cock' || genderLower === 'stag' || genderLower === 'male';
      if (!isMale) {
        return NextResponse.json({ error: 'Only male roosters can be entered in competitive matches' }, { status: 400 });
      }

      fowlId = fowlData.id;
      if (!entryName) entryName = sanitize(fowlData.name);
      if ((!body.breed || body.breed === 'Unknown') && fowlData.breed) {
        breed = sanitize(fowlData.breed);
      }
    }

    if (!entryName || entryName.trim() === '') {
      return NextResponse.json({ error: 'Missing required field: entry_name' }, { status: 400 });
    }

    const outcome = body.outcome ? String(body.outcome).trim() : 'Win';
    if (body.outcome && !VALID_OUTCOMES.includes(outcome.toLowerCase())) {
      return NextResponse.json({ error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(', ')}` }, { status: 400 });
    }

    // Post-fight condition comes from the editable registry list — any
    // non-empty value is valid (legacy + farm-custom conditions included).
    if (body.post_fight_condition && String(body.post_fight_condition).trim() === '') {
      return NextResponse.json({ error: 'Post-fight condition cannot be blank' }, { status: 400 });
    }

    if (body.date) {
      const dateObj = new Date(body.date);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (dateObj > today) {
        return NextResponse.json({ error: 'Match date cannot be in the future' }, { status: 400 });
      }
    }

    const rawPayload: Record<string, unknown> = {
      user_id: auth.user.id,
      fowl_id: fowlId,
      date: body.date || new Date().toISOString().split('T')[0],
      entry_name: entryName,
      breed: breed,
      opponent: body.opponent ? sanitize(String(body.opponent)) : 'Anonymous Opponent',
      opponent_breed: body.opponent_breed ? sanitize(String(body.opponent_breed)) : '',
      opponent_bloodline: body.opponent_bloodline ? sanitize(String(body.opponent_bloodline)) : null,
      opponent_birthdate: body.opponent_birthdate ? String(body.opponent_birthdate) : null,
      opponent_photo_url: body.opponent_photo_url || null,
      opponent_id: body.opponent_id || null,
      location: body.location ? sanitize(String(body.location)) : '',
      type: body.type || 'Main Event',
      derby_match_number: body.derby_match_number || 1,
      outcome: outcome,
      status: 'Verified',
      post_fight_condition: body.post_fight_condition || 'Fit / Recovered',
      side: body.side ? sanitize(String(body.side)) : null,
      notes: body.notes ? sanitize(String(body.notes)) : null,
      video_url: body.video_url || null,
      cock_count: body.cock_count || 2,
      age_category: body.age_category || 'Cock',
      event_type: body.event_type || 'Derby',
    };

    const payload = filterAllowedColumns('match', rawPayload);

    const { data: inserted, error: insertErr } = await supabase
      .from('match')
      .insert([payload])
      .select('id')
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { id: inserted.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
