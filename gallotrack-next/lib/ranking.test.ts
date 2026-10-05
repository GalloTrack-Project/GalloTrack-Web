import { describe, it, expect } from 'vitest';
import { rankFowls, bestFowl, bestYearFor, isEligible, type RankingStats } from '@/lib/ranking';
import type { FowlRecord, MatchRecord } from '@/lib/types';

const stats = (wins: number, losses: number, extra = 0): RankingStats => {
  const decided = wins + losses;
  return { total: decided + extra, wins, losses, decided, winRate: decided > 0 ? Math.round((wins / decided) * 100) : 0 };
};

const bird = (id: number, name: string): FowlRecord =>
  ({ id, name, gender: 'Rooster', breed: 'Sweater', status: 'Active' }) as FowlRecord;

describe('rankFowls', () => {
  const a = bird(1, 'Alpha');
  const b = bird(2, 'Bravo');
  const c = bird(3, 'Charlie');
  const table: Record<string, RankingStats> = {
    Alpha: stats(2, 0),
    Bravo: stats(5, 5),
    Charlie: stats(0, 0),
  };
  const statsOf = (name: string) => table[name];

  it('ranks by total wins by default (approved metric)', () => {
    expect(rankFowls([a, b, c], statsOf).map((f) => f.name)).toEqual(['Bravo', 'Alpha', 'Charlie']);
  });

  it('ranks by win rate when the metric says so', () => {
    expect(rankFowls([a, b, c], statsOf, 'win_rate').map((f) => f.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('drops under-qualified birds for win_rate_min', () => {
    const ranked = rankFowls([a, b, c], statsOf, 'win_rate_min', 4);
    expect(ranked[0].name).toBe('Bravo');
    expect(ranked.map((f) => f.name)).toEqual(['Bravo', 'Alpha', 'Charlie']);
    expect(isEligible(table.Alpha, 'win_rate_min', 4)).toBe(false);
  });

  it('never puts an undecided chicken first', () => {
    const ranked = rankFowls([c, a], statsOf, 'total_wins');
    expect(ranked[0].name).toBe('Alpha');
  });
});

describe('bestFowl', () => {
  const a = bird(1, 'Alpha');
  const c = bird(3, 'Charlie');
  const table: Record<string, RankingStats> = { Alpha: stats(3, 1), Charlie: stats(0, 0) };

  it('returns the ranked leader when eligible', () => {
    expect(bestFowl([a, c], (n) => table[n])?.name).toBe('Alpha');
  });

  it('returns null when nobody has a decided match', () => {
    const onlyUndecided: Record<string, RankingStats> = { Charlie: stats(0, 0) };
    expect(bestFowl([c], (n) => onlyUndecided[n])).toBeNull();
  });

  it('applies the minimum-matches rule', () => {
    const oneMatch: Record<string, RankingStats> = { Alpha: stats(1, 0) };
    expect(bestFowl([a], (n) => oneMatch[n], 'win_rate_min', 3)).toBeNull();
    expect(isEligible(oneMatch.Alpha, 'win_rate_min', 3)).toBe(false);
  });
});

describe('bestYearFor', () => {
  const m = (date: string, outcome: string): MatchRecord =>
    ({ id: 1, date, outcome, entry_name: 'Alpha', breed: '', opponent: '', location: '', type: '', status: 'Verified' }) as MatchRecord;

  it('picks the year with the most wins', () => {
    const matches = [m('2024-03-01', 'Win'), m('2024-05-01', 'Win'), m('2025-01-01', 'Win'), m('2025-02-01', 'Loss')];
    expect(bestYearFor('Alpha', matches)).toBe('2024');
  });

  it('ignores other chickens and non-wins', () => {
    const matches = [{ ...m('2023-01-01', 'Loss'), entry_name: 'Other' }] as MatchRecord[];
    expect(bestYearFor('Alpha', matches)).toBeNull();
  });

  it('breaks ties toward the most recent year', () => {
    const matches = [m('2023-01-01', 'Win'), m('2024-01-01', 'Win')];
    expect(bestYearFor('Alpha', matches)).toBe('2024');
  });
});
