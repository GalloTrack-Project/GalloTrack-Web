import type { SupabaseClient } from '@supabase/supabase-js';
import { mergeSettings, type SettingsRow } from '@/lib/settings';
import {
  isMilestoneEligible,
  normalizeLeadDays,
  notificationPlansForFowl,
  validUpcomingStage,
} from './milestones';
import type {
  MilestoneFowl,
  NotificationPreferenceInput,
} from './types';

export const LAST_NOTIFICATION_RUN_KEY = 'milestone_notifications_last_run_at';

const NOTIFICATION_SETTING_KEYS = [
  'notify_stage_changed',
  'notify_fully_mature',
  'notify_stage_upcoming',
  'notification_lead_days',
] as const;

type FowlRow = MilestoneFowl & {
  user_id?: string | null;
};

type UserSettingRow = {
  user_id: string;
  key: string;
  value: unknown;
};

export type NotificationJobResult = {
  users: number;
  eligibleFowls: number;
  created: number;
  removed: number;
  errors: string[];
};

function preferencesFromRows(rows: UserSettingRow[]): NotificationPreferenceInput {
  const merged = mergeSettings(rows as SettingsRow[]);
  return {
    stageChanged: merged.notify_stage_changed !== false,
    fullyMature: merged.notify_fully_mature !== false,
    upcoming: merged.notify_stage_upcoming !== false,
    leadDays: normalizeLeadDays(merged.notification_lead_days),
  };
}

function lastRunFromRows(rows: UserSettingRow[]): string | null {
  const value = rows.find((row) => row.key === LAST_NOTIFICATION_RUN_KEY)?.value;
  return typeof value === 'string' ? value : null;
}

async function deleteStaleUpcoming(
  admin: SupabaseClient,
  userId: string,
  fowlId: number,
  validStage: string | null,
): Promise<number> {
  let query = admin
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('fowl_id', fowlId)
    .eq('type', 'stage_upcoming')
    .is('read_at', null);
  if (validStage) query = query.neq('stage', validStage);
  const { data, error } = await query.select('id');
  if (error) throw new Error(error.message);
  return (data as { id: number }[] | null)?.length ?? 0;
}

async function insertPlans(
  admin: SupabaseClient,
  userId: string,
  fowlId: number,
  plans: ReturnType<typeof notificationPlansForFowl>,
): Promise<number> {
  if (plans.length === 0) return 0;
  const payload = plans.map((plan) => ({
    user_id: userId,
    fowl_id: fowlId,
    ...plan,
  }));
  const { data, error } = await admin
    .from('notifications')
    .upsert(payload, {
      onConflict: 'user_id,fowl_id,type,stage',
      ignoreDuplicates: true,
    })
    .select('id');
  if (error) throw new Error(error.message);
  return (data as { id: number }[] | null)?.length ?? 0;
}

async function saveLastRun(admin: SupabaseClient, userId: string, now: Date): Promise<void> {
  const { error } = await admin.from('user_settings').upsert(
    {
      user_id: userId,
      key: LAST_NOTIFICATION_RUN_KEY,
      value: now.toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: 'user_id,key' },
  );
  if (error) throw new Error(error.message);
}

/**
 * Daily idempotent job. Notifications are inserted through the service role;
 * owners only read/update their own rows through RLS.
 */
export async function runMilestoneNotificationJob(
  admin: SupabaseClient,
  now = new Date(),
): Promise<NotificationJobResult> {
  const result: NotificationJobResult = {
    users: 0,
    eligibleFowls: 0,
    created: 0,
    removed: 0,
    errors: [],
  };

  const { data: fowlData, error: fowlError } = await admin
    .from('fowl')
    .select('id,user_id,name,bird_code,gender,birthdate,status');
  if (fowlError) throw new Error(fowlError.message);

  const fowls = (fowlData as FowlRow[] | null) ?? [];
  const userIds = [...new Set(fowls.map((fowl) => fowl.user_id).filter(Boolean))] as string[];
  result.users = userIds.length;
  if (userIds.length === 0) return result;

  const { data: settingData, error: settingError } = await admin
    .from('user_settings')
    .select('user_id,key,value')
    .in('user_id', userIds)
    .in('key', [...NOTIFICATION_SETTING_KEYS, LAST_NOTIFICATION_RUN_KEY]);
  if (settingError) throw new Error(settingError.message);

  const settingsByUser = new Map<string, UserSettingRow[]>();
  for (const row of (settingData as UserSettingRow[] | null) ?? []) {
    const rows = settingsByUser.get(row.user_id) ?? [];
    rows.push(row);
    settingsByUser.set(row.user_id, rows);
  }

  for (const userId of userIds) {
    const userRows = settingsByUser.get(userId) ?? [];
    const prefs = preferencesFromRows(userRows);
    const lastRunAt = lastRunFromRows(userRows);
    const userFowls = fowls.filter((fowl) => fowl.user_id === userId);
    let userHadError = false;

    for (const fowl of userFowls) {
      const eligible = isMilestoneEligible(fowl);
      if (eligible) result.eligibleFowls += 1;

      try {
        if (!eligible) {
          result.removed += await deleteStaleUpcoming(admin, userId, fowl.id, null);
          continue;
        }

        const validStage = validUpcomingStage(fowl, now, prefs);
        result.removed += await deleteStaleUpcoming(admin, userId, fowl.id, validStage);

        const plans = notificationPlansForFowl({
          fowl,
          now,
          lastRunAt,
          settings: prefs,
        });
        result.created += await insertPlans(admin, userId, fowl.id, plans);
      } catch (error) {
        userHadError = true;
        result.errors.push(
          `${userId}/${fowl.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (!userHadError) {
      try {
        await saveLastRun(admin, userId, now);
      } catch (error) {
        result.errors.push(
          `${userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return result;
}
