import { supabase } from '@/lib/registry';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type MilestoneNotificationPreferences,
  type NotificationStateMap,
  type NotificationStateValue,
} from './types';
import { normalizeNotificationPreferences } from './milestones';

const PREFERENCES_TABLE = 'notification_preferences';
const STATE_TABLE = 'notification_state';
const LEGACY_SETTING_KEYS = [
  'notify_stage_changed',
  'notify_fully_mature',
  'notify_stage_upcoming',
  'notification_lead_days',
] as const;

export type NotificationStoreMode = 'database' | 'local';

export type NotificationStoreSnapshot = {
  preferences: MilestoneNotificationPreferences;
  state: NotificationStateMap;
  mode: NotificationStoreMode;
};

type DbError = { code?: string; message?: string } | null;

type LegacySettingRow = { key: string; value: unknown };

function isMissingTable(error: DbError): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /could not find the table|relation .* does not exist/i.test(error.message || '')
  );
}

function logFallback(error: DbError): void {
  const message = error?.message || 'Notification persistence tables are unavailable.';
  console.error(`[notifications] ${message} Using localStorage fallback.`);
}

export function notificationPreferencesStorageKey(userId: string): string {
  return `gt_notification_preferences_${userId}`;
}

export function notificationStateStorageKey(userId: string): string {
  return `gt_notification_state_${userId}`;
}

function readLocalPreferences(userId: string): MilestoneNotificationPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(notificationPreferencesStorageKey(userId));
    if (!raw) return null;
    return normalizeNotificationPreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocalPreferences(
  userId: string,
  preferences: MilestoneNotificationPreferences,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      notificationPreferencesStorageKey(userId),
      JSON.stringify(preferences),
    );
  } catch {
    /* localStorage can be unavailable in private browsing */
  }
}

function readLocalState(userId: string): NotificationStateMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(notificationStateStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: NotificationStateMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, NotificationStateValue>)) {
      if (value && typeof value === 'object') {
        out[key] = {
          read_at: typeof value.read_at === 'string' ? value.read_at : null,
          dismissed_at: typeof value.dismissed_at === 'string' ? value.dismissed_at : null,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeLocalState(userId: string, state: NotificationStateMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(notificationStateStorageKey(userId), JSON.stringify(state));
  } catch {
    /* localStorage can be unavailable in private browsing */
  }
}

async function readLegacyPreferences(): Promise<MilestoneNotificationPreferences> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return DEFAULT_NOTIFICATION_PREFERENCES;
    const { data, error } = await supabase
      .from('user_settings')
      .select('key,value')
      .eq('user_id', user.id)
      .in('key', [...LEGACY_SETTING_KEYS]);
    if (error) {
      console.error('[notifications] Could not read legacy notification preferences.', error.message);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    const rows = (data as LegacySettingRow[] | null) ?? [];
    if (rows.length === 0) return DEFAULT_NOTIFICATION_PREFERENCES;
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const stageChanged = byKey.get('notify_stage_changed') !== false;
    const fullyMature = byKey.get('notify_fully_mature') !== false;
    const upcoming = byKey.get('notify_stage_upcoming') !== false;
    const legacyLead = Number(byKey.get('notification_lead_days'));
    return normalizeNotificationPreferences({
      enabled: stageChanged || fullyMature || upcoming,
      stages: {
        stag: stageChanged,
        'bull-stag': stageChanged,
        cock: fullyMature,
      },
      leadDays: Number.isFinite(legacyLead) ? [legacyLead, 0] : [7, 0],
      audience: 'both',
    });
  } catch (error) {
    console.error(
      '[notifications] Could not read legacy notification preferences.',
      error instanceof Error ? error.message : String(error),
    );
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function loadNotificationStore(
  userId: string,
): Promise<NotificationStoreSnapshot> {
  const preferencesResult = await supabase
    .from(PREFERENCES_TABLE)
    .select('settings')
    .eq('user_id', userId)
    .maybeSingle();

  let preferences: MilestoneNotificationPreferences | null = null;
  let mode: NotificationStoreMode = 'database';

  if (preferencesResult.error) {
    mode = 'local';
    if (isMissingTable(preferencesResult.error)) logFallback(preferencesResult.error);
    else {
      console.error(
        `[notifications] Could not load notification preferences: ${preferencesResult.error.message}`,
      );
    }
  } else if (preferencesResult.data?.settings) {
    preferences = normalizeNotificationPreferences(
      preferencesResult.data.settings as Partial<MilestoneNotificationPreferences>,
    );
  }

  const stateResult = await supabase
    .from(STATE_TABLE)
    .select('key,read_at,dismissed_at')
    .eq('user_id', userId);

  let state: NotificationStateMap = {};
  if (stateResult.error) {
    mode = 'local';
    if (isMissingTable(stateResult.error)) logFallback(stateResult.error);
    else {
      console.error(
        `[notifications] Could not load notification state: ${stateResult.error.message}`,
      );
    }
  }

  if (mode === 'database') {
    for (const row of (stateResult.data as Array<{
      key: string;
      read_at: string | null;
      dismissed_at: string | null;
    }> | null) ?? []) {
      state[row.key] = {
        read_at: row.read_at,
        dismissed_at: row.dismissed_at,
      };
    }
  } else {
    state = readLocalState(userId);
    if (!preferences) preferences = readLocalPreferences(userId);
  }

  if (!preferences) {
    preferences = await readLegacyPreferences();
  }

  return {
    preferences: normalizeNotificationPreferences(preferences),
    state,
    mode,
  };
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: MilestoneNotificationPreferences,
  mode: NotificationStoreMode,
): Promise<NotificationStoreMode> {
  const normalized = normalizeNotificationPreferences(preferences);
  if (mode === 'local') {
    writeLocalPreferences(userId, normalized);
    return 'local';
  }
  const { error } = await supabase.from(PREFERENCES_TABLE).upsert(
    {
      user_id: userId,
      settings: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    logFallback(error);
    writeLocalPreferences(userId, normalized);
    return 'local';
  }
  return 'database';
}

export async function saveNotificationState(
  userId: string,
  entries: Array<NotificationStateValue & { key: string }>,
  mode: NotificationStoreMode,
): Promise<NotificationStoreMode> {
  if (entries.length === 0) return mode;
  if (mode === 'local') {
    const state = readLocalState(userId);
    for (const entry of entries) {
      state[entry.key] = {
        read_at: entry.read_at,
        dismissed_at: entry.dismissed_at,
      };
    }
    writeLocalState(userId, state);
    return 'local';
  }
  const { error } = await supabase.from(STATE_TABLE).upsert(
    entries.map((entry) => ({
      user_id: userId,
      key: entry.key,
      read_at: entry.read_at,
      dismissed_at: entry.dismissed_at,
    })),
    { onConflict: 'user_id,key' },
  );
  if (error) {
    logFallback(error);
    const state = readLocalState(userId);
    for (const entry of entries) {
      state[entry.key] = {
        read_at: entry.read_at,
        dismissed_at: entry.dismissed_at,
      };
    }
    writeLocalState(userId, state);
    return 'local';
  }
  return 'database';
}
