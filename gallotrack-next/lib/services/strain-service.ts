import { supabase } from '@/lib/registry';
import { STRAIN_LIST, LEG_COLOR_LIST } from '@/lib/helpers';

export async function fetchStrains(): Promise<string[]> {
  let names: string[] = [];
  let allNames: string[] = [];

  try {
    const { data, error } = await supabase
      .from('strains')
      .select('name')
      .is('deleted_at', null)
      .order('name', { ascending: true });
    if (!error && data) {
      names = data.map((row: { name: string }) => row.name);
    }
    const { data: allData } = await supabase.from('strains').select('name');
    if (allData) allNames = allData.map((r: { name: string }) => r.name);
  } catch (err) {
    console.error('Failed to fetch strains:', err);
  }

  const missing = STRAIN_LIST.filter((d) => !allNames.some((n) => n.toLowerCase() === d.toLowerCase()));
  if (missing.length > 0) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('strains').insert(missing.map((name) => ({ name, is_custom: false, created_by: user?.id || null })));
      names = [...names, ...missing];
    } catch { /* non-critical */ }
  }

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

export async function saveCustomStrain(name: string, existing: string[]): Promise<boolean> {
  const cleaned = name.trim();
  if (!cleaned) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('strains')
      .insert({ name: cleaned, is_custom: true, created_by: user?.id || null })
      .select();
    if (error) {
      if ((error.message || '').toLowerCase().includes('duplicate') || error.code === '23505') {
        return true;
      }
      console.error('Failed to save strain:', error.message, error.code);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save strain:', err);
    return false;
  }
}

export async function deleteStrain(name: string): Promise<{ error?: string }> {
  const cleaned = name.trim();
  if (!cleaned) return { error: 'Empty name' };
  const { error } = await supabase
    .from('strains')
    .update({ deleted_at: new Date().toISOString() })
    .eq('name', cleaned)
    .is('deleted_at', null);
  if (error) return { error: error.message };
  return {};
}

export async function fetchLegColors(): Promise<string[]> {
  let names: string[] = [];
  let allNames: string[] = [];

  try {
    const { data, error } = await supabase
      .from('leg_colors')
      .select('name')
      .is('deleted_at', null)
      .order('name', { ascending: true });
    if (!error && data) {
      names = data.map((row: { name: string }) => row.name);
    }
    const { data: allData } = await supabase.from('leg_colors').select('name');
    if (allData) allNames = allData.map((r: { name: string }) => r.name);
  } catch (err) {
    console.error('Failed to fetch leg colors:', err);
  }

  const missing = LEG_COLOR_LIST.filter((d) => !allNames.some((n) => n.toLowerCase() === d.toLowerCase()));
  if (missing.length > 0) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('leg_colors').insert(missing.map((name) => ({ name, is_custom: false, created_by: user?.id || null })));
      names = [...names, ...missing];
    } catch { /* non-critical */ }
  }

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

export async function deleteLegColor(name: string): Promise<{ error?: string }> {
  const cleaned = name.trim();
  if (!cleaned) return { error: 'Empty name' };
  const { error } = await supabase
    .from('leg_colors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('name', cleaned)
    .is('deleted_at', null);
  if (error) return { error: error.message };
  return {};
}
