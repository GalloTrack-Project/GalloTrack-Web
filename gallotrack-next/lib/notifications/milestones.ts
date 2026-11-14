import {
  addMonthsToDate,
  autoComputeGrowthStage,
  getAgeParts,
  getDevelopmentStages,
  getMilestoneInfo,
  isFemale,
  isMale,
  parseFowlDate,
} from '@/lib/helpers';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_LEAD_DAY_OPTIONS,
  type DerivedMilestoneNotification,
  type MilestoneFowl,
  type MilestoneNotificationPreferences,
  type NotificationAudience,
  type NotificationMember,
  type NotificationStageKey,
} from './types';

export const FULLY_MATURE_STAGE = 'Fully mature';

const DAY_MS = 24 * 60 * 60 * 1000;
const STAGE_KEYS: readonly NotificationStageKey[] = ['stag', 'bull-stag', 'cock'];

export type MilestoneStageOption = {
  key: NotificationStageKey;
  months: number;
  maleLabel: string;
  femaleLabel: string;
  groupLabel: string;
  fullyMature: boolean;
};

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function calendarDayDiff(target: Date, from: Date): number {
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((targetUtc - fromUtc) / DAY_MS);
}

export function startOfWeek(value: Date): Date {
  const date = startOfDay(value);
  const day = date.getDay();
  const offset = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - offset);
  return date;
}

