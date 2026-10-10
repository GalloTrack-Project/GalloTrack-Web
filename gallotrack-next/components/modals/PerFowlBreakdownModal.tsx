'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3, Filter, ArrowUpDown } from 'lucide-react';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import { Modal } from '@/components/ui';
import { useUI } from '@/lib/contexts/ui-context';
import { formatBirdCodeForDisplay, resolveBirdCodes } from '@/lib/bird-code';
import { buildRegistryContext, roleOf, type RegistryRole } from '@/lib/registry-roles';
import {
  computeWinRate,
  combineWinRates,
  getWinRatePillClasses,
  type WinRateStats,
} from '@/lib/win-rate';
import WinRatePill from '@/components/match/WinRatePill';
import { formatShortDate, presetDateKeys, type DateRangePreset } from '@/lib/helpers';

interface Props {
  show: boolean;
  onClose: () => void;
  fowls?: FowlRecord[];
  matchHistory?: MatchRecord[];
  initialDatePreset?: DateRangePreset;
}

type SortOption = 'winrate' | 'matches' | 'name' | 'last_match';
type RoleFilter = 'all' | RegistryRole;

interface ChickenBreakdownRow {
  fowl: FowlRecord;
  stats: WinRateStats;
  matches: MatchRecord[];
  lastMatchDate: string | null;
  role: string;
}

