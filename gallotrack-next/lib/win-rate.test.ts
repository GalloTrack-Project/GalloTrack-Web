import { describe, it, expect } from 'vitest';
import type { MatchRecord } from '@/lib/types';
import {
  computeWinRate,
  combineWinRates,
  buildChickenMatchStatsMap,
  getWinRatePillClasses,
  computeClassMatchStats,
} from './win-rate';

const makeMatch = (
  entry_name: string,
  outcome: 'Win' | 'Loss' | 'Draw' | 'Cancelled' | string,
  fowl_id: number | null = 1,
): MatchRecord =>
  ({
    id: Math.floor(Math.random() * 100000),
    date: '2026-05-01',
    entry_name,
    outcome,
    type: 'Derby',
    status: 'Completed',
    fowl_id,
  }) as MatchRecord;

describe('lib/win-rate', () => {
  describe('computeWinRate', () => {
    it('calculates win rate as wins / (wins + losses)', () => {
      const stats = computeWinRate(4, 1);
      expect(stats.wins).toBe(4);
      expect(stats.losses).toBe(1);
      expect(stats.decided).toBe(5);
      expect(stats.winRate).toBe(80);
      expect(stats.isLowSample).toBe(false);
    });

    it('strictly excludes draws from the win rate denominator', () => {
      // 4 wins, 1 loss, 2 draws: decided = 5, winRate = 4 / 5 = 80% (draws excluded)
      const stats = computeWinRate(4, 1, 2);
      expect(stats.wins).toBe(4);
      expect(stats.losses).toBe(1);
      expect(stats.draws).toBe(2);
      expect(stats.total).toBe(7);
      expect(stats.decided).toBe(5);
      expect(stats.winRate).toBe(80);
    });

    it('returns winRate null when there are no decided matches', () => {
      const noFights = computeWinRate(0, 0, 0);
      expect(noFights.winRate).toBeNull();
      expect(noFights.total).toBe(0);
      expect(noFights.decided).toBe(0);

      const onlyDraws = computeWinRate(0, 0, 3);
      expect(onlyDraws.winRate).toBeNull();
      expect(onlyDraws.draws).toBe(3);
      expect(onlyDraws.decided).toBe(0);
    });

    it('flags low sample (< 3 matches) and sets appropriate sample note', () => {
      const oneMatch = computeWinRate(1, 0, 0);
      expect(oneMatch.winRate).toBe(100);
      expect(oneMatch.isLowSample).toBe(true);
      expect(oneMatch.sampleNote).toBe('1 match');

      const twoMatches = computeWinRate(1, 1, 0);
      expect(twoMatches.winRate).toBe(50);
      expect(twoMatches.isLowSample).toBe(true);
      expect(twoMatches.sampleNote).toBe('low sample');

      const threeMatches = computeWinRate(2, 1, 0);
      expect(threeMatches.winRate).toBe(67);
      expect(threeMatches.isLowSample).toBe(false);
      expect(threeMatches.sampleNote).toBeUndefined();
    });

    it('rounds to the nearest whole percentage', () => {
      // 2 wins out of 3 = 66.666...% -> 67%
      expect(computeWinRate(2, 1).winRate).toBe(67);
      // 1 win out of 3 = 33.333...% -> 33%
      expect(computeWinRate(1, 2).winRate).toBe(33);
    });
  });

  describe('combineWinRates', () => {
    it('aggregates total wins and total decided matches without averaging individual percentages', () => {
      // Chicken A: 1W-0L = 100%
      // Chicken B: 3W-7L = 30%
      // Simple average would be (100 + 30) / 2 = 65% (WRONG)
      // Combined total: (1 + 3) / (1 + 10) = 4 / 11 = 36.36% -> 36% (CORRECT)
      const statsA = computeWinRate(1, 0);
      const statsB = computeWinRate(3, 7);

      const combined = combineWinRates([statsA, statsB]);
      expect(combined.wins).toBe(4);
      expect(combined.losses).toBe(7);
      expect(combined.decided).toBe(11);
      expect(combined.winRate).toBe(36);
      expect(combined.foughtCount).toBe(2);
    });

    it('correctly tracks foughtCount when some chickens have 0 fights', () => {
      const statsA = computeWinRate(2, 1);
      const statsB = computeWinRate(0, 0);
      const statsC = computeWinRate(1, 0);

      const combined = combineWinRates([statsA, statsB, statsC]);
      expect(combined.foughtCount).toBe(2);
      expect(combined.wins).toBe(3);
      expect(combined.losses).toBe(1);
      expect(combined.winRate).toBe(75);
    });

    it('returns null winRate when no items have matches', () => {
      const combined = combineWinRates([computeWinRate(0, 0), computeWinRate(0, 0)]);
      expect(combined.winRate).toBeNull();
      expect(combined.foughtCount).toBe(0);
      expect(combined.decided).toBe(0);
    });
  });

  describe('buildChickenMatchStatsMap', () => {
    it('indexes matches by chicken name case-insensitively and computes accurate records', () => {
      const fowls = [
        { id: 10, name: 'Sweater Red Storm' },
        { id: 20, name: 'Hatch Crown' },
      ];
      const matches: MatchRecord[] = [
        makeMatch('Sweater Red Storm', 'Win', 10),
        makeMatch('sweater red storm', 'Win', 10),
        makeMatch('Sweater Red Storm ', 'Loss', 10),
        makeMatch('Hatch Crown', 'Draw', 20),
      ];

      const map = buildChickenMatchStatsMap(matches, fowls);

      const stormStats = map.get('Sweater Red Storm');
      expect(stormStats).toBeDefined();
      expect(stormStats?.wins).toBe(2);
      expect(stormStats?.losses).toBe(1);
      expect(stormStats?.decided).toBe(3);
      expect(stormStats?.winRate).toBe(67);

      const crownStats = map.get('Hatch Crown');
      expect(crownStats).toBeDefined();
      expect(crownStats?.draws).toBe(1);
      expect(crownStats?.decided).toBe(0);
      expect(crownStats?.winRate).toBeNull();
    });

    it('NEVER attributes orphan matches (fowl_id: null) to a newly registered chicken of the same name', () => {
      // Historical orphan match with fowl_id: null
      const orphanMatch = makeMatch('Iron Lemon', 'Win', null);
      // Newly registered chicken with the exact same name
      const newChicken = { id: 99, name: 'Iron Lemon', bird_code: 'LEM-99' };

      const map = buildChickenMatchStatsMap([orphanMatch], [newChicken]);

      const newChickenStatsByName = map.get('Iron Lemon');
      const newChickenStatsById = map.get('99');

      // The new chicken must have 0 fights and null win rate
      expect(newChickenStatsByName?.wins).toBe(0);
      expect(newChickenStatsByName?.decided).toBe(0);
      expect(newChickenStatsByName?.winRate).toBeNull();
      expect(newChickenStatsByName?.matches).toHaveLength(0);

      expect(newChickenStatsById?.wins).toBe(0);
      expect(newChickenStatsById?.decided).toBe(0);
      expect(newChickenStatsById?.winRate).toBeNull();
      expect(newChickenStatsById?.matches).toHaveLength(0);
    });
  });

  describe('getWinRatePillClasses', () => {
    it('returns neutral gray for low sample sizes (< 3 matches)', () => {
      const lowSampleHighWin = computeWinRate(1, 0); // 100%, 1 match
      const classes = getWinRatePillClasses(lowSampleHighWin);
      expect(classes).toContain('text-slate-700');
    });

    it('returns green for >= 60% with adequate sample', () => {
      const adequateHighWin = computeWinRate(3, 1); // 75%, 4 matches
      const classes = getWinRatePillClasses(adequateHighWin);
      expect(classes).toContain('text-emerald-700');
    });

    it('returns amber for 40-59% with adequate sample', () => {
      const midWin = computeWinRate(2, 2); // 50%, 4 matches
      const classes = getWinRatePillClasses(midWin);
      expect(classes).toContain('text-amber-700');
    });

    it('returns red for < 40% with adequate sample', () => {
      const lowWin = computeWinRate(1, 3); // 25%, 4 matches
      const classes = getWinRatePillClasses(lowWin);
      expect(classes).toContain('text-rose-700');
    });
  });

  describe('Real Dataset Reconciliation', () => {
    // Current user's 5 chickens and 5 matches
    const testFowls = [
      { id: 1, name: 'Sweater Red Storm' },
      { id: 2, name: 'Iron Lemon' },
      { id: 3, name: 'Hatch Crown' },
      { id: 4, name: 'Hatch Mountain' },
      { id: 5, name: 'Hatch Silver' },
    ];
    const testMatches: MatchRecord[] = [
      makeMatch('Sweater Red Storm', 'Win', 1),
      makeMatch('Iron Lemon', 'Win', 2),
      makeMatch('Hatch Crown', 'Win', 3),
      makeMatch('Hatch Mountain', 'Win', 4),
      makeMatch('Hatch Silver', 'Loss', 5),
    ];

    it('reconciles 5 chickens with 4W-1L (80%) overall win rate', () => {
      const map = buildChickenMatchStatsMap(testMatches, testFowls);
      expect(map.get('Sweater Red Storm')?.winRate).toBe(100);
      expect(map.get('Iron Lemon')?.winRate).toBe(100);
      expect(map.get('Hatch Crown')?.winRate).toBe(100);
      expect(map.get('Hatch Mountain')?.winRate).toBe(100);
      expect(map.get('Hatch Silver')?.winRate).toBe(0);

      const allStats = testFowls.map((f) => map.get(f.name)!);
      const overall = combineWinRates(allStats);
      expect(overall.wins).toBe(4);
      expect(overall.losses).toBe(1);
      expect(overall.decided).toBe(5);
      expect(overall.winRate).toBe(80);
      expect(overall.foughtCount).toBe(5);
    });

    it('reconciles Sire True Hatch offspring: 2W-1L = 67%', () => {
      const map = buildChickenMatchStatsMap(testMatches, testFowls);
      const trueHatchOffspring = ['Hatch Mountain', 'Hatch Crown', 'Hatch Silver'].map(
        (name) => map.get(name)!
      );

      const groupTotal = combineWinRates(trueHatchOffspring);
      expect(groupTotal.wins).toBe(2);
      expect(groupTotal.losses).toBe(1);
      expect(groupTotal.decided).toBe(3);
      expect(groupTotal.winRate).toBe(67);
      expect(groupTotal.foughtCount).toBe(3);
    });

    it('reconciles Sire Titan Sweater offspring: 1W-0L = 100%', () => {
      const map = buildChickenMatchStatsMap(testMatches, testFowls);
      const titanSweaterOffspring = ['Sweater Red Storm'].map((name) => map.get(name)!);

      const groupTotal = combineWinRates(titanSweaterOffspring);
      expect(groupTotal.wins).toBe(1);
      expect(groupTotal.losses).toBe(0);
      expect(groupTotal.decided).toBe(1);
      expect(groupTotal.winRate).toBe(100);
      expect(groupTotal.foughtCount).toBe(1);
    });
  });

  describe('computeClassMatchStats', () => {
    it('groups matches by Cock, Stag, Open, and unknown custom classes without dropping or miscounting', () => {
      const matches: MatchRecord[] = [
        { ...makeMatch('Bird A', 'Win'), age_category: 'Cock' },
        { ...makeMatch('Bird A', 'Loss'), age_category: 'Cock' },
        { ...makeMatch('Bird B', 'Win'), age_category: 'Stag' },
        { ...makeMatch('Bird B', 'Draw'), age_category: 'Stag' },
        { ...makeMatch('Bird C', 'Win'), age_category: 'Open' },
        { ...makeMatch('Bird C', 'Win'), age_category: 'Open' },
        { ...makeMatch('Bird C', 'Loss'), age_category: 'Open' },
        { ...makeMatch('Bird D', 'Win'), age_category: 'Special Derby' },
      ];

      const byClass = computeClassMatchStats(matches);

      // Cock: 1W - 1L = 50%
      expect(byClass.Cock).toBeDefined();
      expect(byClass.Cock.wins).toBe(1);
      expect(byClass.Cock.losses).toBe(1);
      expect(byClass.Cock.decided).toBe(2);
      expect(byClass.Cock.winRate).toBe(50);
      expect(byClass.Cock.matches).toHaveLength(2);

      // Stag: 1W - 0L - 1D = 100% (draws excluded from denominator)
      expect(byClass.Stag).toBeDefined();
      expect(byClass.Stag.wins).toBe(1);
      expect(byClass.Stag.losses).toBe(0);
      expect(byClass.Stag.draws).toBe(1);
      expect(byClass.Stag.decided).toBe(1);
      expect(byClass.Stag.winRate).toBe(100);
      expect(byClass.Stag.matches).toHaveLength(2);

      // Open: 2W - 1L = 67%
      expect(byClass.Open).toBeDefined();
      expect(byClass.Open.wins).toBe(2);
      expect(byClass.Open.losses).toBe(1);
      expect(byClass.Open.decided).toBe(3);
      expect(byClass.Open.winRate).toBe(67);
      expect(byClass.Open.matches).toHaveLength(3);

      // Special Derby (unknown/custom class): 1W - 0L = 100%
      expect(byClass['Special Derby']).toBeDefined();
      expect(byClass['Special Derby'].wins).toBe(1);
      expect(byClass['Special Derby'].decided).toBe(1);
      expect(byClass['Special Derby'].winRate).toBe(100);
      expect(byClass['Special Derby'].matches).toHaveLength(1);

      // Total matches match fixture
      const totalMatchesCount = Object.values(byClass).reduce((acc, g) => acc + g.matches.length, 0);
      expect(totalMatchesCount).toBe(matches.length);
    });

    it('always provides Cock, Stag, and Open groups even when dataset is empty', () => {
      const byClass = computeClassMatchStats([]);
      expect(byClass.Cock).toBeDefined();
      expect(byClass.Cock.total).toBe(0);
      expect(byClass.Cock.winRate).toBeNull();

      expect(byClass.Stag).toBeDefined();
      expect(byClass.Stag.total).toBe(0);
      expect(byClass.Stag.winRate).toBeNull();

      expect(byClass.Open).toBeDefined();
      expect(byClass.Open.total).toBe(0);
      expect(byClass.Open.winRate).toBeNull();
    });
  });
});

