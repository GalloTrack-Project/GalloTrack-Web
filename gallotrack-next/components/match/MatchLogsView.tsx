'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Swords,
} from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import MatchMediaButtons from '@/components/match/MatchMediaButtons';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { useFowl } from '@/lib/contexts/fowl-context';
import { photosFor, postersFor, videosFor } from '@/lib/services/media-service';
import type { MatchRecord, FowlRecord } from '@/lib/types';

const PAGE_SIZE = 10;

export default function MatchLogsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { fowls, matchHistory, matchMedia, birdCodes, loading } = useFowl();

  // Read URL query params
  const urlSearch = searchParams.get('q') || '';
  const urlOutcome = searchParams.get('outcome') || 'ALL';
  const urlChickenId = searchParams.get('fowlId') || 'ALL';
  const urlClass = searchParams.get('class') || 'ALL';
  const urlStartDate = searchParams.get('startDate') || '';
  const urlEndDate = searchParams.get('endDate') || '';
  const urlSort = searchParams.get('sort') || 'newest';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  // Local filter states synced with URL
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [outcomeFilter, setOutcomeFilter] = useState(urlOutcome);
  const [chickenFilter, setChickenFilter] = useState(urlChickenId);
  const [classFilter, setClassFilter] = useState(urlClass);
  const [startDate, setStartDate] = useState(urlStartDate);
  const [endDate, setEndDate] = useState(urlEndDate);
  const [sortOrder, setSortOrder] = useState(urlSort);
  const [currentPage, setCurrentPage] = useState(isNaN(urlPage) || urlPage < 1 ? 1 : urlPage);

  // Sync state if URL changes externally
  useEffect(() => {
    setSearchQuery(urlSearch);
    setOutcomeFilter(urlOutcome);
    setChickenFilter(urlChickenId);
    setClassFilter(urlClass);
    setStartDate(urlStartDate);
    setEndDate(urlEndDate);
    setSortOrder(urlSort);
    setCurrentPage(isNaN(urlPage) || urlPage < 1 ? 1 : urlPage);
  }, [urlSearch, urlOutcome, urlChickenId, urlClass, urlStartDate, urlEndDate, urlSort, urlPage]);

  // Update URL helper
  const updateUrlParams = useCallback(
    (newParams: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([k, v]) => {
        if (!v || v === 'ALL' || (k === 'page' && v === '1') || (k === 'sort' && v === 'newest')) {
          current.delete(k);
        } else {
          current.set(k, v);
        }
      });
      const query = current.toString();
      router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    updateUrlParams({ q: val || null, page: '1' });
  };

  const handleOutcomeChange = (val: string) => {
    setOutcomeFilter(val);
    setCurrentPage(1);
    updateUrlParams({ outcome: val === 'ALL' ? null : val, page: '1' });
  };

  const handleChickenChange = (val: string) => {
    setChickenFilter(val);
    setCurrentPage(1);
    updateUrlParams({ fowlId: val === 'ALL' ? null : val, page: '1' });
  };

  const handleClassChange = (val: string) => {
    setClassFilter(val);
    setCurrentPage(1);
    updateUrlParams({ class: val === 'ALL' ? null : val, page: '1' });
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setCurrentPage(1);
    updateUrlParams({ startDate: val || null, page: '1' });
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setCurrentPage(1);
    updateUrlParams({ endDate: val || null, page: '1' });
  };

  const handleSortChange = (val: string) => {
    setSortOrder(val);
    setCurrentPage(1);
    updateUrlParams({ sort: val === 'newest' ? null : val, page: '1' });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateUrlParams({ page: String(page) });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setOutcomeFilter('ALL');
    setChickenFilter('ALL');
    setClassFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortOrder('newest');
    setCurrentPage(1);
    router.replace(pathname, { scroll: false });
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      outcomeFilter !== 'ALL' ||
      chickenFilter !== 'ALL' ||
      classFilter !== 'ALL' ||
      startDate ||
      endDate ||
      sortOrder !== 'newest'
  );

  // Chicken lookup maps
  const fowlById = useMemo(() => {
    const map = new Map<number, FowlRecord>();
    fowls.forEach((f) => map.set(f.id, f));
    return map;
  }, [fowls]);

  const fowlByName = useMemo(() => {
    const map = new Map<string, FowlRecord>();
    fowls.forEach((f) => {
      const k = (f.name || '').trim().toLowerCase();
      if (k) map.set(k, f);
    });
    return map;
  }, [fowls]);

  // Filter & sort rows
  const filteredMatches = useMemo(() => {
    let rows = [...matchHistory];

    // Outcome filter
    if (outcomeFilter !== 'ALL') {
      rows = rows.filter((m) => (m.outcome || '').toUpperCase() === outcomeFilter.toUpperCase());
    }

    // Chicken filter
    if (chickenFilter !== 'ALL') {
      const targetId = Number(chickenFilter);
      rows = rows.filter((m) => {
        // Authoritative fowl_id only: orphan matches (fowl_id == null) never match by name fallback
        return m.fowl_id === targetId;
      });
    }

    // Class filter
    if (classFilter !== 'ALL') {
      rows = rows.filter((m) => (m.age_category || 'Cock').trim().toLowerCase() === classFilter.toLowerCase());
    }

    // Date range filter
    if (startDate) {
      rows = rows.filter((m) => m.date >= startDate);
    }
    if (endDate) {
      rows = rows.filter((m) => m.date <= endDate);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      rows = rows.filter((m) => {
        const fowl = m.fowl_id != null ? fowlById.get(m.fowl_id) : null;
        const code = fowl ? birdCodes.get(String(fowl.id)) : '';
        const name = (m.entry_name || '').toLowerCase();
        const opponent = (m.opponent || '').toLowerCase();
        const breed = (m.breed || '').toLowerCase();
        const oppBreed = (m.opponent_breed || '').toLowerCase();
        const location = (m.location || '').toLowerCase();
        return (
          name.includes(q) ||
          opponent.includes(q) ||
          (code && code.toLowerCase().includes(q)) ||
          breed.includes(q) ||
          oppBreed.includes(q) ||
          location.includes(q)
        );
      });
    }

    // Sort order
    rows.sort((a, b) => {
      if (sortOrder === 'oldest') return (a.date || '').localeCompare(b.date || '');
      if (sortOrder === 'opponent') return (a.opponent || '').localeCompare(b.opponent || '');
      // newest first default
      const cmp = (b.date || '').localeCompare(a.date || '');
      if (cmp !== 0) return cmp;
      return (b.id || 0) - (a.id || 0);
    });

    return rows;
  }, [matchHistory, outcomeFilter, chickenFilter, classFilter, startDate, endDate, searchQuery, sortOrder, fowlById, fowlByName, birdCodes]);

  // Pagination calculation
  const totalItems = filteredMatches.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedRows = filteredMatches.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Swords className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>Historical Analytics Match Logs</span>
            </h1>
            <span className="text-xs font-mono bg-emerald-500/10 text-success border border-emerald-500/20 font-black px-2.5 py-0.5 rounded-full hidden sm:inline">
              D4 ANALYTICS DB
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-semibold mt-1">
            Complete record of logged derby, arena, and championship performance encounters
          </p>
        </div>

        <div>
          <Link
            href="/match-logs/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Match Record</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-3 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search chicken, identifier, opponent..."
              className="w-full h-10 pl-9 pr-8 border border-input-border rounded-md text-sm bg-white dark:bg-input text-foreground font-semibold placeholder:text-muted-foreground focus:border-success focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Outcome Filter */}
          <div className="md:col-span-2">
            <select
              value={outcomeFilter}
              onChange={(e) => handleOutcomeChange(e.target.value)}
              aria-label="Filter by outcome"
              className="w-full h-10 px-3 border border-input-border rounded-md text-sm bg-white dark:bg-input font-bold text-foreground cursor-pointer focus:border-success"
            >
              <option value="ALL">All Outcomes</option>
              <option value="WIN">WIN</option>
              <option value="LOSS">LOSS</option>
              <option value="DRAW">DRAW</option>
            </select>
          </div>

          {/* Chicken Filter */}
          <div className="md:col-span-3">
            <select
              value={chickenFilter}
              onChange={(e) => handleChickenChange(e.target.value)}
              aria-label="Filter by chicken"
              className="w-full h-10 px-3 border border-input-border rounded-md text-sm bg-white dark:bg-input font-bold text-foreground cursor-pointer focus:border-success"
            >
              <option value="ALL">All Chickens</option>
              {fowls.map((f) => {
                const code = birdCodes.get(String(f.id));
                return (
                  <option key={f.id} value={f.id}>
                    {code ? `[${formatBirdCodeForDisplay(code)}] ` : ''}
                    {f.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Class Filter */}
          <div className="md:col-span-2">
            <select
              value={classFilter}
              onChange={(e) => handleClassChange(e.target.value)}
              aria-label="Filter by chicken class"
              className="w-full h-10 px-3 border border-input-border rounded-md text-sm bg-white dark:bg-input font-bold text-foreground cursor-pointer focus:border-success"
            >
              <option value="ALL">All Classes</option>
              <option value="Cock">Cock</option>
              <option value="Stag">Stag</option>
              <option value="Open">Open</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="md:col-span-2">
            <select
              value={sortOrder}
              onChange={(e) => handleSortChange(e.target.value)}
              aria-label="Sort match records"
              className="w-full h-10 px-3 border border-input-border rounded-md text-sm bg-white dark:bg-input font-bold text-foreground cursor-pointer focus:border-success"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="opponent">Sort: Opponent Name</option>
            </select>
          </div>
        </div>

        {/* Date Range & Clear Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date:</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              aria-label="Filter match records starting from this date"
              className="h-8 px-2.5 border border-input-border rounded text-xs bg-white dark:bg-input font-semibold text-foreground"
            />
            <span className="text-xs text-muted-foreground font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              aria-label="Filter match records up to this date"
              className="h-8 px-2.5 border border-input-border rounded text-xs bg-white dark:bg-input font-semibold text-foreground"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-6 w-1/3 bg-muted rounded" />
            <div className="h-12 w-full bg-muted rounded" />
            <div className="h-12 w-full bg-muted rounded" />
            <div className="h-12 w-full bg-muted rounded" />
          </div>
        ) : matchHistory.length === 0 ? (
          /* Farm Empty State */
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <Trophy className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-foreground">No match records yet</h3>
            <p className="text-sm text-muted-foreground font-semibold max-w-md mx-auto">
              Your farm hasn&apos;t logged any derby or arena fights yet. Begin tracking win rates and fight performance by adding your first record.
            </p>
            <div className="pt-2">
              <Link
                href="/match-logs/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Match Record</span>
              </Link>
            </div>
          </div>
        ) : filteredMatches.length === 0 ? (
          /* Filtered Empty State */
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-foreground">No records match your filters</h3>
            <p className="text-sm text-muted-foreground font-semibold">
              Try adjusting your search query, outcome, or date range filters.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[860px]">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground font-extrabold uppercase border-b border-border text-xs">
                  <th className="p-4 pl-6">Match Date</th>
                  <th className="p-4">Chicken Identifier</th>
                  <th className="p-4">Opponent</th>
                  <th className="p-4">Arena Location</th>
                  <th className="p-4 text-center">Outcome</th>
                  <th className="p-4 text-center">Post-Fight Condition</th>
                  <th className="p-4 text-center">Media &amp; Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground font-semibold">
                {paginatedRows.map((log) => {
                  const fowl = log.fowl_id != null ? fowlById.get(log.fowl_id) : null;
                  const code = fowl ? birdCodes.get(String(fowl.id)) : '';
                  const hatch = fowl?.birthdate;
                  const isOrphan = log.fowl_id == null;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => router.push(`/match-logs/${log.id}/edit`)}
                      className="hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
                    >
                      <td className="p-4 pl-6 font-mono text-muted-foreground whitespace-nowrap">
                        {log.date}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <ChickenIcon className="w-3.5 h-3.5 text-success" />
                          </div>
                          {code && (
                            <span className="text-xs font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-success border border-emerald-500/20 uppercase">
                              [{formatBirdCodeForDisplay(code)}]
                            </span>
                          )}
                          <span className="font-bold text-card-foreground group-hover:text-emerald-600 transition-colors">
                            {log.entry_name}
                          </span>
                          {isOrphan && (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                              Historical entry (no profile linked)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {log.breed || '—'}
                            {hatch ? ` · hatch ${hatch}` : ''}
                          </span>
                          {log.age_category && (
                            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                              {log.age_category}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          {log.opponent_photo_url && (
                            <img
                              src={log.opponent_photo_url}
                              alt="Opponent"
                              className="h-6 w-6 rounded-full border border-border object-cover shrink-0"
                            />
                          )}
                          <span className="font-bold text-card-foreground">{log.opponent || '—'}</span>
                        </div>
                        <span className="block text-xs font-semibold text-muted-foreground normal-case mt-0.5">
                          {[log.opponent_breed, log.opponent_bloodline].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </td>

                      <td className="p-4 text-muted-foreground font-normal">{log.location || '—'}</td>

                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-xs uppercase tracking-wider border ${
                            log.outcome && log.outcome.toLowerCase() === 'win'
                              ? 'bg-emerald-500/10 text-success border-emerald-500/20'
                              : log.outcome && log.outcome.toLowerCase() === 'loss'
                              ? 'bg-rose-500/10 text-danger border-rose-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {log.outcome || '—'}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        {log.post_fight_condition ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-xs uppercase tracking-wider border whitespace-nowrap ${
                              (log.post_fight_condition || '').toLowerCase().includes('deceased')
                                ? 'bg-rose-500/10 text-danger border-rose-500/20'
                                : (log.post_fight_condition || '').toLowerCase().includes('critical') ||
                                  (log.post_fight_condition || '').toLowerCase().includes('severely')
                                ? 'bg-amber-500/10 text-warning border-amber-500/20'
                                : 'bg-teal-500/10 text-teal border-teal-500/20'
                            }`}
                          >
                            {log.post_fight_condition}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-bold">—</span>
                        )}
                      </td>

                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <MatchMediaButtons
                          match={log}
                          videos={videosFor(matchMedia, log.id, log)}
                          photos={photosFor(matchMedia, log.id, log)}
                          posters={postersFor(matchMedia, log.id, log)}
                          returnTo="/match-logs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalItems > PAGE_SIZE && (
          <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
            <div>
              Showing <span className="font-bold text-foreground">{pageStart + 1}</span> to{' '}
              <span className="font-bold text-foreground">{Math.min(pageStart + PAGE_SIZE, totalItems)}</span> of{' '}
              <span className="font-bold text-foreground">{totalItems}</span> match records
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="px-3 py-1.5 rounded bg-muted font-bold text-foreground">
                Page {currentPage} of {totalPages}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
