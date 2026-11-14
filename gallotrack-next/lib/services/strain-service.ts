import { supabase } from '@/lib/registry';
import { LEG_COLOR_LIST } from '@/lib/helpers';
import { findStrainName, mergeStrainNames } from '@/lib/strain-options';

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

export type CreateRegisteredBreedResult = {
  ok: boolean;
  name?: string;
  existing?: boolean;
  error?: string;
};

export async function fetchStrains(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('strains')
      .select('name')
      .is('deleted_at', null)
      .order('name', { ascending: true });
    if (error) {
      console.error('Failed to fetch strains:', error.message);
      return [];
    }
    return mergeStrainNames(
      (data ?? []).map((row: { name: string }) => row.name),
    );
  } catch (err) {
    console.error('Failed to fetch strains:', err);
    return [];
  }
}

export async function createRegisteredBreed(
  name: string,
): Promise<CreateRegisteredBreedResult> {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) return { ok: false, error: 'Enter a breed name.' };

  const existingNames = await fetchStrains();
  const existing = findStrainName(existingNames, cleaned);
  if (existing) return { ok: true, name: existing, existing: true };

  try {
    const { error } = await supabase
      .from('strains')
      .insert({ name: cleaned });
    if (error) {
      // A concurrent create can win the case-insensitive unique index.
      const after = await fetchStrains();
      const raced = findStrainName(after, cleaned);
      if (raced) return { ok: true, name: raced, existing: true };
      return { ok: false, error: error.message };
    }
    return { ok: true, name: cleaned };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function saveCustomStrain(name: string): Promise<boolean> {
  const result = await createRegisteredBreed(name);
  return result.ok;
}

export async function deleteStrain(name: string): Promise<{ error?: string }> {
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
