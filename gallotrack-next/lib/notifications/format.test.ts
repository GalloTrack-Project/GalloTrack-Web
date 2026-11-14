import { describe, expect, it } from 'vitest';
import {
  notificationStageLabel,
  notificationsAriaLabel,
  relativeDateLabel,
  unreadBadgeText,
} from './format';
import type { MilestoneNotification } from './types';

describe('notification formatting', () => {
  it('caps unread badges at 9+ and describes the count for assistive tech', () => {
    expect(unreadBadgeText(0)).toBe('');
    expect(unreadBadgeText(1)).toBe('1');
    expect(unreadBadgeText(9)).toBe('9');
    expect(unreadBadgeText(10)).toBe('9+');
    expect(notificationsAriaLabel(12)).toBe('Notifications, 12 unread');
  });

  it('formats relative due dates', () => {
    const now = new Date('2026-11-13T10:00:00');
    expect(relativeDateLabel('2026-11-13', now)).toBe('Today');
    expect(relativeDateLabel('2026-11-14', now)).toBe('Tomorrow');
    expect(relativeDateLabel('2026-11-12', now)).toBe('Yesterday');
    expect(relativeDateLabel('2026-11-18', now)).toBe('In 5 days');
    expect(relativeDateLabel('2026-11-10', now)).toBe('3 days ago');
  });

  it('labels stage changes, upcoming stages and full maturity', () => {
    const base = {
      id: 1,
      user_id: 'u',
      fowl_id: 1,
      title: 'x',
      body: 'y',
      due_date: '2026-11-13',
      read_at: null,
      created_at: '2026-11-13T00:00:00Z',
      stage: 'Stag',
    } as MilestoneNotification;
    expect(notificationStageLabel(base)).toBe('Now Stag');
    expect(notificationStageLabel({ ...base, type: 'stage_upcoming' })).toBe('Stag coming up');
    expect(notificationStageLabel({ ...base, type: 'fully_mature', stage: 'Fully mature' })).toBe(
      'Fully mature',
    );
  });
});