export default function PerFowlBreakdownModal({
  show,
  onClose,
  fowls: propFowls = [],
  matchHistory: propMatches = [],
  initialDatePreset = 'all',
}: Props) {
  const uiContext = useUI();

  const fowls = propFowls;
  const matchHistory = propMatches;
  const birdCodes = useMemo(() => resolveBirdCodes(fowls), [fowls]);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [datePreset, setDatePreset] = useState<DateRangePreset>(initialDatePreset || 'all');
  const [sortBy, setSortBy] = useState<SortOption>('winrate');

  React.useEffect(() => {
    if (show && initialDatePreset) {
      setDatePreset(initialDatePreset);
    }
  }, [show, initialDatePreset]);

  const registryCtx = useMemo(() => buildRegistryContext(fowls), [fowls]);

  // Filter matches based on selected datePreset
  const filteredMatches = useMemo(() => {
    if (datePreset === 'all') return matchHistory;
    const nowMs = Date.now();
    const bounds = presetDateKeys(datePreset, nowMs);
    if (!bounds) return matchHistory;
    return matchHistory.filter((m) => {
      if (!m.date) return false;
      return m.date >= bounds.start && m.date <= bounds.end;
    });
  }, [matchHistory, datePreset]);

  // Compute breakdown for all chickens that have at least one match
  const chickenRows = useMemo(() => {
    // 1. Group matches by fowl entry_name
    const matchesByFowl = new Map<string, MatchRecord[]>();
    filteredMatches.forEach((m) => {
      const name = (m.entry_name || '').trim().toLowerCase();
      if (!name) return;
      const list = matchesByFowl.get(name) || [];
      list.push(m);
      matchesByFowl.set(name, list);
    });

    // 2. Map every registered fowl that has matches
    const rows: ChickenBreakdownRow[] = [];
    const matchedFowlNames = new Set<string>();

    fowls.forEach((f) => {
      const lower = f.name.trim().toLowerCase();
      const matches = matchesByFowl.get(lower);
      if (!matches || matches.length === 0) return;

      matchedFowlNames.add(lower);
      const wins = matches.filter((m) => (m.outcome || '').toLowerCase() === 'win').length;
      const losses = matches.filter((m) => (m.outcome || '').toLowerCase() === 'loss').length;
      const draws = matches.filter((m) => (m.outcome || '').toLowerCase() === 'draw').length;
      const stats = computeWinRate(wins, losses, draws);

      // find last match date
      let lastMatchDate: string | null = null;
      matches.forEach((m) => {
        if (m.date && (!lastMatchDate || m.date > lastMatchDate)) {
          lastMatchDate = m.date;
        }
      });

      const role = roleOf(f, registryCtx);
      rows.push({
        fowl: f,
        stats,
        matches,
        lastMatchDate,
        role,
      });
    });

    // 3. Also include any matches for unregistered chickens to guarantee 100% reconciliation
    matchesByFowl.forEach((matches, lowerName) => {
      if (matchedFowlNames.has(lowerName)) return;
      const wins = matches.filter((m) => (m.outcome || '').toLowerCase() === 'win').length;
      const losses = matches.filter((m) => (m.outcome || '').toLowerCase() === 'loss').length;
      const draws = matches.filter((m) => (m.outcome || '').toLowerCase() === 'draw').length;
      const stats = computeWinRate(wins, losses, draws);

      let lastMatchDate: string | null = null;
      matches.forEach((m) => {
        if (m.date && (!lastMatchDate || m.date > lastMatchDate)) {
          lastMatchDate = m.date;
        }
      });

      const synthFowl: FowlRecord = {
        id: -1 * Math.abs(matches[0]?.id || 9999),
        name: matches[0]?.entry_name || lowerName,
        breed: matches[0]?.breed || '—',
        gender: 'Rooster',
        status: 'Active',
      } as FowlRecord;

      rows.push({
        fowl: synthFowl,
        stats,
        matches,
        lastMatchDate,
        role: 'Non-Breeding',
      });
    });

    return rows;
  }, [fowls, filteredMatches, registryCtx]);

  // Apply role filter
  const filteredRows = useMemo(() => {
    if (roleFilter === 'all') return chickenRows;
    return chickenRows.filter((row) => row.role === roleFilter);
  }, [chickenRows, roleFilter]);

  // Apply sorting
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      if (sortBy === 'winrate') {
        const rateA = a.stats.winRate ?? -1;
        const rateB = b.stats.winRate ?? -1;
        if (rateB !== rateA) return rateB - rateA;
        if (b.stats.total !== a.stats.total) return b.stats.total - a.stats.total;
        return a.fowl.name.localeCompare(b.fowl.name);
      }
      if (sortBy === 'matches') {
        if (b.stats.total !== a.stats.total) return b.stats.total - a.stats.total;
        return (b.stats.winRate ?? -1) - (a.stats.winRate ?? -1);
      }
      if (sortBy === 'name') {
        return a.fowl.name.localeCompare(b.fowl.name);
      }
      if (sortBy === 'last_match') {
        const dateA = a.lastMatchDate || '';
        const dateB = b.lastMatchDate || '';
        return dateB.localeCompare(dateA);
      }
      return 0;
    });
  }, [filteredRows, sortBy]);

  // Overall Reconciled Totals
  const totalStats = useMemo(() => {
    return combineWinRates(filteredRows.map((r) => r.stats));
  }, [filteredRows]);

  if (!show) return null;

  const handleChickenClick = (f: FowlRecord) => {
    uiContext.setSelectedFowlForDetails(f);
  };

  const handleFightsClick = (f: FowlRecord) => {
    uiContext.setFightHistoryFowl(f);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Win rate by chicken"
      description="Individual chicken win rates and reconciled farm totals"
      icon={<BarChart3 className="w-5 h-5" />}
      className="max-w-4xl max-h-[90vh] flex flex-col"
    >
      {/* Filters and Controls Bar */}
      <div className="px-6 pt-3 pb-3 shrink-0 border-b border-border space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Role Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Role:
            </span>
            {(['all', 'Breeding Male', 'Breeding Female', 'Non-Breeding'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`text-xs font-bold px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  roleFilter === r
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:border-emerald-600 border-slate-900 shadow-2xs'
                    : 'bg-card text-muted-foreground border-border hover:border-slate-400'
                }`}
              >
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Date and Sort controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-muted-foreground">Range:</span>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DateRangePreset)}
                className="text-xs font-bold bg-muted/60 text-foreground border border-input-border rounded-md px-2 py-1 cursor-pointer focus:ring-1 focus:ring-emerald-500"
                aria-label="Filter matches by date range"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="month">This Month</option>
                <option value="3m">Last 3 Months</option>
                <option value="today">Today</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-0.5">
                <ArrowUpDown className="w-3 h-3" /> Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-xs font-bold bg-muted/60 text-foreground border border-input-border rounded-md px-2 py-1 cursor-pointer focus:ring-1 focus:ring-emerald-500"
                aria-label="Sort chickens"
              >
                <option value="winrate">Win rate (highest first)</option>
                <option value="matches">Matches (most first)</option>
                <option value="name">Name (A-Z)</option>
                <option value="last_match">Last match (recent first)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Desktop Table View (>= sm) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs border-collapse" aria-label="Chickens win rate breakdown">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-bold">
                <th className="py-2.5 px-3 text-left w-10">#</th>
                <th className="py-2.5 px-3 text-left">Chicken</th>
                <th className="py-2.5 px-3 text-center">Matches</th>
                <th className="py-2.5 px-3 text-center">W-L(-D)</th>
                <th className="py-2.5 px-3 text-left min-w-[140px]">Win Rate</th>
                <th className="py-2.5 px-3 text-right">Last Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sortedRows.map((row, index) => {
                const code =
                  row.fowl.birth_code ||
                  row.fowl.chicken_code ||
                  row.fowl.bird_code ||
                  birdCodes?.get(String(row.fowl.id));
                const pct = row.stats.winRate ?? 0;

                return (
                  <tr
                    key={row.fowl.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-muted-foreground font-bold">{index + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        {row.fowl.image_url ? (
                          <img
                            src={row.fowl.image_url}
                            alt={row.fowl.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-black text-muted-foreground shrink-0 select-none">
                            {row.fowl.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {code && (
                              <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-muted text-foreground border border-border shrink-0">
                                [{formatBirdCodeForDisplay(code)}]
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleChickenClick(row.fowl)}
                              className="font-bold text-card-foreground hover:text-emerald-600 dark:hover:text-emerald-400 truncate text-left cursor-pointer hover:underline"
                            >
                              {row.fowl.name}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground font-semibold">
                            {row.role} · {row.fowl.breed || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-foreground">
                      {row.stats.total}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleFightsClick(row.fowl)}
                        className="font-mono font-bold text-foreground hover:text-emerald-600 hover:underline cursor-pointer"
                        title="View match history"
                      >
                        {row.stats.wins}W-{row.stats.losses}L
                        {row.stats.draws > 0 ? `-${row.stats.draws}D` : ''}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <WinRatePill stats={row.stats} wins={row.stats.wins} losses={row.stats.losses} />
                        {row.stats.decided > 0 && (
                          <div className="w-14 bg-muted rounded-full h-1.5 overflow-hidden shrink-0 hidden md:block">
                            <div
                              className={`h-full rounded-full ${
                                pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground font-semibold whitespace-nowrap">
                      {row.lastMatchDate || '—'}
                    </td>
                  </tr>
                );
              })}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm font-semibold">
                    No chickens match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Pinned TOTAL Row */}
            <tfoot>
              <tr data-testid="breakdown-total-row" className="bg-muted/80 font-black border-t-2 border-border text-foreground">
                <td colSpan={2} className="py-3 px-3 text-left">
                  Total · {sortedRows.length} chickens · {totalStats.total} matches · {totalStats.wins}W-{totalStats.losses}L · {totalStats.winRate !== null ? `${totalStats.winRate}%` : 'No fights'}
                </td>
                <td className="py-3 px-3 text-center">{totalStats.total}</td>
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  {totalStats.wins}W-{totalStats.losses}L
                  {totalStats.draws > 0 ? `-${totalStats.draws}D` : ''}
                </td>
                <td colSpan={2} className="py-3 px-3 text-right whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs ${getWinRatePillClasses(
                      totalStats,
                    )}`}
                  >
                    {totalStats.winRate !== null ? `${totalStats.winRate}%` : 'No fights'} · {totalStats.wins}W-{totalStats.losses}L
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile View (< sm) */}
        <div className="sm:hidden space-y-2.5">
          {sortedRows.map((row, index) => {
            const code =
              row.fowl.birth_code ||
              row.fowl.chicken_code ||
              row.fowl.bird_code ||
              birdCodes?.get(String(row.fowl.id));

            return (
              <div
                key={row.fowl.id}
                className="bg-card border border-border rounded-lg p-3 space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
                    {code && (
                      <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-muted text-foreground border border-border shrink-0">
                        [{formatBirdCodeForDisplay(code)}]
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleChickenClick(row.fowl)}
                      className="text-xs font-bold text-card-foreground truncate text-left cursor-pointer hover:underline"
                    >
                      {row.fowl.name}
                    </button>
                  </div>
                  <WinRatePill stats={row.stats} wins={row.stats.wins} losses={row.stats.losses} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                  <span>{row.role}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleFightsClick(row.fowl)}
                      className="font-mono font-bold text-foreground hover:underline"
                    >
                      {row.stats.wins}W-{row.stats.losses}L
                    </button>
                    {row.lastMatchDate && <span>· {row.lastMatchDate}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {sortedRows.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm font-semibold">
              No chickens match the current filter.
            </div>
          )}

          {/* Pinned Mobile Total Card */}
          <div data-testid="breakdown-mobile-total" className="bg-muted/80 border-2 border-border rounded-lg p-3 font-black text-xs space-y-1.5 mt-3">
            <div className="flex items-center justify-between gap-2">
              <span>Total · {sortedRows.length} chickens · {totalStats.total} matches · {totalStats.wins}W-{totalStats.losses}L · {totalStats.winRate !== null ? `${totalStats.winRate}%` : 'No fights'}</span>
              <span className={`px-2 py-0.5 rounded-full border text-xs ${getWinRatePillClasses(totalStats)}`}>
                {totalStats.winRate !== null ? `${totalStats.winRate}%` : 'No fights'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              <span>Combined record: {totalStats.wins}W-{totalStats.losses}L{totalStats.draws > 0 ? `-${totalStats.draws}D` : ''}</span>
              <span>Decided: {totalStats.decided} matches</span>
            </div>
          </div>
        </div>
      </div>

      {/* Note under the table */}
      <div className="px-6 py-3 border-t border-border bg-muted/20 shrink-0">
        <p className="text-xs text-muted-foreground font-medium">
          Note: Draws are excluded. Percentages with few matches are less reliable.
        </p>
      </div>
    </Modal>
  );
}
