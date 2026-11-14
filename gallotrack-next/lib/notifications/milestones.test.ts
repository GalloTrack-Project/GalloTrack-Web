import { describe, expect, it } from 'vitest';
import { buildMilestoneNotifications, notificationKey } from './milestones';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type MilestoneFowl,
  type MilestoneNotificationPreferences,
} from './types';

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

function prefs(
  overrides: Partial<MilestoneNotificationPreferences> = {},
): MilestoneNotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    stages: { ...DEFAULT_NOTIFICATION_PREFERENCES.stages },
    leadDays: [...DEFAULT_NOTIFICATION_PREFERENCES.leadDays],
    ...overrides,
  };
}

const sevenDaysBefore = new Date(2027, 3, 5);
const stageDay = new Date(2027, 3, 12);
const fiveDaysAfter = new Date(2027, 3, 17);
const thirtyDaysAfter = new Date(2027, 4, 12);

describe('buildMilestoneNotifications', () => {
  it('creates an upcoming item 7 days before the 6-month stage', () => {
    const [item] = buildMilestoneNotifications([fowl()], prefs(), sevenDaysBefore);
    expect(item).toMatchObject({
      type: 'upcoming',
      stageKey: 'stag',
      stageLabel: 'Stag',
      targetDate: '2027-04-12',
      daysUntil: 7,
      fullyMature: false,
    });
    expect(item.message).toBe(
      'Pearl Lemon (1A4) becomes a Stag in 7 days (Apr 12, 2027).',
    );
  });

  it('creates a today item on the stage date', () => {
    const [item] = buildMilestoneNotifications([fowl()], prefs(), stageDay);
    expect(item.type).toBe('today');
    expect(item.targetDate).toBe('2027-04-12');
    expect(item.message).toBe('Pearl Lemon (1A4) is now a Stag.');
  });

  it('creates a reached item 5 days after the stage date', () => {
    const items = buildMilestoneNotifications([fowl()], prefs(), fiveDaysAfter);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: 'reached',
      daysUntil: -5,
      targetDate: '2027-04-12',
    });
    expect(items[0].message).toBe('Pearl Lemon (1A4) became a Stag on Apr 12, 2027.');
  });

  it('keeps the reached window to 14 days', () => {
    const fourteenDaysAfter = buildMilestoneNotifications(
      [fowl()],
      prefs(),
      new Date(2027, 3, 26),
    );
    const fifteenDaysAfter = buildMilestoneNotifications(
      [fowl()],
      prefs(),
      new Date(2027, 3, 27),
    );
    expect(fourteenDaysAfter).toHaveLength(1);
    expect(fourteenDaysAfter[0].type).toBe('reached');
    expect(fifteenDaysAfter).toEqual([]);
  });

  it('creates nothing 30 days after the stage date', () => {
    expect(buildMilestoneNotifications([fowl()], prefs(), thirtyDaysAfter)).toEqual([]);
  });

  it('creates nothing for invalid or empty birth dates', () => {
    for (const birthdate of ['', 'not-a-date', '2027-02-31']) {
      expect(buildMilestoneNotifications([fowl({ birthdate })], prefs(), stageDay)).toEqual([]);
    }
  });

  it('excludes archived, deceased, sold, inactive, retired and historical profiles', () => {
    const excluded: MilestoneFowl[] = [
      fowl({ status: 'Archived' }),
      fowl({ status: 'Deceased' }),
      fowl({ status: 'Sold' }),
      fowl({ status: 'Inactive' }),
      fowl({ status: 'Active', activity_status: 'inactive' }),
      fowl({ status: 'Active', archive_kind: 'sold' }),
      fowl({ status: 'Active', archive_kind: 'retired' }),
      fowl({ status: 'Archived', archive_reason: 'Historical entry profile' }),
    ];
    expect(buildMilestoneNotifications(excluded, prefs(), stageDay)).toEqual([]);
  });

  it('uses the helper stage labels for cocks and hens', () => {
    const male = buildMilestoneNotifications(
      [fowl({ id: 1, name: 'Rocky Lemon', gender: 'Rooster' })],
      prefs(),
      sevenDaysBefore,
    )[0];
    const female = buildMilestoneNotifications(
      [fowl({ id: 2, name: 'Blaze Hatch', gender: 'Hen' })],
      prefs(),
      sevenDaysBefore,
    )[0];
    expect(male.stageLabel).toBe('Stag');
    expect(female.stageLabel).toBe('Pullet');

    const bullStag = buildMilestoneNotifications(
      [fowl({ id: 3, gender: 'Rooster', birthdate: '2026-10-12' })],
      prefs({ leadDays: [7] }),
      new Date(2027, 9, 5),
    )[0];
    const hen = buildMilestoneNotifications(
      [fowl({ id: 4, gender: 'Hen', birthdate: '2026-10-12' })],
      prefs({ leadDays: [7] }),
      new Date(2027, 9, 5),
    )[0];
    expect(bullStag.stageLabel).toBe('Bull Stag');
    expect(hen.stageLabel).toBe('Hen');
    expect(male.message).not.toMatch(/Sire|Dam/);
    expect(female.message).not.toMatch(/Sire|Dam/);
  });

  it('marks the 24-month stage as fully mature', () => {
    const item = buildMilestoneNotifications(
      [fowl({ birthdate: '2025-04-12' })],
      prefs(),
      new Date(2027, 3, 12),
    )[0];
    expect(item.type).toBe('today');
    expect(item.fullyMature).toBe(true);
    expect(item.stageLabel).toBe('Fully mature');
    expect(item.message).toBe('Pearl Lemon (1A4) is now fully mature.');
  });

  it('removes stale items when the birth date changes', () => {
    const before = buildMilestoneNotifications([fowl()], prefs(), sevenDaysBefore);
    expect(before).toHaveLength(1);
    const after = buildMilestoneNotifications(
      [fowl({ birthdate: '2026-01-12' })],
      prefs(),
      sevenDaysBefore,
    );
    expect(after).toEqual([]);
    expect(after.some((item) => item.key === before[0].key)).toBe(false);
  });

  it('groups five chickens that reach the same stage in the same week', () => {
    const chickens = [5, 6, 7, 8, 9].map((day, index) =>
      fowl({
        id: index + 1,
        name: `Group Chicken ${index + 1}`,
        bird_code: `1A${index + 1}`,
        birthdate: `2026-10-${String(day).padStart(2, '0')}`,
      }),
    );
    const items = buildMilestoneNotifications(chickens, prefs(), new Date(2027, 3, 10));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      isGroup: true,
      groupCount: 5,
      type: 'reached',
      stageLabel: 'Stag / Pullet',
    });
    expect(items[0].message).toBe('5 chickens reached Stag / Pullet this week.');
    expect(items[0].members).toHaveLength(5);
  });

  it('uses stable dedupe keys with stage, target date and lead type', () => {
    const first = buildMilestoneNotifications([fowl()], prefs(), sevenDaysBefore)[0];
    const second = buildMilestoneNotifications([fowl()], prefs(), sevenDaysBefore)[0];
    expect(first.key).toBe(second.key);
    expect(first.key).toBe(notificationKey(7, 'stag', '2027-04-12', 'upcoming-7'));
  });

  it('changes output when preferences change', () => {
    const atSevenDays = buildMilestoneNotifications([fowl()], prefs(), sevenDaysBefore);
    expect(atSevenDays).toHaveLength(1);
    expect(
      buildMilestoneNotifications([fowl()], prefs({ enabled: false }), sevenDaysBefore),
    ).toEqual([]);
    expect(
      buildMilestoneNotifications(
        [fowl()],
        prefs({ stages: { stag: false, 'bull-stag': true, cock: true } }),
        sevenDaysBefore,
      ),
    ).toEqual([]);
    expect(
      buildMilestoneNotifications([fowl()], prefs({ leadDays: [3] }), sevenDaysBefore),
    ).toEqual([]);
    expect(
      buildMilestoneNotifications([fowl()], prefs({ leadDays: [0] }), sevenDaysBefore),
    ).toEqual([]);
    expect(
      buildMilestoneNotifications([fowl()], prefs({ audience: 'hens' }), sevenDaysBefore),
    ).toEqual([]);
  });

  it('respects the hen/cock audience and fully-mature preference', () => {
    const rooster = fowl({ id: 1, gender: 'Rooster' });
    const hen = fowl({ id: 2, gender: 'Hen' });
    expect(
      buildMilestoneNotifications([rooster, hen], prefs({ audience: 'cocks' }), stageDay),
    ).toHaveLength(1);
    expect(
      buildMilestoneNotifications([rooster, hen], prefs({ audience: 'hens' }), stageDay),
    ).toHaveLength(1);
    expect(
      buildMilestoneNotifications(
        [fowl({ birthdate: '2025-04-12' })],
        prefs({ stages: { stag: true, 'bull-stag': true, cock: false } }),
        new Date(2027, 3, 12),
      ),
    ).toEqual([]);
  });
});
