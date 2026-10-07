import type { MatchRecord } from './types';

/**
 * Standard Win Rate Rule across GalloTrack:
 * 1. Win rate = wins ÷ (wins + losses). Draws and no-contests are EXCLUDED from the denominator.
 * 2. Group totals are computed by summing decided matches (total wins ÷ total decided).
 *    Never average individual percentages!
 * 3. Chickens with 0 decided matches have NO win rate (null), rendered as "No fights" (never 0%).
 * 4. Sample size under 3 decided matches is flagged as "low sample" and rendered in neutral gray.
 * 5. Percentages are rounded to the nearest whole number.
 */

export interface WinRateStats {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  decided: number;
  winRate: number | null; // null if decided === 0
  isLowSample: boolean; // decided > 0 && decided < 3
  sampleNote?: string; // '1 match' or 'low sample'
}

export function computeWinRate(wins: number, losses: number, draws = 0): WinRateStats {
  const safeWins = Math.max(0, Number(wins) || 0);
  const safeLosses = Math.max(0, Number(losses) || 0);
  const safeDraws = Math.max(0, Number(draws) || 0);
  const decided = safeWins + safeLosses;
  const total = decided + safeDraws;
  const winRate = decided > 0 ? Math.round((safeWins / decided) * 100) : null;
  const isLowSample = decided > 0 && decided < 3;
  const sampleNote = isLowSample ? (decided === 1 ? '1 match' : 'low sample') : undefined;

  return {
    wins: safeWins,
    losses: safeLosses,
    draws: safeDraws,
    total,
    decided,
    winRate,
    isLowSample,
    sampleNote,
  };
}

/**
 * Combined group win rate from individual records.
 * Sums all wins and losses across members and computes total wins ÷ total decided.
 * Strictly avoids averaging individual percentages.
 */
export function combineWinRates(
  records: Array<{ wins?: number; losses?: number; draws?: number } | undefined | null>,
): WinRateStats & { foughtCount: number } {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let foughtCount = 0;

  for (const r of records) {
    if (!r) continue;
    const w = Math.max(0, Number(r.wins) || 0);
    const l = Math.max(0, Number(r.losses) || 0);
    const d = Math.max(0, Number(r.draws) || 0);
    wins += w;
    losses += l;
    draws += d;
    if (w + l + d > 0) {
      foughtCount++;
    }
  }

  const base = computeWinRate(wins, losses, draws);
  return {
    ...base,
    foughtCount,
  };
}

class CaseInsensitiveMatchStatsMap extends Map<
  string,
  WinRateStats & { matches: MatchRecord[]; lastMatchDate: string | null }
> {
  override get(key: string) {
    const norm = (key || '').trim().toLowerCase();
    return super.get(norm);
  }
  override has(key: string) {
    const norm = (key || '').trim().toLowerCase();
    return super.has(norm);
  }
}

/**
 * Builds an in-memory lookup map of chicken name -> WinRateStats + matches list
 * from a list of match records in a single O(N) pass without N+1 queries.
 */
export function buildChickenMatchStatsMap(matches: MatchRecord[]): Map<
  string,
  WinRateStats & { matches: MatchRecord[]; lastMatchDate: string | null }
> {
  const temp = new Map<
    string,
    { wins: number; losses: number; draws: number; matches: MatchRecord[]; lastMatchDate: string | null }
  >();

  for (const m of matches) {
    const rawName = (m.entry_name || '').trim().toLowerCase();
    if (!rawName) continue;

    let entry = temp.get(rawName);
    if (!entry) {
      entry = { wins: 0, losses: 0, draws: 0, matches: [], lastMatchDate: null };
      temp.set(rawName, entry);
    }

    entry.matches.push(m);
    const outcome = (m.outcome || '').trim().toLowerCase();
    if (outcome === 'win') entry.wins++;
    else if (outcome === 'loss') entry.losses++;
    else if (outcome === 'draw') entry.draws++;

    if (m.date) {
      if (!entry.lastMatchDate || m.date > entry.lastMatchDate) {
        entry.lastMatchDate = m.date;
      }
    }
  }

  const result = new CaseInsensitiveMatchStatsMap();

  temp.forEach((entry, key) => {
    const stats = computeWinRate(entry.wins, entry.losses, entry.draws);
    result.set(key, {
      ...stats,
      matches: entry.matches,
      lastMatchDate: entry.lastMatchDate,
    });
  });

  return result;
}

/**
 * Visual styling classes for win rate badges / pills:
 * - 60%+ : Green (Emerald)
 * - 40–59% : Amber
 * - <40% : Red (Rose)
 * - Low sample (<3 matches) : Neutral gray
 * - No fights (0 matches) : Muted
 */
export function getWinRatePillClasses(stats: {
  winRate: number | null;
  decided: number;
  isLowSample?: boolean;
}): string {
  if (stats.decided === 0 || stats.winRate === null) {
    return 'bg-muted/50 text-muted-foreground border-border';
  }
  if (stats.decided < 3) {
    return 'bg-slate-100 dark:bg-muted text-slate-700 dark:text-slate-300 border-slate-300 dark:border-border';
  }
  if (stats.winRate >= 60) {
    return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  }
  if (stats.winRate >= 40) {
    return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
  }
  return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800';
}

export function getWinRateTextColor(stats: {
  winRate: number | null;
  decided: number;
}): string {
  if (stats.decided === 0 || stats.winRate === null) {
    return 'text-muted-foreground';
  }
  if (stats.decided < 3) {
    return 'text-slate-600 dark:text-slate-400';
  }
  if (stats.winRate >= 60) {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (stats.winRate >= 40) {
    return 'text-amber-600 dark:text-amber-400';
  }
  return 'text-rose-600 dark:text-rose-400';
}
