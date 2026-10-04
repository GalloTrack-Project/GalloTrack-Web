import { supabase } from '@/lib/registry';
import type { RegistryOption } from '@/lib/types';

/**
 * User-editable option lists (registry_options). Global templates
 * (user_id IS NULL) are read-only for farms; own rows can be added, edited
 * and deactivated. Once an option is used by history it must be deactivated
 * (is_active = false), never deleted, so old records still render.
 */

/** All option rows the current farm can see (templates + own), keyed merge done in lib/lifecycle. */
export async function fetchRegistryOptions(): Promise<RegistryOption[]> {
  const { data, error } = await supabase
    .from('registry_options')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('Failed to fetch registry options:', error.message);
    return [];
  }
  return data || [];
}

/** Add a farm-owned entry to a list ("Add Other"). */
export async function addRegistryOption(
  listKey: string,
  value: string,
  label?: string,
): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  const clean = value.trim();
  if (!clean) return { error: 'Type an option first.' };
  const { error } = await supabase.from('registry_options').insert([
    {
      user_id: user.id,
      list_key: listKey,
      value: clean,
      label: (label || clean).trim(),
      sort_order: 100,
    },
  ]);
  if (error) {
    if (error.code === '23505') return { error: 'That option already exists.' };
    return { error: error.message };
  }
  return {};
}

/** Deactivate (or reactivate) a farm-owned option without breaking history. */
export async function setRegistryOptionActive(
  id: number,
  active: boolean,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('registry_options')
    .update({ is_active: active })
    .eq('id', id);
  if (error) return { error: error.message };
  return {};
}
