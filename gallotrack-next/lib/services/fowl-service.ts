import { supabase } from '@/lib/registry';
import type { FowlRecord } from '@/lib/types';

export async function fetchFowls(): Promise<FowlRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('fowl')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false });

  if (error) {
    console.error('Failed to fetch fowls:', error);
    return [];
  }
  return data || [];
}

export async function insertFowl(payload: Record<string, unknown>): Promise<{ error?: string }> {
  const { error } = await supabase.from('fowl').insert([payload]);
  if (error) return { error: error.message };
  return {};
}

export async function updateFowl(id: number, payload: Record<string, unknown>): Promise<{ error?: string }> {
  const { error } = await supabase.from('fowl').update(payload).eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteFowl(id: number): Promise<{ error?: string }> {
  const { error } = await supabase.from('fowl').delete().eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function archiveFowl(id: number, reason?: string): Promise<{ error?: string }> {
  const payload: Record<string, unknown> = { status: 'Archived' };
  if (reason) payload.archive_reason = reason;
  const { error } = await supabase.from('fowl').update(payload).eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function restoreFowl(id: number): Promise<{ error?: string }> {
  const { error } = await supabase.from('fowl').update({ status: 'Active' }).eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function markFowlDeceased(id: number, reason: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('fowl')
    .update({
      status: 'Deceased',
      death_reason: reason,
      death_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function uploadFowlImage(file: File): Promise<{ url?: string; error?: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `fowl/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('fowl-images')
    .upload(filePath, file);

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from('fowl-images').getPublicUrl(filePath);
  return { url: data.publicUrl };
}
