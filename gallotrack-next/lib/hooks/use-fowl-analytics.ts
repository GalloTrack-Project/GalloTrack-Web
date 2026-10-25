'use client';
import { useMemo } from 'react';
import {
  calculatePairingStats,
  dateKeyToMs,
  formatShortDate,
  getMilestoneInfo as getMilestoneInfoHelper,
  winRateOf,
  type DateRangeCustom,
  type DateRangePreset,
} from '@/lib/helpers';
import type { FowlRecord, MatchRecord, PairingAnalytics } from '@/lib/types';

export interface CrossbreedChartData {
  labels: string[];
  /** Share of all decided wins, as a percentage (the doughnut slice size). */
  data: number[];
  /** Each strain's own win rate (wins / decided fights). */
  winRates: number[];
  wins: number[];
  losses: number[];
  totals: number[];
  hasData: boolean;
}

export interface FowlAnalytics {
  pairingAnalytics: PairingAnalytics;
  crossbreedChartData: CrossbreedChartData;
  winRatePct: number;
  winsCount: number;
  lossesCount: number;
  monthLabels: string[];
  matchesByMonth: number[];
  winsByMonth: number[];
  activeSpark: number[];
  /** Null means no matches were logged that month, so no honest win rate exists. */
  trendWinRate: (number | null)[];
  upcomingMilestones: { fowl: FowlRecord; info: NonNullable<ReturnType<typeof getMilestoneInfoHelper>> }[];
  dateRangeLabel: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function monthIndex(s?: string): number {
  if (!s) return -1;
  const d = new Date(s);
  if (isNaN(d.getTime())) return -1;
  const now = new Date();
  const diff = (now.getFullYear() * 12 + now.getMonth()) - (d.getFullYear() * 12 + d.getMonth());
  const idx = 5 - diff;
  return (idx >= 0 && idx < 6) ? idx : -1;
}

export function useFowlAnalytics(
  fowls: FowlRecord[],
  matchHistory: MatchRecord[],
  dateRangePreset: DateRangePreset,
  nowMs: number,
  activeFowls: FowlRecord[],
  dateRangeCustom?: DateRangeCustom,
): FowlAnalytics {
  return useMemo(() => {
    const pairingAnalytics = calculatePairingStats(fowls, matchHistory);

    const crossbreedChartData = (() => {
      const breedStats: { [key: string]: { wins: number; losses: number; total: number } } = {};
      matchHistory.forEach((match) => {
        const breedKey = `${match.breed || 'Unknown'} Cross`;
        if (!breedStats[breedKey]) breedStats[breedKey] = { wins: 0, losses: 0, total: 0 };
        breedStats[breedKey].total += 1;
        const outcome = (match.outcome || '').toLowerCase();
        if (outcome === 'win') breedStats[breedKey].wins += 1;
        if (outcome === 'loss') breedStats[breedKey].losses += 1;
      });
      const labels = Object.keys(breedStats);
      const wins = labels.map((label) => breedStats[label].wins);
      const losses = labels.map((label) => breedStats[label].losses);
      const totals = labels.map((label) => breedStats[label].total);
      const winRates = labels.map((label) => winRateOf(breedStats[label].wins, breedStats[label].losses));

      // Doughnut slice size = share of all decided wins per strain, matching
      // the documented "Win share per strain = wins / total decided wins" rule.
      const totalWins = wins.reduce((sum, n) => sum + n, 0);
      const data = labels.map((_, i) =>
        totalWins > 0 ? Math.round((wins[i] / totalWins) * 1000) / 10 : 0
      );
      const hasData = labels.length > 0 && matchHistory.length > 0 && totalWins > 0;

      return {
        labels: hasData ? labels : [],
        data: hasData ? data : [],
        winRates: hasData ? winRates : [],
        wins: hasData ? wins : [],
        losses: hasData ? losses : [],
        totals: hasData ? totals : [],
        hasData,
      };
    })();

    const winsCount = matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
    const lossesCount = matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'loss').length;
    const winRatePct = winRateOf(winsCount, lossesCount);

    const monthLabels = (() => {
      const now = new Date();
      const out: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push(d.toLocaleString('en-US', { month: 'short' }));
      }
      return out;
    })();

    const matchesByMonth = (() => {
      const arr = new Array(6).fill(0);
      matchHistory.forEach(m => { const i = monthIndex(m.date); if (i >= 0) arr[i]++; });
      return arr;
    })();

    const winsByMonth = (() => {
      const arr = new Array(6).fill(0);
      matchHistory.forEach(m => { const i = monthIndex(m.date); if (i >= 0 && m.outcome && m.outcome.toLowerCase() === 'win') arr[i]++; });
      return arr;
    })();

    const lossesByMonth = (() => {
      const arr = new Array(6).fill(0);
      matchHistory.forEach(m => { const i = monthIndex(m.date); if (i >= 0 && m.outcome && m.outcome.toLowerCase() === 'loss') arr[i]++; });
      return arr;
    })();

    const activeSpark = (() => {
      const arr = new Array(6).fill(0);
      const now = new Date();
      fowls.forEach((f) => {
        if (f.status === 'Active' || !f.status || f.status === 'active') {
          if (!f.created_at) {
            arr[0]++;
            return;
          }
          const d = new Date(f.created_at);
          if (isNaN(d.getTime())) {
            arr[0]++;
            return;
          }
          const diff = (now.getFullYear() * 12 + now.getMonth()) - (d.getFullYear() * 12 + d.getMonth());
          const idx = 5 - diff;
          if (idx < 0) {
            // Created before the 6-month window: belongs to initial baseline
            arr[0]++;
          } else if (idx < 6) {
            arr[idx]++;
          } else {
            arr[5]++;
          }
        }
      });
      for (let i = 1; i < 6; i++) arr[i] += arr[i - 1];
      return arr;
    })();

    const trendWinRate = monthLabels.map((_, i) =>
      matchesByMonth[i] > 0 ? winRateOf(winsByMonth[i], lossesByMonth[i]) : null
    );

    const upcomingMilestones = activeFowls
      .map((f) => ({ fowl: f, info: getMilestoneInfoHelper(f.birthdate, f.gender) }))
      .filter((x): x is { fowl: FowlRecord; info: NonNullable<ReturnType<typeof getMilestoneInfoHelper>> } => !!x.info)
      .sort((a, b) => (a.info.next?.daysUntil ?? 999999) - (b.info.next?.daysUntil ?? 999999));

    const dateRangeLabel = (() => {
      const now = new Date(nowMs);
      if (dateRangePreset === 'today') return `${formatShortDate(nowMs)} - ${formatShortDate(nowMs)}`;
      if (dateRangePreset === '7d') return `${formatShortDate(nowMs - 7 * DAY_MS)} - ${formatShortDate(nowMs)}`;
      if (dateRangePreset === '30d') return `${formatShortDate(nowMs - 30 * DAY_MS)} - ${formatShortDate(nowMs)}`;
      if (dateRangePreset === 'month') return `${formatShortDate(new Date(now.getFullYear(), now.getMonth(), 1).getTime())} - ${formatShortDate(nowMs)}`;
      if (dateRangePreset === '3m') return `${formatShortDate(nowMs - 90 * DAY_MS)} - ${formatShortDate(nowMs)}`;
      if (dateRangePreset === 'custom' && dateRangeCustom) return `${formatShortDate(dateKeyToMs(dateRangeCustom.start))} - ${formatShortDate(dateKeyToMs(dateRangeCustom.end))}`;
      return 'All Time';
    })();

    return {
      pairingAnalytics,
      crossbreedChartData,
      winRatePct,
      winsCount,
      lossesCount,
      monthLabels,
      matchesByMonth,
      winsByMonth,
      activeSpark,
      trendWinRate,
      upcomingMilestones,
      dateRangeLabel,
    };
  }, [fowls, matchHistory, dateRangePreset, nowMs, activeFowls, dateRangeCustom]);
}
