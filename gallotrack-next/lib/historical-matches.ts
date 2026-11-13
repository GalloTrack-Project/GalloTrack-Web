import { computeWinRate, type WinRateStats } from '@/lib/win-rate';
import type { MatchRecord } from '@/lib/types';

export interface HistoricalMatchGroup {
  key: string;
  entryName: string;
  strain: string;
  matches: MatchRecord[];
  sex: string | null;
}

function sexOf(match: MatchRecord): string | null {
  const value = String((match as MatchRecord & { sex?: string | null }).sex || '').trim();
  return value || null;
}

export function historicalGroupKey(entryName: string, strain: string): string {
  return `${entryName.trim().toLowerCase()}|||${strain.trim().toLowerCase()}`;
}

/**
 * ONE grouping rule for historical entries: trimmed case-insensitive entered
 * name AND the same strain. Never crosses into registered-chicken records.
 */
export function groupUnlinkedMatches(matches: MatchRecord[]): HistoricalMatchGroup[] {
  const groups = new Map<string, HistoricalMatchGroup>();
  for (const match of matches) {
    if (match.fowl_id != null) continue;
    const entryName = (match.entry_name || '').trim();
    const strain = (match.breed || '').trim();
    if (!entryName) continue;
    const key = historicalGroupKey(entryName, strain);
    const existing = groups.get(key);
    if (existing) {
      existing.matches.push(match);
      existing.sex = existing.sex ?? sexOf(match);
    } else {
      groups.set(key, {
        key,
        entryName,
        strain,
        matches: [match],
        sex: sexOf(match),
      });
    }
  }
  return Array.from(groups.values()).sort(
    (a, b) =>
      a.entryName.localeCompare(b.entryName) ||
      a.strain.localeCompare(b.strain) ||
      a.key.localeCompare(b.key),
  );
}

export function computeHistoricalGroupStats(group: HistoricalMatchGroup): WinRateStats {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const match of group.matches) {
    const outcome = (match.outcome || '').trim().toLowerCase();
    if (outcome === 'win') wins += 1;
    else if (outcome === 'loss') losses += 1;
    else if (outcome === 'draw') draws += 1;
  }
  return computeWinRate(wins, losses, draws);
}

export function historicalGroupSexLabel(group: HistoricalMatchGroup): string {
  return group.sex ? group.sex : 'Not recorded';
}
