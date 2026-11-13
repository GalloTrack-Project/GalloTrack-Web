import { describe, expect, it } from 'vitest';
import {
  dedupeNotificationPlans,
  getStageBoundaries,
  nextUpcomingBoundary,
  notificationPlansForFowl,
  notificationStorageKey,
  validUpcomingStage,
} from './milestones';
import type { MilestoneFowl, NotificationPreferenceInput } from './types';

function localDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const settings: NotificationPreferenceInput = {
  stageChanged: true,
  fullyMature: true,
  upcoming: true,
  leadDays: 7,
};

const fowl = (options: Partial<MilestoneFowl> = {}): MilestoneFowl => ({
  id: 7,
  name: 'Pearl Lemon',
  bird_code: '1A4',
  gender: 'Rooster',
  birthdate: '2025-01-15',
  status: 'Active',
  ...options,
});

describe('milestone notification date math', () => {
  it('uses the shared stage table for exactly 6, 12 and 24 month boundaries', () => {
    const boundaries = getStageBoundaries('2025-01-15', 'Rooster');
    expect(boundaries.map((b) => [b.months, b.stage, localDate(b.date)])).toEqual([
      [6, 'Stag', '2025-07-15'],
      [12, 'Bull Stag', '2026-01-15'],
      [24, 'Fully mature', '2027-01-15'],
    ]);
  });

  it('handles leap-year birthdays without drifting a day', () => {
    const boundaries = getStageBoundaries('2024-02-29', 'Hen');
    expect(boundaries.map((b) => localDate(b.date))).toEqual([
      '2024-08-29',
      '2025-02-28',
      '2026-02-28',
    ]);
    expect(boundaries.map((b) => b.stage)).toEqual(['Pullet', 'Hen', 'Fully mature']);
  });
});

describe('milestone notification generation', () => {
  it('creates a stage change only after a boundary crossed since the last run', () => {
    const plans = notificationPlansForFowl({
      fowl: fowl(),
      now: new Date('2025-07-15T12:00:00'),
      lastRunAt: '2025-07-14T01:00:00.000Z',
      settings,
    });
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      type: 'stage_changed',
      stage: 'Stag',
      due_date: '2025-07-15',
    });
  });

  it('does not replay old stages on the first run', () => {
    const plans = notificationPlansForFowl({
      fowl: fowl(),
      now: new Date('2025-07-15T12:00:00'),
      lastRunAt: null,
      settings,
    });
    expect(plans).toEqual([]);
  });

  it('creates upcoming notifications inside the configured lead time', () => {
    const plans = notificationPlansForFowl({
      fowl: fowl(),
      now: new Date('2025-07-10T12:00:00'),
      lastRunAt: '2025-07-09T01:00:00.000Z',
      settings,
    });
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      type: 'stage_upcoming',
      stage: 'Stag',
      due_date: '2025-07-15',
    });
  });

  it('respects the upcoming lead time and toggles', () => {
    const fowlNearBoundary = fowl();
    const now = new Date('2025-07-10T12:00:00');
    expect(
      notificationPlansForFowl({
        fowl: fowlNearBoundary,
        now,
        lastRunAt: '2025-07-09T01:00:00.000Z',
        settings: { ...settings, leadDays: 3 },
      }),
    ).toEqual([]);
    expect(
      notificationPlansForFowl({
        fowl: fowlNearBoundary,
        now,
        lastRunAt: '2025-07-09T01:00:00.000Z',
        settings: { ...settings, upcoming: false },
      }),
    ).toEqual([]);
    expect(
      notificationPlansForFowl({
        fowl: fowlNearBoundary,
        now,
        lastRunAt: '2025-07-09T01:00:00.000Z',
        settings: { ...settings, stageChanged: false },
      }),
    ).toHaveLength(1);
  });

  it('creates a fully mature notification at 24 months', () => {
    const plans = notificationPlansForFowl({
      fowl: fowl({ birthdate: '2023-07-15' }),
      now: new Date('2025-07-15T12:00:00'),
      lastRunAt: '2025-07-14T01:00:00.000Z',
      settings,
    });
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      type: 'fully_mature',
      stage: 'Fully mature',
      due_date: '2025-07-15',
    });
  });

  it('excludes archived and deceased chickens', () => {
    for (const status of ['Archived', 'Deceased', 'archived', 'deceased']) {
      expect(
        notificationPlansForFowl({
          fowl: fowl({ status }),
          now: new Date('2025-07-15T12:00:00'),
          lastRunAt: '2025-07-14T01:00:00.000Z',
          settings,
        }),
      ).toEqual([]);
    }
  });

  it('removes an old upcoming stage when the birth date moves out of the lead window', () => {
    const now = new Date('2025-07-10T12:00:00');
    expect(validUpcomingStage(fowl(), now, settings)).toBe('Stag');
    const edited = fowl({ birthdate: '2025-03-15' });
    expect(validUpcomingStage(edited, now, settings)).toBeNull();
    expect(nextUpcomingBoundary(edited, now, settings.leadDays)).toBeNull();
  });

  it('deduplicates plans and produces a stable unique key', () => {
    const plan = notificationPlansForFowl({
      fowl: fowl(),
      now: new Date('2025-07-10T12:00:00'),
      lastRunAt: '2025-07-09T01:00:00.000Z',
      settings,
    })[0];
    expect(dedupeNotificationPlans([plan, plan])).toHaveLength(1);
    expect(notificationStorageKey('user-1', 7, plan.type, plan.stage)).toBe(
      'user-1::7::stage_upcoming::Stag',
    );
  });
});
