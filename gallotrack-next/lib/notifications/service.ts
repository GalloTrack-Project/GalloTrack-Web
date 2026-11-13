import { supabase } from '@/lib/registry';
import type {
  MilestoneNotification,
  NotificationFowl,
  NotificationWithFowl,
} from './types';

const NOTIFICATION_COLUMNS =
  'id,user_id,type,fowl_id,stage,title,body,due_date,read_at,created_at';

async function currentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function fetchNotifications(limit = 25): Promise<{
  data: NotificationWithFowl[];
  error?: string;
}> {
  const user = await currentUser();
  if (!user) return { data: [], error: 'Not signed in.' };

  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { data: [], error: error.message };

  const rows = (data as MilestoneNotification[] | null) ?? [];
  const fowlIds = [...new Set(rows.map((row) => row.fowl_id))];
  const fowlById = new Map<number, NotificationFowl>();
  if (fowlIds.length > 0) {
    const { data: fowlData } = await supabase
      .from('fowl')
      .select('id,name,bird_code')
      .in('id', fowlIds);
    for (const fowl of (fowlData as NotificationFowl[] | null) ?? []) {
      fowlById.set(fowl.id, fowl);
    }
  }

  return {
    data: rows.map((row) => ({ ...row, fowl: fowlById.get(row.fowl_id) ?? null })),
  };
}

export async function fetchUnreadNotificationCount(): Promise<{
  count: number;
  error?: string;
}> {
  const user = await currentUser();
  if (!user) return { count: 0, error: 'Not signed in.' };

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0 };
}

export async function markNotificationRead(id: number): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  return error ? { error: error.message } : {};
}

export async function markAllNotificationsRead(): Promise<{
  count: number;
  error?: string;
}> {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
    .select('id');
  if (error) return { count: 0, error: error.message };
  return { count: (data as { id: number }[] | null)?.length ?? 0 };
}
