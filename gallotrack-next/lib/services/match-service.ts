import { supabase } from '@/lib/registry';
import type { MatchRecord } from '@/lib/types';

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
  return data || [];
}

export async function insertMatch(payload: Record<string, unknown>): Promise<{ error?: string; id?: number }> {
  const { data, error } = await supabase.from('match').insert([payload]).select('id').single();
  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateMatch(id: number, payload: Record<string, unknown>): Promise<{ error?: string }> {
  const { error } = await supabase.from('match').update(payload).eq('id', id);
  if (error) return { error: error.message };
  return {};
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
