import { formatDate, type AppLanguage, type TranslationKey } from '@/lib/i18n';
import { startOfWeek } from './milestones';
import type {
  DerivedMilestoneNotification,
  NotificationMember,
} from './types';

export type NotificationBucket = 'today' | 'thisWeek' | 'later' | 'earlier';

type Translator = (key: TranslationKey, params?: Record<string, string | number>) => string;

const DAY_MS = 24 * 60 * 60 * 1000;

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

function parseDateOnly(value: string): Date | null {
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

export function unreadBadgeText(count: number): string {
  if (count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}

export function notificationsAriaLabel(count: number, t?: Translator): string {
  return t ? t('notifications.ariaLabel', { count }) : `Notifications, ${count} unread`;
}

export function relativeDateLabel(date: string, now = new Date(), t?: Translator): string {
  const target = parseDateOnly(date);
  if (!target) return date;
  const today = startOfDay(now);
  const days = Math.round((target.getTime() - today.getTime()) / DAY_MS);
  if (days === 0) return t ? t('notifications.relativeToday') : 'Today';
  if (days === 1) return t ? t('notifications.relativeTomorrow') : 'Tomorrow';
  if (days === -1) return t ? t('notifications.relativeYesterday') : 'Yesterday';
  if (days > 0) return t ? t('notifications.relativeInDays', { days }) : `In ${days} days`;
  return t ? t('notifications.relativeDaysAgo', { days: Math.abs(days) }) : `${Math.abs(days)} days ago`;
}

export function notificationBucket(date: string, today = new Date()): NotificationBucket {
  const target = parseDateOnly(date);
  if (!target) return 'earlier';
  const todayDate = startOfDay(today);
  const weekStart = startOfWeek(todayDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  if (dateKey(target) === dateKey(todayDate)) return 'today';
  if (target >= weekStart && target <= weekEnd) return 'thisWeek';
  if (target > weekEnd) return 'later';
  return 'earlier';
}

export function notificationBucketLabel(bucket: NotificationBucket, t: Translator): string {
  if (bucket === 'today') return t('notifications.today');
  if (bucket === 'thisWeek') return t('notifications.thisWeek');
  if (bucket === 'later') return t('notifications.later');
  return t('notifications.earlier');
}

export function nextMilestoneLabel(
  next: { stage: string; daysUntil: number } | null,
  t: Translator,
): string {
  if (!next) return t('notifications.fullyMature');
  if (next.daysUntil >= 0) {
    return t('notifications.nextStage', { stage: next.stage, days: next.daysUntil });
  }
  return t('notifications.nextStageOverdue', {
    stage: next.stage,
    days: Math.abs(next.daysUntil),
  });
}

function memberMessage(member: NotificationMember, t: Translator, language: AppLanguage): string {
  const date = formatDate(member.targetDate, language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const key = member.fullyMature
    ? member.type === 'upcoming'
      ? member.daysUntil === 1
        ? 'notifications.messageUpcomingMatureOne'
        : 'notifications.messageUpcomingMature'
      : member.type === 'today'
        ? 'notifications.messageTodayMature'
        : 'notifications.messageReachedMature'
    : member.type === 'upcoming'
      ? member.daysUntil === 1
        ? 'notifications.messageUpcomingOne'
        : 'notifications.messageUpcoming'
      : member.type === 'today'
        ? 'notifications.messageToday'
        : 'notifications.messageReached';

  return t(key, {
    who: member.fowlCode ? `${member.fowlName} (${member.fowlCode})` : member.fowlName,
    stage: member.stageLabel,
    days: member.daysUntil,
    date,
  });
}

export function formatNotificationMessage(
  notification: DerivedMilestoneNotification,
  t: Translator,
  language: AppLanguage,
): string {
  if (!notification.isGroup) {
    return memberMessage(notification.members[0] ?? {
      ...notification,
      currentStage: '',
      gender: '',
      fowlInitials: '',
      leadType: '',
    }, t, language);
  }

  const weekStart = startOfWeek(parseDateOnly(notification.targetDate) ?? new Date());
  const currentWeekStart = startOfWeek(new Date());
  const thisWeek = dateKey(weekStart) === dateKey(currentWeekStart);
  const weekKey = notification.type === 'reached'
    ? thisWeek
      ? 'notifications.groupReachedThisWeek'
      : 'notifications.groupReachedWeek'
    : thisWeek
      ? 'notifications.groupUpcomingThisWeek'
      : 'notifications.groupUpcomingWeek';
  const key = notification.type === 'today'
    ? 'notifications.groupToday'
    : weekKey;
  return t(key, {
    count: notification.groupCount,
    stage: notification.fullyMature ? 'fully mature' : notification.groupLabel,
    date: formatDate(notification.targetDate, language, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  });
}
