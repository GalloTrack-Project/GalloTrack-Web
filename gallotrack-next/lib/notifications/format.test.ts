import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n';
import {
  formatNotificationMessage,
  nextMilestoneLabel,
  notificationBucket,
  relativeDateLabel,
  unreadBadgeText,
} from './format';
import { buildMilestoneNotifications } from './milestones';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type MilestoneFowl,
} from './types';

const t = (key: Parameters<typeof translate>[0], params?: Record<string, string | number>) =>
  translate(key, 'en', params);

function fowl(overrides: Partial<MilestoneFowl> = {}): MilestoneFowl {
  return {
    id: 7,
    name: 'Pearl Lemon',
    bird_code: '1A4',
    gender: 'Rooster',
    birthdate: '2026-10-12',
    status: 'Active',
    activity_status: 'active',
    ...overrides,
  };
}

describe('notification formatting', () => {
  it('caps unread badges at 99+ and describes counts politely', () => {
    expect(unreadBadgeText(0)).toBe('');
    expect(unreadBadgeText(99)).toBe('99');
    expect(unreadBadgeText(100)).toBe('99+');
  });

  it('formats relative dates and date buckets', () => {
    const now = new Date(2027, 3, 7, 10);
    expect(relativeDateLabel('2027-04-07', now, t)).toBe('Today');
    expect(relativeDateLabel('2027-04-08', now, t)).toBe('Tomorrow');
    expect(relativeDateLabel('2027-04-06', now, t)).toBe('Yesterday');
    expect(relativeDateLabel('2027-04-12', now, t)).toBe('In 5 days');
    expect(relativeDateLabel('2027-04-02', now, t)).toBe('5 days ago');

    expect(notificationBucket('2027-04-07', now)).toBe('today');
    expect(notificationBucket('2027-04-09', now)).toBe('thisWeek');
    expect(notificationBucket('2027-04-15', now)).toBe('later');
    expect(notificationBucket('2027-04-01', now)).toBe('earlier');
  });

  it('renders the next milestone label or fully mature', () => {
    expect(nextMilestoneLabel({ stage: 'Cock', daysUntil: 150 }, t)).toBe(
      'Next: Cock in 150d',
    );
    expect(nextMilestoneLabel({ stage: 'Stag', daysUntil: -3 }, t)).toBe(
      'Next: Stag · 3d overdue',
    );
    expect(nextMilestoneLabel(null, t)).toBe('Fully mature');
  });

  it('renders translated individual messages with and without a code', () => {
    const [item] = buildMilestoneNotifications(
      [fowl()],
      DEFAULT_NOTIFICATION_PREFERENCES,
      new Date(2027, 3, 5),
    );
    expect(formatNotificationMessage(item, t, 'en')).toBe(
      'Pearl Lemon (1A4) becomes a Stag in 7 days (Apr 12, 2027).',
    );

    const [withoutCode] = buildMilestoneNotifications(
      [fowl({ bird_code: null, chicken_code: null })],
      DEFAULT_NOTIFICATION_PREFERENCES,
      new Date(2027, 3, 5),
    );
    expect(formatNotificationMessage(withoutCode, t, 'en')).toBe(
      'Pearl Lemon becomes a Stag in 7 days (Apr 12, 2027).',
    );
    expect(formatNotificationMessage(withoutCode, t, 'en')).not.toContain('#');
  });
});
