'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3, Filter, ArrowUpDown } from 'lucide-react';
import type { FowlRecord, MatchRecord } from '@/lib/types';
import { Modal } from '@/components/ui';
import { useUI } from '@/lib/contexts/ui-context';
import { formatBirdCodeForDisplay, resolveBirdCodes } from '@/lib/bird-code';
import { buildRegistryContext, roleOf, roleLabel, type RegistryRole } from '@/lib/registry-roles';
import {
  buildChickenMatchStatsMap,
  combineWinRates,
  getChickenMatchStats,
  getWinRatePillClasses,
  type WinRateStats,
} from '@/lib/win-rate';
import WinRatePill from '@/components/match/WinRatePill';
import { canFight, presetDateKeys, type DateRangePreset } from '@/lib/helpers';

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

  const [nowMs, setNowMs] = useState(() => Date.now());

  React.useEffect(() => {
    if (show) {
      setNowMs(Date.now());
      if (initialDatePreset) {
        setDatePreset(initialDatePreset);
      }
    }
  }, [show, initialDatePreset]);

  const registryCtx = useMemo(() => buildRegistryContext(fowls), [fowls]);

  // Filter matches based on selected datePreset
  const filteredMatches = useMemo(() => {
    if (datePreset === 'all') return matchHistory;
    const bounds = presetDateKeys(datePreset, nowMs);
    if (!bounds) return matchHistory;
    return matchHistory.filter((m) => {
      if (!m.date) return false;
      return m.date >= bounds.start && m.date <= bounds.end;
    });
  }, [matchHistory, datePreset, nowMs]);

  // The same shared record helper and fowl_id resolution as Match Logs and the
  // Lineage Directory. The date range below only ever narrows the selected-range
  // view; "Overall (all time)" always reads the complete history.
  const allTimeStatsMap = useMemo(
    () => buildChickenMatchStatsMap(matchHistory, fowls),
    [matchHistory, fowls],
  );
  const rangeStatsMap = useMemo(
    () => buildChickenMatchStatsMap(filteredMatches, fowls),
    [filteredMatches, fowls],
  );

  // Rows are fighting cocks with at least one match in the selected range.
  const chickenRows = useMemo(() => {
    const rows: ChickenBreakdownRow[] = [];
    fowls.forEach((f) => {
      if (!canFight(f)) return;
      const rangeStats = getChickenMatchStats(rangeStatsMap, f);
      if (rangeStats.total === 0) return;
      rows.push({
        fowl: f,
        stats: rangeStats,
        matches: rangeStats.matches,
        lastMatchDate: rangeStats.lastMatchDate,
        role: roleOf(f, registryCtx),
      });
    });
    return rows;
  }, [fowls, rangeStatsMap, registryCtx]);

  // Apply role filter
  const filteredRows = useMemo(() => {
    if (roleFilter === 'all') return chickenRows;
    return chickenRows.filter((row) => row.role === roleFilter);
  }, [chickenRows, roleFilter]);

  // All-time total for the same role filter. Changing the date range must never
  // change this figure.
  const overallRows = useMemo(() => {
    return fowls
      .filter((f) => canFight(f))
      .filter((f) => roleFilter === 'all' || roleOf(f, registryCtx) === roleFilter)
      .map((f) => ({ fowl: f, stats: getChickenMatchStats(allTimeStatsMap, f) }))
      .filter((row) => row.stats.total > 0);
  }, [fowls, roleFilter, registryCtx, allTimeStatsMap]);

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

  // Selected-range total (follows the date range) and the all-time total that
  // must stay identical no matter which range is selected.
  const totalStats = useMemo(() => {
    return combineWinRates(filteredRows.map((r) => r.stats));
  }, [filteredRows]);
  const overallStats = useMemo(
    () => combineWinRates(overallRows.map((r) => r.stats)),
    [overallRows],
  );

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
                {r === 'all' ? 'All Roles' : roleLabel(r)}
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

      <div
        data-testid="breakdown-overall-total"
        className="border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 border-b px-6 py-2.5 text-xs font-bold"
      >
        <span className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
          Overall (all time)
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-foreground">
            {overallRows.length} chickens · {overallStats.total} matches
          </span>
          <span className="text-border" aria-hidden="true">|</span>
          <span className="text-foreground">
            {overallStats.wins}W-{overallStats.losses}L
            {overallStats.draws > 0 ? `-${overallStats.draws}D` : ''}
          </span>
          <span className="text-border" aria-hidden="true">|</span>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-black ${getWinRatePillClasses(overallStats)}`}>
            {overallStats.winRate === null ? '—%' : `${overallStats.winRate}%`}
          </span>
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
                            {roleLabel(row.role)} · {row.fowl.breed || '—'}
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
                  In selected range · {sortedRows.length} chickens · {totalStats.total} matches · {totalStats.wins}W-{totalStats.losses}L · {totalStats.winRate !== null ? `${totalStats.winRate}%` : '—%'}
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
                    {totalStats.winRate !== null ? `${totalStats.winRate}%` : '—%'} · {totalStats.wins}W-{totalStats.losses}L
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
                  <span>{roleLabel(row.role)}</span>
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
              <span>In selected range · {sortedRows.length} chickens · {totalStats.total} matches · {totalStats.wins}W-{totalStats.losses}L · {totalStats.winRate !== null ? `${totalStats.winRate}%` : '—%'}</span>
              <span className={`px-2 py-0.5 rounded-full border text-xs ${getWinRatePillClasses(totalStats)}`}>
                {totalStats.winRate !== null ? `${totalStats.winRate}%` : '—%'}
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
