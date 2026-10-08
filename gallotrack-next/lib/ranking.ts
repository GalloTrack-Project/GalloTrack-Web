import type { FowlRecord, MatchRecord } from '@/lib/types';

/**
 * Settings-driven ranking for the "Best" label and ranked offspring lists.
 * The metric comes from `user_settings.ranking_metric` (see lib/settings.ts):
 *   total_wins   — most wins (approved default)
 *   win_rate     — best win percentage among decided matches
 *   win_rate_min — win percentage, but only chickens with at least
 *                  `ranking_min_matches` decided matches are eligible
 * Every metric keeps the same base eligibility: at least one decided match.
 */

import { compareBirdCodesNatural } from './bird-code';

export type RankingMetric = 'total_wins' | 'win_rate' | 'win_rate_min';

export interface RankingStats {
  total: number;
  wins: number;
  losses: number;
  decided: number;
  winRate: number;
}

export type StatsOf = (name: string) => RankingStats;

export function isEligible(
  stats: RankingStats,
  metric: RankingMetric,
  minMatches: number,
): boolean {
  if (stats.decided < 1) return false;
  if (metric === 'win_rate_min' && stats.decided < Math.max(1, minMatches)) return false;
  return true;
}

/** Descending ranking; ineligible chickens always sink to the bottom in birth code order. */
export function rankFowls(
  children: FowlRecord[],
  statsOf: StatsOf,
  metric: RankingMetric = 'total_wins',
  minMatches = 1,
): FowlRecord[] {
  return [...children].sort((a, b) => {
    const sa = statsOf(a.name);
    const sb = statsOf(b.name);
    const ea = isEligible(sa, metric, minMatches);
    const eb = isEligible(sb, metric, minMatches);
    if (ea !== eb) return ea ? -1 : 1;
    if (ea) {
      if (metric === 'total_wins') {
        const diff = sb.wins - sa.wins;
        if (diff !== 0) return diff;
        if (sb.winRate !== sa.winRate) return sb.winRate - sa.winRate;
        if (sb.decided !== sa.decided) return sb.decided - sa.decided;
      } else {
        // 'win_rate' or 'win_rate_min': win rate desc, then decided matches desc
        if (sb.winRate !== sa.winRate) return sb.winRate - sa.winRate;
        if (sb.decided !== sa.decided) return sb.decided - sa.decided;
        if (sb.wins !== sa.wins) return sb.wins - sa.wins;
      }
    }
    // Tie-breaker (and order for unfought/ineligible chickens): birth code ascending (natural order)
    const codeA = a.birth_code || a.chicken_code || a.bird_code || '';
    const codeB = b.birth_code || b.chicken_code || b.bird_code || '';
    if (codeA && codeB) {
      const cmp = compareBirdCodesNatural(codeA, codeB);
      if (cmp !== 0) return cmp;
    } else if (codeA) {
      return -1;
    } else if (codeB) {
      return 1;
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) || a.id - b.id;
  });
}

/**
 * Ranked leader when it qualifies with at least 3 decided matches; otherwise null (no Best badge).
 * Highest win rate in group, with ties broken by the one with more matches.
 */
export function bestFowl(
  children: FowlRecord[],
  statsOf: StatsOf,
  metric: RankingMetric = 'win_rate',
  minMatches = 3,
): FowlRecord | null {
  const requiredMin = Math.max(3, minMatches);
  const eligible = children.filter((ch) => {
    const s = statsOf(ch.name);
    return isEligible(s, metric, requiredMin) && s.decided >= 3;
  });
  if (eligible.length === 0) return null;

  const ranked = rankFowls(eligible, statsOf, 'win_rate', requiredMin);
  return ranked[0] || null;
}

/** Year with the most wins for a chicken (ties → most recent year). */
export function bestYearFor(name: string, matches: MatchRecord[]): string | null {
  const key = name.trim().toLowerCase();
  const byYear = new Map<string, number>();
  for (const m of matches) {
    if ((m.entry_name || '').trim().toLowerCase() !== key) continue;
    if ((m.outcome || '').trim().toLowerCase() !== 'win') continue;
    const year = (m.date || '').slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    byYear.set(year, (byYear.get(year) || 0) + 1);
  }
  let bestYear: string | null = null;
  let bestCount = 0;
  for (const [year, count] of byYear) {
    if (count > bestCount || (count === bestCount && bestYear !== null && year > bestYear)) {
      bestYear = year;
      bestCount = count;
    }
  }
  return bestYear;
}
