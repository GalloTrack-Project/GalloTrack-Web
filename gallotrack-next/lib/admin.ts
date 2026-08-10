import { supabase } from '@/lib/registry';

export interface AdminSettings {
  system_name?: string;
  system_status?: string;
  maintenance_message?: string;
  default_strain?: string;
  cloud_logs?: boolean;
  event_alerts?: boolean;
}

export interface AdminProfileRow {
  id: string;
  user_id?: string | null;
  email?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  farm_name?: string | null;
  phone_number?: string | null;
  contact_number?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  is_admin?: boolean | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export function isAdminProfile(profile: Pick<AdminProfileRow, 'is_admin' | 'role'> | null | undefined): boolean {
  return !!profile && (profile.is_admin === true || profile.role === 'admin');
}

export function profileDisplayName(p: AdminProfileRow): string {
  if (p.full_name && p.full_name.trim()) return p.full_name;
  const parts = [p.first_name, p.middle_name, p.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ').trim();
  if (p.email) return p.email.split('@')[0];
  return 'Unnamed User';
}

/**
 * Resolves the current user's profile and verifies admin privileges.
 * Redirects to `/` when the caller is signed out or not an admin.
 */
export async function adminGuard(): Promise<AdminProfileRow | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    if (typeof window !== 'undefined') window.location.replace('/');
    return null;
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();
  if (!isAdminProfile(profile)) {
    if (typeof window !== 'undefined') window.location.replace('/');
    return null;
  }
  return profile as AdminProfileRow;
}

export async function fetchAllProfiles(): Promise<AdminProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as AdminProfileRow[];
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function setUserRole(userId: string, role: 'owner' | 'admin'): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role, is_admin: role === 'admin', updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

/**
 * Hard-removes every data row owned by the user. The auth.users row itself
 * cannot be dropped from the client (requires the service role key) - the
 * profile is removed so the account no longer appears in the registry, and
 * is_active is left safe via the profile delete alone.
 */
export async function deleteUserRecords(userId: string): Promise<void> {
  await supabase.from('fowl').delete().eq('user_id', userId);
  await supabase.from('match').delete().eq('user_id', userId);
  await supabase.from('farms').delete().eq('owner_id', userId);
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function fetchSystemSettings(): Promise<AdminSettings> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'app')
    .maybeSingle();
  if (error) throw new Error(error.message);
  const raw = (data?.value || {}) as AdminSettings;
  return {
    system_name: raw.system_name || 'GalloTrack',
    system_status: raw.system_status || 'Operational',
    maintenance_message: raw.maintenance_message || '',
    default_strain: raw.default_strain || 'Sweater',
    cloud_logs: raw.cloud_logs !== false,
    event_alerts: raw.event_alerts !== false,
  };
}

export async function updateSystemSettings(settings: AdminSettings): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('system_settings')
    .upsert(
      {
        key: 'app',
        value: settings as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      },
      { onConflict: 'key' }
    );
  if (error) throw new Error(error.message);
}