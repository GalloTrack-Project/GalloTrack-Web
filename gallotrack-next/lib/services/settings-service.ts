import { supabase } from '@/lib/registry';
import { mergeSettings, type SettingsKey, type UserSettings } from '@/lib/settings';

/** Read the farm's settings merged over the code defaults. */
export async function fetchUserSettings(): Promise<UserSettings> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return mergeSettings(undefined);
  const { data, error } = await supabase
    .from('user_settings')
    .select('key, value')
    .eq('user_id', user.id);
  if (error) {
    console.error('Failed to fetch settings:', error.message);
    return mergeSettings(undefined);
  }
  return mergeSettings(data || []);
}

/** Override one setting for the current farm. */
export async function setUserSetting(
  key: SettingsKey,
  value: UserSettings[SettingsKey],
): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: user.id, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' },
    );
  if (error) return { error: error.message };
  return {};
}
