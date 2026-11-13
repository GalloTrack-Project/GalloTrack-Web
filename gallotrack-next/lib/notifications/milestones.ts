import { addMonthsToDate, getDevelopmentStages, parseFowlDate } from '@/lib/helpers';
import type {
  MilestoneFowl,
  NotificationInsert,
  NotificationPreferenceInput,
} from './types';

export const NOTIFICATION_LEAD_DAYS = [3, 7, 14] as const;
export const DEFAULT_NOTIFICATION_LEAD_DAYS = 7;
export const FULLY_MATURE_STAGE = 'Fully mature';

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeLeadDays(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return (NOTIFICATION_LEAD_DAYS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_NOTIFICATION_LEAD_DAYS;
}

export function isMilestoneEligible(fowl: MilestoneFowl): boolean {
  const status = (fowl.status || 'active').trim().toLowerCase();
  return status !== 'archived' && status !== 'deceased';
}

function startOfDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateOnly(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type StageBoundary = {
  months: number;
  stage: string;
  actualStage: string;
  fullyMature: boolean;
  date: Date;
};

/**
 * Builds stage boundaries from the same development-stage table used by the
 * Milestones page and dashboard card. No thresholds are duplicated here.
 */
export function getStageBoundaries(
  birthdate?: string | null,
  gender?: string | null,
): StageBoundary[] {
  const birth = parseFowlDate(birthdate);
  if (!birth) return [];
  const stages = getDevelopmentStages(gender ?? undefined);
  const lastFromMonths = stages[stages.length - 1]?.fromMonths ?? 24;
  return stages
    .filter((stage) => stage.fromMonths > 0)
    .map((stage) => {
      const fullyMature = stage.fromMonths === lastFromMonths;
      return {
        months: stage.fromMonths,
        stage: fullyMature ? FULLY_MATURE_STAGE : stage.stage,
        actualStage: stage.stage,
        fullyMature,
        date: addMonthsToDate(birth, stage.fromMonths),
      };
    });
}

function displayFowl(fowl: MilestoneFowl): { name: string; code: string } {
  return {
    name: fowl.name || 'Chicken',
    code: fowl.bird_code || `#${fowl.id}`,
  };
}

function stageChangedPlan(fowl: MilestoneFowl, boundary: StageBoundary): NotificationInsert {
  const { name, code } = displayFowl(fowl);
  if (boundary.fullyMature) {
    return {
      type: 'fully_mature',
      stage: FULLY_MATURE_STAGE,
      title: `${name} is fully mature`,
      body: `${code} reached the ${boundary.months}-month milestone and is now fully mature.`,
      due_date: formatDateOnly(boundary.date),
    };
  }
  return {
    type: 'stage_changed',
    stage: boundary.stage,
    title: `${name} reached ${boundary.stage}`,
    body: `${code} crossed the ${boundary.months}-month milestone and entered the ${boundary.actualStage} stage.`,
    due_date: formatDateOnly(boundary.date),
  };
}

function upcomingPlan(fowl: MilestoneFowl, boundary: StageBoundary): NotificationInsert {
  const { name, code } = displayFowl(fowl);
  return {
    type: 'stage_upcoming',
    stage: boundary.stage,
    title: `${boundary.stage} coming up`,
    body: `${name} (${code}) is expected to reach ${boundary.stage} on ${formatDateOnly(boundary.date)}.`,
    due_date: formatDateOnly(boundary.date),
  };
}

export function nextUpcomingBoundary(
  fowl: MilestoneFowl,
  now: Date,
  leadDays: number,
): StageBoundary | null {
  const today = startOfDay(now);
  const next = getStageBoundaries(fowl.birthdate, fowl.gender).find(
    (boundary) => startOfDay(boundary.date).getTime() > today.getTime(),
  );
  if (!next) return null;
  const daysUntil = Math.round(
    (startOfDay(next.date).getTime() - today.getTime()) / DAY_MS,
  );
  return daysUntil > 0 && daysUntil <= leadDays ? next : null;
}

export function validUpcomingStage(
  fowl: MilestoneFowl,
  now: Date,
  settings: NotificationPreferenceInput,
): string | null {
  if (!settings.upcoming) return null;
  return nextUpcomingBoundary(fowl, now, settings.leadDays)?.stage ?? null;
}

export function notificationPlansForFowl({
  fowl,
  now,
  lastRunAt,
  settings,
}: {
  fowl: MilestoneFowl;
  now: Date;
  lastRunAt?: string | null;
  settings: NotificationPreferenceInput;
}): NotificationInsert[] {
  if (!isMilestoneEligible(fowl)) return [];

  const today = startOfDay(now);
  const lastRun = lastRunAt ? new Date(lastRunAt) : null;
  const lastRunDay = lastRun && !Number.isNaN(lastRun.getTime()) ? startOfDay(lastRun) : null;
  const plans: NotificationInsert[] = [];

  for (const boundary of getStageBoundaries(fowl.birthdate, fowl.gender)) {
    const due = startOfDay(boundary.date);
    const crossedSinceLastRun =
      lastRunDay !== null &&
      due.getTime() > lastRunDay.getTime() &&
      due.getTime() <= today.getTime();
    if (!crossedSinceLastRun) continue;

    if (boundary.fullyMature) {
      if (settings.fullyMature) plans.push(stageChangedPlan(fowl, boundary));
    } else if (settings.stageChanged) {
      plans.push(stageChangedPlan(fowl, boundary));
    }
  }

  const upcoming = nextUpcomingBoundary(fowl, now, settings.leadDays);
  if (settings.upcoming && upcoming) {
    plans.push(upcomingPlan(fowl, upcoming));
  }

  return dedupeNotificationPlans(plans);
}

export function dedupeNotificationPlans(plans: NotificationInsert[]): NotificationInsert[] {
  const seen = new Set<string>();
  const out: NotificationInsert[] = [];
  for (const plan of plans) {
    const key = `${plan.type}::${plan.stage}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(plan);
  }
  return out;
}

export function notificationStorageKey(
  userId: string,
  fowlId: number,
  type: string,
  stage: string,
): string {
  return `${userId}::${fowlId}::${type}::${stage}`;
}
