import type { MilestoneNotification } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function unreadBadgeText(count: number): string {
  if (count <= 0) return '';
  return count > 9 ? '9+' : String(count);
}

export function notificationsAriaLabel(count: number): string {
  return `Notifications, ${count} unread`;
}

export function relativeDateLabel(date: string, now = new Date()): string {
  const target = new Date(`${date.slice(0, 10)}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(target.getTime())) return date;
  const days = Math.round((target.getTime() - today.getTime()) / DAY_MS);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

export function notificationStageLabel(notification: MilestoneNotification): string {
  if (notification.type === 'fully_mature') return 'Fully mature';
  if (notification.type === 'stage_upcoming') return `${notification.stage} coming up`;
  return `Now ${notification.stage}`;
}
