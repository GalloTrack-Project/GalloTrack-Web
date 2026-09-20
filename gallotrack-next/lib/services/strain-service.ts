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

  try {
    const { data, error } = await supabase
      .from('strains')
      .select('name')
      .order('name', { ascending: true });
    if (!error && data) {
      names = data.map((row: { name: string }) => row.name);
    }
  } catch (err) {
    console.error('Failed to fetch strains:', err);
  }

  if (names.length === 0) {
    names = [...STRAIN_LIST];
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
      .delete()
      .eq('name', name);
    if (error) return { error: error.message };
    return {};
  } catch {
    return {};
  }
}

export async function fetchLegColors(): Promise<string[]> {
  let names: string[] = [];

  try {
    const { data, error } = await supabase
      .from('leg_colors')
      .select('name')
      .order('name', { ascending: true });
    if (!error && data) {
      names = data.map((row: { name: string }) => row.name);
    }
  } catch (err) {
    console.error('Failed to fetch leg colors:', err);
  }

  if (names.length === 0) {
    names = [...LEG_COLOR_LIST];
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
      .delete()
      .eq('name', name);
    if (error) return { error: error.message };
    return {};
  } catch {
    return {};
  }
}
