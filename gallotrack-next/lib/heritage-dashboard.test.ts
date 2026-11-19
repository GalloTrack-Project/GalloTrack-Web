import { describe, expect, it } from 'vitest';
import {
  buildChickenMatchStatsMap,
  combineWinRates,
  getChickenMatchStats,
} from './win-rate';
import { canFight } from './helpers';
import { getRegistryCounts } from './registry-roles';
import { unreadBadgeText } from './notifications/format';
import { OWNER_NAV, groupNavItems } from './nav-manifest';
import type { FowlRecord, MatchRecord } from './types';

function bird(
  id: number,
  name: string,
  breed: string,
  gender: string,
  status = 'Active',
): FowlRecord {
  return {
    id,
    name,
    breed,
    gender,
    status,
    color: '',
    color_category: '',
    growth_stage: '',
    behavior_trait: '',
    eye_variant: '',
    birthdate: '2025-01-01',
    age: '',
    weight: '',
    height: '',
    sire: 'Foundation Stock',
    dam: 'Foundation Stock',
    bird_code: String(id),
  } as FowlRecord;
}

const fowls = [
  bird(1, 'Cock One', 'Lemon', 'Rooster'),
  bird(2, 'Cock Two', 'Hatch', 'Rooster'),
  bird(3, 'Hen One', 'Lemon', 'Hen'),
  bird(4, 'Archived Cock', 'Sweater', 'Rooster', 'Archived'),
  bird(5, 'Deceased Hen', 'Hatch', 'Hen', 'Deceased'),
];

const matches = [
  { id: 1, fowl_id: 1, outcome: 'Win', date: '2026-11-18', entry_name: 'Cock One' },
  { id: 2, fowl_id: 1, outcome: 'Loss', date: '2026-11-17', entry_name: 'Cock One' },
  { id: 3, fowl_id: 1, outcome: 'Draw', date: '2026-11-16', entry_name: 'Cock One' },
  { id: 4, fowl_id: 3, outcome: 'Win', date: '2026-11-15', entry_name: 'Hen One' },
  { id: 5, fowl_id: null, outcome: 'Win', date: '2026-11-14', entry_name: 'Historical Cock' },
] as MatchRecord[];

describe('heritage dashboard figures', () => {
  it('keeps totals, W-L-D, win rate, strains and shell counts on existing calculations', () => {
    const active = fowls.filter((fowl) => fowl.status === 'Active');
    const counts = getRegistryCounts(fowls);
    const statMap = buildChickenMatchStatsMap(matches, fowls);
    const record = combineWinRates(
      fowls
        .filter((fowl) => canFight(fowl))
        .map((fowl) => getChickenMatchStats(statMap, fowl)),
    );
    const strains = new Set(
      active.flatMap((fowl) =>
        (fowl.breed || '')
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    );

    expect(counts).toMatchObject({
      total: 3,
      flockTotal: 5,
      archived: 1,
      deceased: 1,
      breedingMales: 2,
      breedingFemales: 1,
    });
    expect(matches.length).toBe(5);
    expect(record).toMatchObject({
      wins: 1,
      losses: 1,
      draws: 1,
      total: 3,
      decided: 2,
      winRate: 50,
      isLowSample: true,
    });
    expect(strains.size).toBe(2);
    expect(unreadBadgeText(3)).toBe('3');
    expect(unreadBadgeText(120)).toBe('99+');
    const groups = groupNavItems(OWNER_NAV);
    expect(groups.map((group) => group.group)).toEqual(['Farm', 'Account']);
    expect(OWNER_NAV.map((item) => item.href)).toEqual([
      '/dashboard',
      '/profiling',
      '/catalog',
      '/lineage',
      '/breeding',
      '/notifications',
      '/profile',
    ]);
  });

  it('keeps hens out of recent fighting rows while preserving historical rows', () => {
    const fowlById = new Map(fowls.map((bird) => [bird.id, bird]));
    const recent = matches
      .filter((match) => {
        if (match.fowl_id == null) return true;
        const linked = fowlById.get(Number(match.fowl_id));
        return !linked || canFight(linked);
      })
      .slice(0, 5);

    expect(recent.map((match) => match.id)).toEqual([1, 2, 3, 5]);
    expect(recent.some((match) => match.fowl_id === 3)).toBe(false);
  });
});
