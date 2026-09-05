import { supabase } from '@/lib/registry';
import { STRAIN_LIST, LEG_COLOR_LIST } from '@/lib/helpers';

const CUSTOM_STRAINS_KEY = 'gallotrack_custom_strains';
const CUSTOM_LEG_COLORS_KEY = 'gallotrack_custom_leg_colors';

function getLocalItems(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function saveLocalItem(key: string, name: string): void {
  const existing = getLocalItems(key);
  if (!existing.some((s) => s.toLowerCase() === name.toLowerCase())) {
    localStorage.setItem(key, JSON.stringify([...existing, name]));
  }
}

function removeLocalItem(key: string, name: string): void {
  const updated = getLocalItems(key).filter((s) => s !== name);
  localStorage.setItem(key, JSON.stringify(updated));
}

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
      await supabase.from('strains').insert(missing.map((name) => ({ name, is_custom: false })));
      names = [...names, ...missing];
    } catch { /* non-critical */ }
  }

  const localCustom = getLocalItems(CUSTOM_STRAINS_KEY);
  return Array.from(new Set([...names, ...localCustom])).sort((a, b) => a.localeCompare(b));
}

export async function saveCustomStrain(name: string): Promise<boolean> {
  const cleaned = name.trim();
  if (!cleaned) return false;

  saveLocalItem(CUSTOM_STRAINS_KEY, cleaned);

  try {
    await supabase
      .from('strains')
      .insert({ name: cleaned, is_custom: true });
  } catch { /* best-effort, already saved locally */ }
  return true;
}

export async function deleteStrain(name: string): Promise<{ error?: string }> {
  removeLocalItem(CUSTOM_STRAINS_KEY, name);

  try {
    const { error } = await supabase
      .from('strains')
      .update({ deleted_at: new Date().toISOString() })
      .eq('name', name)
      .is('deleted_at', null);
    if (error) return { error: error.message };
    return {};
  } catch {
    return {};
  }
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
      await supabase.from('leg_colors').insert(missing.map((name) => ({ name, is_custom: false })));
      names = [...names, ...missing];
    } catch { /* non-critical */ }
  }

  const localCustom = getLocalItems(CUSTOM_LEG_COLORS_KEY);
  return Array.from(new Set([...names, ...localCustom])).sort((a, b) => a.localeCompare(b));
}

export async function saveCustomLegColor(name: string): Promise<boolean> {
  const cleaned = name.trim();
  if (!cleaned) return false;

  saveLocalItem(CUSTOM_LEG_COLORS_KEY, cleaned);

  try {
    await supabase
      .from('leg_colors')
      .insert({ name: cleaned, is_custom: true });
  } catch { /* best-effort, already saved locally */ }
  return true;
}

export async function deleteLegColor(name: string): Promise<{ error?: string }> {
  removeLocalItem(CUSTOM_LEG_COLORS_KEY, name);

  try {
    const { error } = await supabase
      .from('leg_colors')
      .update({ deleted_at: new Date().toISOString() })
      .eq('name', name)
      .is('deleted_at', null);
    if (error) return { error: error.message };
    return {};
  } catch {
    return {};
  }
}
