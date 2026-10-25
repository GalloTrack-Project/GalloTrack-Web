import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { MatchRecord } from '@/lib/types';
import { useFowlAnalytics } from './use-fowl-analytics';

const now = new Date();
const currentMonthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

const match = (id: number, breed: string, outcome: string): MatchRecord => ({
  id,
  date: currentMonthDate,
  entry_name: `Bird ${id}`,
  breed,
  opponent: 'Opponent',
  location: 'Arena',
  type: 'Derby',
  outcome,
  status: 'Verified',
});

describe('useFowlAnalytics — Bloodline Win Ratios', () => {
  it('uses win share for doughnut slices and keeps exact per-strain records', () => {
    const matches: MatchRecord[] = [
      match(1, 'Lemon', 'Win'),
      match(2, 'Lemon', 'Win'),
      match(3, 'Lemon', 'Loss'),
      match(4, 'Hatch', 'Win'),
      match(5, 'Hatch', 'Loss'),
      match(6, 'Hatch', 'Draw'),
    ];

    const { result } = renderHook(() =>
      useFowlAnalytics([], matches, 'all', Date.now(), [])
    );

    const data = result.current.crossbreedChartData;

    expect(data.labels).toEqual(['Lemon Cross', 'Hatch Cross']);
    expect(data.wins).toEqual([2, 1]);
    expect(data.losses).toEqual([1, 1]);
    expect(data.totals).toEqual([3, 3]);
    expect(data.winRates).toEqual([67, 50]);
    expect(data.data).toEqual([66.7, 33.3]);
    expect(data.data.reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 1);

    // Months with no logged matches must not be reported as a 0% win rate.
    expect(result.current.trendWinRate.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(result.current.trendWinRate[5]).toBe(60);
  });
});