export function parseValidBirthdate(value?: string | null): Date | null {
  const parsed = parseFowlDate(value);
  if (!parsed || !value) return null;
  const digits = String(value).replace(/[^0-9]/g, '').slice(0, 8);
  if (digits.length !== 8) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function getMilestoneStageOptions(): MilestoneStageOption[] {
  const male = getDevelopmentStages('Rooster').filter((stage) => stage.fromMonths > 0);
  const female = getDevelopmentStages('Hen').filter((stage) => stage.fromMonths > 0);
  const lastFromMonths = male[male.length - 1]?.fromMonths ?? 24;
  return male.map((stage, index) => {
    const femaleStage = female[index];
    const fullyMature = stage.fromMonths === lastFromMonths;
    const femaleLabel = fullyMature
      ? femaleStage?.id || stage.stage
      : femaleStage?.stage || stage.stage;
    return {
      key: STAGE_KEYS[index] ?? 'cock',
      months: stage.fromMonths,
      maleLabel: stage.stage,
      femaleLabel,
      groupLabel:
        femaleLabel && femaleLabel !== stage.stage
          ? `${stage.stage} / ${femaleLabel}`
          : stage.stage,
      fullyMature,
    };
  });
}

export function normalizeNotificationPreferences(
  value?: Partial<MilestoneNotificationPreferences> | null,
): MilestoneNotificationPreferences {
  const stages = (value?.stages ?? {}) as Partial<Record<NotificationStageKey, boolean>>;
  const requestedLeads = Array.isArray(value?.leadDays)
    ? value.leadDays
    : DEFAULT_NOTIFICATION_PREFERENCES.leadDays;
  const leadDays = [...new Set(requestedLeads.filter((days) => NOTIFICATION_LEAD_DAY_OPTIONS.includes(days as never)))]
    .map(Number)
    .sort((a, b) => b - a);
  const audience: NotificationAudience =
    value?.audience === 'cocks' || value?.audience === 'hens' ? value.audience : 'both';
  return {
    enabled: value?.enabled !== false,
    stages: {
      stag: stages.stag !== false,
      'bull-stag': stages['bull-stag'] !== false,
      cock: stages.cock !== false,
    },
    leadDays: leadDays.length > 0 ? leadDays : DEFAULT_NOTIFICATION_PREFERENCES.leadDays,
    audience,
  };
}

export function isMilestoneNotificationEligible(fowl: MilestoneFowl): boolean {
  const status = (fowl.status || '').trim().toLowerCase();
  if (status !== 'active') return false;
  if ((fowl.activity_status || '').trim().toLowerCase() === 'inactive') return false;
  if ((fowl.archive_kind || '').trim()) return false;
  if ((fowl.archive_reason || '').toLowerCase().includes('historical entry')) return false;
  return parseValidBirthdate(fowl.birthdate) !== null;
}

function fowlMatchesAudience(fowl: MilestoneFowl, audience: NotificationAudience): boolean {
  if (audience === 'both') return true;
  if (audience === 'cocks') return isMale(fowl.gender || '');
  return isFemale(fowl.gender || '');
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function notificationKey(
  fowlId: number,
  stage: NotificationStageKey,
  targetDate: string,
  leadType: string,
): string {
  return `${fowlId}::${stage}::${targetDate}::${leadType}`;
}

export function formatNotificationDate(value: Date): string {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function identity(name: string, code: string): string {
  return code ? `${name} (${code})` : name;
}

function individualMessage(
  name: string,
  code: string,
  stageLabel: string,
  fullyMature: boolean,
  type: NotificationMember['type'],
  daysUntil: number,
  targetDate: Date,
): string {
  const who = identity(name, code);
  const date = formatNotificationDate(targetDate);
  if (fullyMature) {
    if (type === 'upcoming') {
      return `${who} becomes fully mature in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} (${date}).`;
    }
    return `${who} is now fully mature.`;
  }
  if (type === 'upcoming') {
    return `${who} becomes a ${stageLabel} in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} (${date}).`;
  }
  if (type === 'today') {
    return `${who} is now a ${stageLabel}.`;
  }
  return `${who} became a ${stageLabel} on ${date}.`;
}

function groupMessage(
  members: NotificationMember[],
  stageLabel: string,
  type: NotificationMember['type'],
  weekStart: Date,
  today: Date,
): string {
  const count = members.length;
  const currentWeek = dateKey(startOfWeek(today));
  const thisWeek = dateKey(weekStart) === currentWeek;
  const period = thisWeek ? ' this week' : ` the week of ${formatNotificationDate(weekStart)}`;
  const stage = members[0]?.fullyMature ? 'fully mature' : stageLabel;
  if (type === 'today') {
    return `${count} chickens reach ${stage} today.`;
  }
  if (type === 'reached') {
    return `${count} chickens reached ${stage}${period}.`;
  }
  return `${count} chickens reach ${stage}${period}.`;
}

function makeGroupKey(
  stageKey: NotificationStageKey,
  type: NotificationMember['type'],
  weekStart: Date,
  members: NotificationMember[],
): string {
  return `group::${stageKey}::${dateKey(weekStart)}::${type}::${members
    .map((member) => member.key)
    .sort()
    .join('|')}`;
}

function groupMembers(
  members: NotificationMember[],
  today: Date,
): DerivedMilestoneNotification[] {
  const buckets = new Map<string, NotificationMember[]>();
  for (const member of members) {
    const target = parseDateKey(member.targetDate);
    if (!target) continue;
    const week = dateKey(startOfWeek(target));
    const bucketKey = `${member.stageKey}::${member.type}::${week}`;
    const bucket = buckets.get(bucketKey) ?? [];
    bucket.push(member);
    buckets.set(bucketKey, bucket);
  }

  const items: DerivedMilestoneNotification[] = [];
  for (const group of buckets.values()) {
    group.sort((a, b) => a.targetDate.localeCompare(b.targetDate) || a.fowlName.localeCompare(b.fowlName));
    if (group.length < 2) {
      const member = group[0];
      items.push({
        key: member.key,
        type: member.type,
        stageKey: member.stageKey,
        stageLabel: member.stageLabel,
        fullyMature: member.fullyMature,
        targetDate: member.targetDate,
        daysUntil: member.daysUntil,
        fowlId: member.fowlId,
        fowlName: member.fowlName,
        fowlCode: member.fowlCode,
        fowlInitials: member.fowlInitials,
        message: member.message,
        isGroup: false,
        groupCount: 1,
        groupLabel: member.stageLabel,
        members: [member],
        memberKeys: [member.key],
      });
      continue;
    }

    const target = parseDateKey(group[0].targetDate);
    if (!target) continue;
    const weekStart = startOfWeek(target);
    const first = group[0];
    const stageOption = getMilestoneStageOptions().find((option) => option.key === first.stageKey);
    const groupLabel = first.fullyMature ? FULLY_MATURE_STAGE : stageOption?.groupLabel || first.stageLabel;
    const key = makeGroupKey(first.stageKey, first.type, weekStart, group);
    items.push({
      key,
      type: first.type,
      stageKey: first.stageKey,
      stageLabel: groupLabel,
      fullyMature: group.every((member) => member.fullyMature),
      targetDate: dateKey(weekStart),
      daysUntil: calendarDayDiff(weekStart, today),
      fowlId: null,
      fowlName: `${group.length} chickens`,
      fowlCode: '',
      fowlInitials: String(group.length),
      message: groupMessage(group, groupLabel, first.type, weekStart, today),
      isGroup: true,
      groupCount: group.length,
      groupLabel,
      members: group,
      memberKeys: group.map((member) => member.key),
    });
  }

  return items.sort((a, b) => {
    const priority: Record<NotificationMember['type'], number> = {
      today: 0,
      upcoming: 1,
      reached: 2,
    };
    if (priority[a.type] !== priority[b.type]) return priority[a.type] - priority[b.type];
    if (a.type === 'reached') return b.daysUntil - a.daysUntil;
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.fowlName.localeCompare(b.fowlName);
  });
}

export function buildMilestoneNotifications(
  fowls: MilestoneFowl[],
  preferences: MilestoneNotificationPreferences,
  today: Date,
): DerivedMilestoneNotification[] {
  const prefs = normalizeNotificationPreferences(preferences);
  if (!prefs.enabled) return [];

  const todayDate = startOfDay(today);
  const stageOptions = getMilestoneStageOptions();
  const members: NotificationMember[] = [];

  for (const fowl of fowls) {
    if (!isMilestoneNotificationEligible(fowl)) continue;
    if (!fowlMatchesAudience(fowl, prefs.audience)) continue;

    const birth = parseValidBirthdate(fowl.birthdate);
    if (!birth || birth.getTime() > todayDate.getTime()) continue;

    const age = getAgeParts(fowl.birthdate, todayDate);
    const info = getMilestoneInfo(fowl.birthdate, fowl.gender || undefined, todayDate);
    if (!age || !info) continue;

    const currentStage =
      autoComputeGrowthStage(age.totalMonths, fowl.gender || 'Rooster') || info.current?.stage || '';
    const name = fowl.name || 'Chicken';
    const code = formatBirdCodeForDisplay(fowl.bird_code || fowl.chicken_code || '');
    const fowlInitials = initialsFor(name);

    for (const stage of stageOptions) {
      if (!prefs.stages[stage.key]) continue;
      const target = startOfDay(addMonthsToDate(birth, stage.months));
      const targetDate = dateKey(target);
      const daysUntil = calendarDayDiff(target, todayDate);

      let type: NotificationMember['type'] | null = null;
      let leadType = '';
      if (daysUntil > 0 && prefs.leadDays.includes(daysUntil)) {
        type = 'upcoming';
        leadType = `upcoming-${daysUntil}`;
      } else if (daysUntil === 0 && prefs.leadDays.includes(0)) {
        type = 'today';
        leadType = 'today';
      } else if (daysUntil < 0 && daysUntil >= -14) {
        type = 'reached';
        leadType = 'reached';
      }
      if (!type) continue;

      const stageLabel = stage.fullyMature
        ? FULLY_MATURE_STAGE
        : isFemale(fowl.gender || '')
          ? stage.femaleLabel
          : stage.maleLabel;
      const key = notificationKey(fowl.id, stage.key, targetDate, leadType);
      members.push({
        key,
        fowlId: fowl.id,
        fowlName: name,
        fowlCode: code,
        fowlInitials,
        gender: fowl.gender || '',
        currentStage,
        stageKey: stage.key,
        stageLabel,
        targetDate,
        type,
        daysUntil,
        leadType,
        fullyMature: stage.fullyMature,
        message: individualMessage(name, code, stageLabel, stage.fullyMature, type, daysUntil, target),
      });
    }
  }

  return groupMembers(members, todayDate);
}
