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
  const fileExt = file.name.split('.').pop();
  const fileName = `match-videos/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('match-videos')
    .upload(fileName, file);

  if (uploadError) return { error: uploadError.message };

  const { data } = await supabase.storage.from('match-videos').getPublicUrl(fileName);
  return { url: data.publicUrl };
}
