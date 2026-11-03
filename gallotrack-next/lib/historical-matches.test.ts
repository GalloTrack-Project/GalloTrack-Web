import { describe, expect, it } from 'vitest';
import {
  computeHistoricalGroupStats,
  groupUnlinkedMatches,
  historicalGroupKey,
  historicalGroupSexLabel,
} from '@/lib/historical-matches';
import type { MatchRecord } from '@/lib/types';

function match(overrides: Partial<MatchRecord> & { id: number }): MatchRecord {
  return {
    fowl_id: null,
    entry_name: 'Hatch Silver',
    breed: 'Hatch',
    opponent: 'Rival',
    outcome: 'Win',
    date: '2025-01-01',
    ...overrides,
  } as MatchRecord;
}

describe('historical match grouping', () => {
  it('groups by trimmed case-insensitive name and strain without merging strains', () => {
    const groups = groupUnlinkedMatches([
      match({ id: 1, entry_name: ' Hatch Silver ', breed: ' Hatch ' }),
      match({ id: 2, entry_name: 'hatch silver', breed: 'hatch' }),
      match({ id: 3, entry_name: 'Hatch Silver', breed: 'Kelso' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].entryName).toBe('Hatch Silver');
    expect(groups[0].matches.map((m) => m.id)).toEqual([1, 2]);
    expect(groups[1].strain).toBe('Kelso');
  });

  it('never includes matches already linked to a registered chicken', () => {
    const groups = groupUnlinkedMatches([
      match({ id: 1 }),
      match({ id: 2, fowl_id: 44 }),
      match({ id: 3, entry_name: '   ' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].matches.map((m) => m.id)).toEqual([1]);
  });

  it('computes the historical record and sex label', () => {
    const [group] = groupUnlinkedMatches([
      match({ id: 1, outcome: 'Win' }),
      match({ id: 2, outcome: 'Loss' }),
      match({ id: 3, outcome: 'Draw' }),
      match({ id: 4, outcome: 'Win', sex: 'Cock' } as Partial<MatchRecord> & { id: number }),
    ]);

    expect(computeHistoricalGroupStats(group)).toMatchObject({
      wins: 2,
      losses: 1,
      draws: 1,
      total: 4,
    });
    expect(historicalGroupSexLabel(group)).toBe('Cock');
    expect(historicalGroupKey(' Hatch Silver ', ' Hatch ')).toBe('hatch silver|||hatch');
  });

  it('labels missing sex as not recorded', () => {
    const [group] = groupUnlinkedMatches([match({ id: 1 })]);
    expect(historicalGroupSexLabel(group)).toBe('Not recorded');
  });
});
