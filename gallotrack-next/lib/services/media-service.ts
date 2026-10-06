import { supabase } from '@/lib/registry';
import type { MatchMedia, FowlPhotoRecord, ShareLinkRecord } from '@/lib/types';

const MAX_MATCH_VIDEOS = 3;

export async function fetchMatchMedia(matchIds: number[]): Promise<Map<number, MatchMedia>> {
  const map = new Map<number, MatchMedia>();
  if (matchIds.length === 0) return map;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return map;

  const [videosRes, photosRes] = await Promise.all([
    supabase
      .from('match_videos')
      .select('match_id, url, sort_order')
      .in('match_id', matchIds)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('match_photos')
      .select('match_id, url, sort_order')
      .in('match_id', matchIds)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
  ]);

  for (const row of videosRes.data || []) {
    const entry = map.get(row.match_id) || { videos: [], photos: [] };
    entry.videos.push(row.url);
    map.set(row.match_id, entry);
  }
  for (const row of photosRes.data || []) {
    const entry = map.get(row.match_id) || { videos: [], photos: [] };
    entry.photos.push(row.url);
    map.set(row.match_id, entry);
  }
  return map;
}

export function videosFor(media: Map<number, MatchMedia>, matchId: number): string[] {
  const entry = media.get(matchId);
  return entry ? entry.videos : [];
}

export function photosFor(media: Map<number, MatchMedia>, matchId: number): string[] {
  const entry = media.get(matchId);
  return entry ? entry.photos : [];
}

export async function insertMatchVideo(matchId: number, url: string, sortOrder: number): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('match_videos')
    .insert([{ match_id: matchId, user_id: user.id, url, sort_order: sortOrder }]);
  return error ? { error: error.message } : {};
}

export async function insertMatchPhoto(matchId: number, url: string, sortOrder: number): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('match_photos')
    .insert([{ match_id: matchId, user_id: user.id, url, sort_order: sortOrder }]);
  return error ? { error: error.message } : {};
}

export async function fetchFowlPhotos(fowlId: number): Promise<FowlPhotoRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('fowl_photos')
    .select('*')
    .eq('fowl_id', fowlId)
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) {
    console.error('Failed to fetch fowl photos:', error);
    return [];
  }
  return data || [];
}

export async function insertFowlPhoto(fowlId: number, url: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('fowl_photos')
    .insert([{ fowl_id: fowlId, user_id: user.id, url }]);
  return error ? { error: error.message } : {};
}

export async function deleteMatchVideo(id: number): Promise<{ error?: string }> {
  const { error } = await supabase.from('match_videos').delete().eq('id', id);
  return error ? { error: error.message } : {};
}

export async function deleteMatchPhoto(id: number): Promise<{ error?: string }> {
  const { error } = await supabase.from('match_photos').delete().eq('id', id);
  return error ? { error: error.message } : {};
}

export async function deleteFowlPhoto(id: number): Promise<{ error?: string }> {
  const { error } = await supabase.from('fowl_photos').delete().eq('id', id);
  return error ? { error: error.message } : {};
}

export async function fetchMatchVideoRows(matchIds: number[]): Promise<{ id: number; match_id: number; url: string }[]> {
  if (matchIds.length === 0) return [];
  const { data, error } = await supabase
    .from('match_videos')
    .select('id, match_id, url')
    .in('match_id', matchIds)
    .order('sort_order', { ascending: true });
  return error ? [] : (data || []);
}

export async function fetchMatchPhotoRows(matchIds: number[]): Promise<{ id: number; match_id: number; url: string }[]> {
  if (matchIds.length === 0) return [];
  const { data, error } = await supabase
    .from('match_photos')
    .select('id, match_id, url')
    .in('match_id', matchIds)
    .order('sort_order', { ascending: true });
  return error ? [] : (data || []);
}

export function maxMatchVideos(): number {
  return MAX_MATCH_VIDEOS;
}

export async function uploadMatchPhotoFile(file: File): Promise<{ url?: string; error?: string }> {
  const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
  // Stored under fowl/ so the existing authenticated_upload_fowl + public read
  // policies cover it (storage.objects is not editable from the SQL editor).
  const filePath = `fowl/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const { error } = await supabase.storage.from('fowl-images').upload(filePath, file);
  if (error) return { error: error.message };
  const { data } = supabase.storage.from('fowl-images').getPublicUrl(filePath);
  return { url: data.publicUrl };
}

export async function uploadFowlGalleryFile(file: File): Promise<{ url?: string; error?: string }> {
  const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const filePath = `fowl/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const { error } = await supabase.storage.from('fowl-images').upload(filePath, file);
  if (error) return { error: error.message };
  const { data } = supabase.storage.from('fowl-images').getPublicUrl(filePath);
  return { url: data.publicUrl };
}

export async function createShareLink(
  entityType: 'match' | 'fowl',
  entityId: number
): Promise<{ token?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // The RLS policy only checks that `user_id` is the caller — it says nothing
  // about `entity_id`, which is chosen by the client. Prove the row is ours
  // before minting a public URL to it, or one tenant could link to another's
  // records.
  const table = entityType === 'fowl' ? 'fowl' : 'match';
  const { data: owned, error: ownedErr } = await supabase
    .from(table)
    .select('id')
    .eq('id', entityId)
    .maybeSingle();
  if (ownedErr) return { error: ownedErr.message };
  if (!owned) return { error: 'Record not found or not owned by you' };

  const token = crypto.randomUUID().replace(/-/g, '');
  const { error } = await supabase
    .from('share_links')
    .insert([{ user_id: user.id, entity_type: entityType, entity_id: entityId, token }]);
  if (error) return { error: error.message };
  return { token };
}

export async function findShareLink(
  entityType: 'match' | 'fowl',
  entityId: number
): Promise<ShareLinkRecord | null> {
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('id', { ascending: false })
    .limit(1);
  if (error) return null;
  return (data && data[0]) || null;
}

export async function revokeShareLink(id: number): Promise<{ error?: string }> {
  const { error } = await supabase.from('share_links').delete().eq('id', id);
  return error ? { error: error.message } : {};
}
