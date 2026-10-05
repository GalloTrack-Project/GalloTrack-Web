import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || !/^[a-f0-9]{8,64}$/i.test(token)) {
    return NextResponse.json({ error: 'Invalid share token' }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: link, error: linkErr } = await admin
    .from('share_links')
    .select('entity_type, entity_id')
    .eq('token', token)
    .maybeSingle();
  if (linkErr || !link) {
    return NextResponse.json({ error: 'Share link not found or revoked' }, { status: 404 });
  }

  if (link.entity_type === 'match') {
    const { data: match } = await admin
      .from('match')
      .select('*')
      .eq('id', link.entity_id)
      .maybeSingle();
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const [videosRes, photosRes] = await Promise.all([
      admin.from('match_videos').select('url, sort_order').eq('match_id', match.id).order('sort_order'),
      admin.from('match_photos').select('url, sort_order').eq('match_id', match.id).order('sort_order'),
    ]);

    const videos = (videosRes.data || []).map((v) => v.url);
    if (match.video_url && !videos.includes(match.video_url)) videos.unshift(match.video_url);

    return NextResponse.json({
      type: 'match',
      match: {
        date: match.date,
        entry_name: match.entry_name,
        breed: match.breed,
        opponent: match.opponent,
        opponent_breed: match.opponent_breed,
        opponent_bloodline: match.opponent_bloodline,
        opponent_birthdate: match.opponent_birthdate,
        opponent_photo_url: match.opponent_photo_url,
        location: match.location,
        type: match.type,
        event_type: match.event_type,
        age_category: match.age_category,
        cock_count: match.cock_count,
        outcome: match.outcome,
        post_fight_condition: match.post_fight_condition,
        side: match.side,
        notes: match.notes,
      },
      videos,
      photos: (photosRes.data || []).map((p) => p.url),
    });
  }

  const { data: fowl } = await admin
    .from('fowl')
    .select('id, name, breed, gender, birthdate, color, image_url, status, sire, dam, wing_band, bird_code')
    .eq('id', link.entity_id)
    .maybeSingle();
  if (!fowl) return NextResponse.json({ error: 'Chicken not found' }, { status: 404 });

  const { data: photos } = await admin
    .from('fowl_photos')
    .select('url, sort_order')
    .eq('fowl_id', fowl.id)
    .order('sort_order');

  const parentNames = [fowl.sire, fowl.dam]
    .map((n) => (n || '').trim())
    .filter((n) => n && n.toLowerCase() !== 'foundation stock');
  const parents = parentNames.length
    ? ((await admin.from('fowl').select('name, breed').in('name', parentNames)).data || [])
    : [];
  const breedOf = (n?: string | null) => {
    const key = (n || '').trim().toLowerCase();
    if (!key || key === 'foundation stock') return '';
    return parents.find((p) => (p.name || '').trim().toLowerCase() === key)?.breed || '';
  };

  return NextResponse.json({
    type: 'fowl',
    fowl: { ...fowl, sire_breed: breedOf(fowl.sire), dam_breed: breedOf(fowl.dam) },
    photos: (photos || []).map((p) => p.url),
  });
}
