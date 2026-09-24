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

export async function insertMatch(payload: Record<string, unknown>): Promise<{ error?: string }> {
  const { error } = await supabase.from('match').insert([payload]);
  if (error) return { error: error.message };
  return {};
}

export async function uploadMatchVideo(file: File): Promise<{ url?: string; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  const form = new FormData();
  form.append('file', file);

  try {
    const res = await fetch('/api/match/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error || `Upload failed (${res.status})` };
    return { url: body.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed' };
  }
}
