import { supabase } from '@/lib/registry';
import type { MatchRecord } from '@/lib/types';
import { fetchMatchMediaBatch, attachMatchMediaCounts } from '@/lib/services/media-service';

export async function fetchMatches(): Promise<MatchRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('match')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false });

  if (error) {
    console.error('Failed to fetch matches:', error);
    return [];
  }
  const rawMatches = data || [];
  if (rawMatches.length === 0) return [];
  const mediaMap = await fetchMatchMediaBatch(rawMatches);
  return attachMatchMediaCounts(rawMatches, mediaMap);
}

export async function fetchMatchById(id: number): Promise<MatchRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('match')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Failed to fetch match:', error);
    return null;
  }

  const mediaMap = await fetchMatchMediaBatch([data]);
  const attached = attachMatchMediaCounts([data], mediaMap);
  return attached[0] || null;
}

export async function insertMatch(payload: Record<string, unknown>): Promise<{ error?: string; id?: number }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { error: json.error || `Failed to create match (${res.status})` };
      }
      if (json.data?.id) {
        return { id: json.data.id };
      }
    }
  } catch (err: unknown) {
    console.warn('POST /api/match request failed, falling back to client Supabase:', err);
  }

  // Fallback for tests / offline mock clients
  const { data, error } = await supabase.from('match').insert([payload]).select('id').single();
  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateMatch(
  id: number,
  payload: Record<string, unknown>
): Promise<{ error?: string; updatedId?: number }> {
  const { data, error } = await supabase
    .from('match')
    .update(payload)
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };

  const updatedRows = data ?? [];

  if (updatedRows.length !== 1) {
    // Zero rows updated with no error = RLS blocked or row missing.
    // Run a diagnostic read (SELECT only) to tell the user which case applies.
    // More than one row is impossible for a primary-key filter and means the
    // contract was broken - report it as a failure, never as a success.
    console.warn(
      `[match-service] updateMatch: ${updatedRows.length} rows updated for match id=${id}. Running diagnostic read.`,
    );
    const { data: diagData } = await supabase
      .from('match')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (updatedRows.length > 1) {
      return { error: 'This match could not be updated with your account. Please reload and try again.' };
    }

    if (diagData) {
      // Row is visible but update was blocked - RLS / permission issue
      return {
        error:
          'This match could not be updated with your account. It may be owned by a different user.',
      };
    }
    // Row is not visible at all
    return { error: 'This match was not found. It may have been deleted.' };
  }

  return { updatedId: updatedRows[0].id };
}

export async function uploadMatchVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url?: string; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  const form = new FormData();
  form.append('file', file);

  // XHR instead of fetch: the record form shows a per-file progress bar and
  // fetch cannot report upload progress.
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/match/upload');
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
    xhr.onerror = () => resolve({ error: 'Network error during video upload.' });
    xhr.onabort = () => resolve({ error: 'Video upload was cancelled.' });
    xhr.send(form);
  });
}
