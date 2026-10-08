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

  it('orders by win rate, then decided matches, then birth code natural order (3C family order)', () => {
    // 3C family:
    // 3C4 Hatch Mountain: 1 fight (1W-0L = 100%, Rooster)
    // 3C1 Hatch Thunder: 0 fights (Rooster)
    // 3C2 Hatch Storm: 0 fights (Rooster)
    // 3C3 Hatch Rose: 0 fights (Hen)
    const c1 = { id: 9, name: 'Hatch Thunder', gender: 'Rooster', bird_code: '3C1' } as FowlRecord;
    const c2 = { id: 10, name: 'Hatch Storm', gender: 'Rooster', bird_code: '3C2' } as FowlRecord;
    const c3 = { id: 12, name: 'Hatch Rose', gender: 'Hen', bird_code: '3C3' } as FowlRecord;
    const c4 = { id: 11, name: 'Hatch Mountain', gender: 'Rooster', bird_code: '3C4' } as FowlRecord;

    const statsTable: Record<string, RankingStats> = {
      'Hatch Thunder': stats(0, 0),
      'Hatch Storm': stats(0, 0),
      'Hatch Rose': stats(0, 0),
      'Hatch Mountain': stats(1, 0), // 100% win rate
    };

    // Pass in reverse/scrambled order: [c2, c1, c3, c4]
    const ranked = rankFowls([c2, c1, c3, c4], (n) => statsTable[n], 'win_rate');

    // Overall family ranked order: 3C4 (fought) first, then 3C1, 3C2, 3C3
    expect(ranked.map((f) => f.bird_code)).toEqual(['3C4', '3C1', '3C2', '3C3']);

    // Within Males group: 3C4 (fought), 3C1, 3C2
    const males = ranked.filter((f) => f.gender === 'Rooster');
    expect(males.map((f) => f.bird_code)).toEqual(['3C4', '3C1', '3C2']);

    // Within Females group: 3C3
    const females = ranked.filter((f) => f.gender === 'Hen');
    expect(females.map((f) => f.bird_code)).toEqual(['3C3']);
  });

  it('breaks ties between same win rate by decided matches count, then birth code', () => {
    const f1 = { id: 21, name: 'Fighter One', bird_code: '1A1' } as FowlRecord;
    const f2 = { id: 22, name: 'Fighter Two', bird_code: '1A2' } as FowlRecord;
    const f3 = { id: 23, name: 'Fighter Three', bird_code: '1A3' } as FowlRecord;

    const statsTable: Record<string, RankingStats> = {
      'Fighter One': stats(2, 0),   // 100% (2 matches)
      'Fighter Two': stats(4, 0),   // 100% (4 matches -> should come first)
      'Fighter Three': stats(2, 0), // 100% (2 matches -> tie with f1, f1 has 1A1 vs 1A3)
    };

    const ranked = rankFowls([f3, f1, f2], (n) => statsTable[n], 'win_rate');
    expect(ranked.map((f) => f.name)).toEqual(['Fighter Two', 'Fighter One', 'Fighter Three']);
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

  it('applies the minimum-matches rule (requires at least 3 matches)', () => {
    const twoMatches: Record<string, RankingStats> = { Alpha: stats(2, 0) };
    expect(bestFowl([a], (n) => twoMatches[n])).toBeNull();

    const threeMatches: Record<string, RankingStats> = { Alpha: stats(3, 0) };
    expect(bestFowl([a], (n) => threeMatches[n])?.name).toBe('Alpha');
  });

  it('breaks ties between equal win rates by the one with more matches', () => {
    const b = bird(2, 'Bravo');
    const table2: Record<string, RankingStats> = {
      Alpha: stats(3, 0), // 100%, 3 matches
      Bravo: stats(5, 0), // 100%, 5 matches -> should win
    };
    expect(bestFowl([a, b], (n) => table2[n])?.name).toBe('Bravo');
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
