import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export const supabaseUrl = 'https://mjvsbzayumcxmjcokwki.supabase.co';
export const supabaseAnonKey = 'sb_publishable_MpufdSUihyXde5KmWAun_w_j0GSCTa3';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface OwnerMetadata {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  farm_name?: string;
  contact_number?: string;
  full_name?: string;
  avatar_url?: string;
}

export function fullNameFromMetadata(meta: OwnerMetadata): string {
  const parts = [meta.first_name, meta.middle_name, meta.last_name].filter(Boolean);
  return parts.length ? parts.join(' ').trim() : (meta.full_name || '');
}

/**
 * Ensures the user's `profiles` row (owner identity) and `farms` row
 * (owner business entity) exist after registration/confirmation.
 *
 * - Profile row is only INSERTED when missing, so existing profile edits are
 *   never overwritten by a subsequent login.
 * - Farm row is UPSERTED by owner_id (the migration makes owner_id unique).
 * - All failures are swallowed so downstream flows (login, confirmation)
 *   never break if the Farm Owner Registration migration has not been applied.
 */
export async function ensureOwnerRecords(supabaseClient: SupabaseClient, user: User | null | undefined) {
  if (!user) return;

  const meta = (user.user_metadata || {}) as OwnerMetadata;
  const fullName = fullNameFromMetadata(meta) || user.email?.split('@')[0] || 'Farm Owner';
  const contactNumber = meta.contact_number || '';
  const farmName = meta.farm_name || '';

  try {
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabaseClient.from('profiles').insert({
        id: user.id,
        user_id: user.id,
        first_name: meta.first_name || '',
        middle_name: meta.middle_name || '',
        last_name: meta.last_name || '',
        full_name: fullName,
        farm_name: farmName,
        phone_number: contactNumber,
        avatar_url: meta.avatar_url || '',
        role: 'owner',
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[registry] profile sync failed', err);
  }

  try {
    if (farmName) {
      await supabaseClient.from('farms').upsert(
        {
          owner_id: user.id,
          farm_name: farmName,
          contact_number: contactNumber,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id' }
      );
    }
  } catch (err) {
    console.error('[registry] farm sync failed', err);
  }
}