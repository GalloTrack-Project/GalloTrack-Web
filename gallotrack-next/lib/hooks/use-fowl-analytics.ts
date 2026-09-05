'use client';
import { useMemo } from 'react';
import {
  calculatePairingStats,
  formatShortDate,
  getMilestoneInfo as getMilestoneInfoHelper,
} from '@/lib/helpers';
import type { FowlRecord, MatchRecord, PairingAnalytics } from '@/lib/types';

export interface FowlAnalytics {
  pairingAnalytics: PairingAnalytics;
  crossbreedChartData: { labels: string[]; data: number[]; hasData: boolean };
  winRatePct: number;
  winsCount: number;
  lossesCount: number;
  monthLabels: string[];
  matchesByMonth: number[];
  winsByMonth: number[];
  activeSpark: number[];
  trendWinRate: number[];
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
  dateRangePreset: '7d' | '30d' | 'month' | '3m' | 'all',
  nowMs: number,
  activeFowls: FowlRecord[],
): FowlAnalytics {
  return useMemo(() => {
    const pairingAnalytics = calculatePairingStats(fowls, matchHistory);

    const crossbreedChartData = (() => {
      const breedStats: { [key: string]: { wins: number; total: number } } = {};
      matchHistory.forEach((match) => {
        const breedKey = `${match.breed || 'Unknown'} Cross`;
        if (!breedStats[breedKey]) breedStats[breedKey] = { wins: 0, total: 0 };
        breedStats[breedKey].total += 1;
        if (match.outcome && match.outcome.toLowerCase() === 'win') breedStats[breedKey].wins += 1;
      });
      const labels = Object.keys(breedStats);
      const data = labels.map(label => {
        const stats = breedStats[label];
        return stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
      });
      const hasData = labels.length > 0 && matchHistory.length > 0;
      return { labels: hasData ? labels : [], data: hasData ? data : [], hasData };
    })();

    const winRatePct = matchHistory.length > 0
      ? Math.round((matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length / matchHistory.length) * 100)
      : 0;
    const winsCount = matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
    const lossesCount = matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'loss').length;

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

    const activeSpark = (() => {
      const arr = new Array(6).fill(0);
      fowls.forEach(f => {
        if (f.status === 'Active' || !f.status || f.status === 'active') {
          const i = monthIndex(f.created_at);
          if (i >= 0) arr[i]++;
        }
      });
      for (let i = 1; i < 6; i++) arr[i] += arr[i - 1];
      return arr;
    })();

    const trendWinRate = monthLabels.map((_, i) => matchesByMonth[i] > 0 ? Math.round((winsByMonth[i] / matchesByMonth[i]) * 100) : 0);

    const upcomingMilestones = activeFowls
      .map((f) => ({ fowl: f, info: getMilestoneInfoHelper(f.birthdate, f.gender) }))
      .filter((x): x is { fowl: FowlRecord; info: NonNullable<ReturnType<typeof getMilestoneInfoHelper>> } => !!x.info)
      .sort((a, b) => (a.info.next?.daysUntil ?? 999999) - (b.info.next?.daysUntil ?? 999999));

    const dateRangeLabel = (() => {
      const now = new Date(nowMs);
      if (dateRangePreset === '7d') return `${formatShortDate(nowMs - 7 * DAY_MS)} - ${formatShortDate(nowMs)}`;
      if (dateRangePreset === '30d') return `${formatShortDate(nowMs - 30 * DAY_MS)} - ${formatShortDate(nowMs)}`;
      if (dateRangePreset === 'month') return `${formatShortDate(new Date(now.getFullYear(), now.getMonth(), 1).getTime())} - ${formatShortDate(nowMs)}`;
      if (dateRangePreset === '3m') return `${formatShortDate(nowMs - 90 * DAY_MS)} - ${formatShortDate(nowMs)}`;
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
  }, [fowls, matchHistory, dateRangePreset, nowMs, activeFowls]);
}
