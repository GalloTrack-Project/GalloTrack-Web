import { supabase } from '@/lib/registry';
import type { MatchMedia, FowlPhotoRecord, ShareLinkRecord, MatchRecord } from '@/lib/types';

const MAX_MATCH_VIDEOS = 3;

export type MatchMediaInput = number | { id: number; video_url?: string | null };

/**
 * Shared media resolver: batch-fetches videos and photos for a list of matches,
 * including both the dedicated `match_videos` / `match_photos` tables AND the
 * match's own `video_url` column (the exact same data source and fallback logic
 * used by the public Share route).
 *
 * Runs in exactly 2 batch queries for any number of matches (avoids N+1).
 */
export async function fetchMatchMediaBatch(
  matches: MatchMediaInput[],
  customClient?: any
): Promise<Map<number, MatchMedia>> {
  const map = new Map<number, MatchMedia>();
  if (!matches || matches.length === 0) return map;

  const client = customClient ?? supabase;
  const matchIds = matches.map((m) => (typeof m === 'number' ? m : m.id));

  // Initialize entries and seed any scalar match.video_url
  for (const m of matches) {
    const id = typeof m === 'number' ? m : m.id;
    const vUrl = typeof m === 'number' ? null : (m.video_url || null);
    const videos: string[] = [];
    const videoPosters: (string | null)[] = [];
    if (vUrl && vUrl.trim() !== '') {
      videos.push(vUrl.trim());
      videoPosters.push(null);
    }
    map.set(id, { videos, photos: [], videoPosters });
  }

  const [videosRes, photosRes] = await Promise.all([
    client
      .from('match_videos')
      .select('match_id, url, sort_order, poster_url')
      .in('match_id', matchIds)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
    client
      .from('match_photos')
      .select('match_id, url, sort_order')
      .in('match_id', matchIds)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
  ]);

  let videoRows = videosRes?.data as { match_id: number; url: string; poster_url?: string | null }[] | null;
  if (videosRes?.error) {
    const fallback = await client
      .from('match_videos')
      .select('match_id, url, sort_order')
      .in('match_id', matchIds)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    videoRows = (fallback?.data as { match_id: number; url: string }[] | null)?.map((r: any) => ({ ...r, poster_url: null })) ?? [];
  }

  for (const row of videoRows || []) {
    const entry = map.get(row.match_id) || { videos: [], photos: [], videoPosters: [] };
    if (!entry.videos.includes(row.url)) {
      entry.videos.push(row.url);
      if (!entry.videoPosters) entry.videoPosters = [];
      entry.videoPosters.push(row.poster_url || null);
    }
    map.set(row.match_id, entry);
  }

  for (const row of (photosRes?.data || [])) {
    const entry = map.get(row.match_id) || { videos: [], photos: [], videoPosters: [] };
    if (!entry.photos.includes(row.url)) {
      entry.photos.push(row.url);
    }
    map.set(row.match_id, entry);
  }

  return map;
}

export async function fetchMatchMedia(
  matches: MatchMediaInput[],
  customClient?: any
): Promise<Map<number, MatchMedia>> {
  return fetchMatchMediaBatch(matches, customClient);
}

/** Attach calculated video_count, photo_count, videos, photos to matches. */
export function attachMatchMediaCounts(
  matches: MatchRecord[],
  mediaMap: Map<number, MatchMedia>
): MatchRecord[] {
  return matches.map((m) => {
    const media = mediaMap.get(m.id);
    const videos = media?.videos && media.videos.length > 0
      ? media.videos
      : m.video_url && m.video_url.trim() !== ''
      ? [m.video_url.trim()]
      : [];
    const photos = media?.photos || [];
    const videoPosters = media?.videoPosters || (videos.length > 0 ? videos.map(() => null) : []);
    return {
      ...m,
      video_count: videos.length,
      photo_count: photos.length,
      videos,
      photos,
      video_posters: videoPosters,
    };
  });
}

export function videosFor(
  media: Map<number, MatchMedia> | undefined,
  matchId: number,
  fallbackMatch?: MatchRecord
): string[] {
  const entry = media?.get(matchId);
  if (entry && entry.videos.length > 0) return entry.videos;
  if (fallbackMatch?.videos && fallbackMatch.videos.length > 0) return fallbackMatch.videos;
  if (fallbackMatch?.video_url && fallbackMatch.video_url.trim() !== '') return [fallbackMatch.video_url.trim()];
  return [];
}

export function photosFor(
  media: Map<number, MatchMedia> | undefined,
  matchId: number,
  fallbackMatch?: MatchRecord
): string[] {
  const entry = media?.get(matchId);
  if (entry && entry.photos.length > 0) return entry.photos;
  if (fallbackMatch?.photos && fallbackMatch.photos.length > 0) return fallbackMatch.photos;
  return [];
}

/** Poster frames index-aligned with videosFor() — empty when unavailable. */
export function postersFor(
  media: Map<number, MatchMedia> | undefined,
  matchId: number,
  fallbackMatch?: MatchRecord
): (string | null)[] {
  const entry = media?.get(matchId);
  if (entry && entry.videoPosters && entry.videoPosters.length > 0) return entry.videoPosters;
  if (fallbackMatch?.video_posters && fallbackMatch.video_posters.length > 0) return fallbackMatch.video_posters;
  return [];
}

export async function insertMatchVideo(
  matchId: number,
  url: string,
  sortOrder: number,
  posterUrl?: string | null
): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const row = { match_id: matchId, user_id: user.id, url, sort_order: sortOrder };
  let { error } = await supabase.from('match_videos').insert([{ ...row, poster_url: posterUrl || null }]);
  if (error && /poster_url/.test(error.message)) {
    // Migration not applied yet — store the video without the poster column.
    ({ error } = await supabase.from('match_videos').insert([row]));
  }
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

export async function uploadMatchPhotoFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url?: string; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  // Uploaded through the API route so type/size are validated server-side
  // against the file's actual bytes, and the object lands in the private
  // match-photos bucket. XHR gives us per-file progress for the form.
  const form = new FormData();
  form.append('file', file);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/match/photo');
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      let body: { url?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch { /* non-JSON response */ }
      if (xhr.status >= 200 && xhr.status < 300 && body.url) {
        onProgress?.(100);
        resolve({ url: body.url });
      } else {
        resolve({ error: body.error || `Upload failed (${xhr.status})` });
      }
    };
    xhr.onerror = () => resolve({ error: 'Network error during photo upload.' });
    xhr.onabort = () => resolve({ error: 'Photo upload was cancelled.' });
    xhr.send(form);
  });
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

