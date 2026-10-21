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
import { useUI } from '@/lib/contexts/ui-context';
import { useT } from '@/lib/i18n';
import { photosFor, postersFor, videosFor } from '@/lib/services/media-service';
import type { MatchRecord, FowlRecord } from '@/lib/types';

const PAGE_SIZE = 10;

export default function MatchLogsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const t = useT();
  const ui = useUI();
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

  // Preserve active tab and filter state when navigating to match record creation/editing
  const currentReturnPath = useMemo(() => {
    const sp = new URLSearchParams(searchParams.toString());
    if (pathname === '/profiling' && !sp.get('tab')) {
      sp.set('tab', 'matchForm');
    }
    const qs = sp.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  }, [pathname, searchParams]);

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
    [router, pathname, searchParams],
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
    if (pathname === '/profiling') {
      router.replace('/profiling?tab=matchForm', { scroll: false });
    } else {
      router.replace(pathname, { scroll: false });
    }
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    outcomeFilter !== 'ALL' ||
    chickenFilter !== 'ALL' ||
    classFilter !== 'ALL' ||
    startDate ||
    endDate ||
    sortOrder !== 'newest',
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
      rows = rows.filter(
        (m) => (m.age_category || 'Cock').trim().toLowerCase() === classFilter.toLowerCase(),
      );
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
  }, [
    matchHistory,
    outcomeFilter,
    chickenFilter,
    classFilter,
    startDate,
    endDate,
    searchQuery,
    sortOrder,
    fowlById,
    fowlByName,
    birdCodes,
  ]);

  // Pagination calculation
  const totalItems = filteredMatches.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedRows = filteredMatches.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-foreground flex items-center gap-2 text-2xl font-black tracking-tight">
              <Swords className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <span>Historical Analytics Match Logs</span>
            </h1>
            <span className="text-success hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs font-black sm:inline">
              D4 ANALYTICS DB
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm font-semibold">
            Complete record of logged derby, arena, and championship performance encounters
          </p>
        </div>

        <div>
          <Link
            href={`/match-logs/new?returnTo=${encodeURIComponent(currentReturnPath)}`}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-emerald-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Match Record</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border-border space-y-4 rounded-lg border p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Search Input */}
          <div className="relative md:col-span-3">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search chicken, identifier, opponent..."
              className="border-input-border dark:bg-input text-foreground placeholder:text-muted-foreground focus:border-success h-10 w-full rounded-md border bg-white pr-8 pl-9 text-sm font-semibold focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Outcome Filter */}
          <div className="md:col-span-2">
            <select
              value={outcomeFilter}
              onChange={(e) => handleOutcomeChange(e.target.value)}
              aria-label="Filter by outcome"
              className="border-input-border dark:bg-input text-foreground focus:border-success h-10 w-full cursor-pointer rounded-md border bg-white px-3 text-sm font-bold"
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
              className="border-input-border dark:bg-input text-foreground focus:border-success h-10 w-full cursor-pointer rounded-md border bg-white px-3 text-sm font-bold"
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
              className="border-input-border dark:bg-input text-foreground focus:border-success h-10 w-full cursor-pointer rounded-md border bg-white px-3 text-sm font-bold"
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
              className="border-input-border dark:bg-input text-foreground focus:border-success h-10 w-full cursor-pointer rounded-md border bg-white px-3 text-sm font-bold"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="opponent">Sort: Opponent Name</option>
            </select>
          </div>
        </div>

        {/* Date Range & Clear Action */}
        <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-t pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground flex items-center gap-1 text-xs font-bold uppercase">
              <Calendar className="h-3.5 w-3.5" />
              <span>Date:</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              aria-label="Filter match records starting from this date"
              className="border-input-border dark:bg-input text-foreground h-8 rounded border bg-white px-2.5 text-xs font-semibold"
            />
            <span className="text-muted-foreground text-xs font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              aria-label="Filter match records up to this date"
              className="border-input-border dark:bg-input text-foreground h-8 rounded border bg-white px-2.5 text-xs font-semibold"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex cursor-pointer items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-card border-border overflow-hidden rounded-lg border shadow-sm">
        {loading ? (
          <div className="animate-pulse space-y-4 p-8">
            <div className="bg-muted h-6 w-1/3 rounded" />
            <div className="bg-muted h-12 w-full rounded" />
            <div className="bg-muted h-12 w-full rounded" />
            <div className="bg-muted h-12 w-full rounded" />
          </div>
        ) : matchHistory.length === 0 ? (
          /* Farm Empty State */
          <div className="space-y-4 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              <Trophy className="h-7 w-7" />
            </div>
            <h3 className="text-foreground text-lg font-black">No match records yet</h3>
            <p className="text-muted-foreground mx-auto max-w-md text-sm font-semibold">
              Your farm hasn&apos;t logged any derby or arena fights yet. Begin tracking win rates
              and fight performance by adding your first record.
            </p>
            <div className="pt-2">
              <Link
                href={`/match-logs/new?returnTo=${encodeURIComponent(currentReturnPath)}`}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Match Record</span>
              </Link>
            </div>
          </div>
        ) : filteredMatches.length === 0 ? (
          /* Filtered Empty State */
          <div className="space-y-3 p-12 text-center">
            <div className="bg-muted text-muted-foreground mx-auto flex h-12 w-12 items-center justify-center rounded-full">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-foreground text-base font-black">No records match your filters</h3>
            <p className="text-muted-foreground text-sm font-semibold">
              Try adjusting your search query, outcome, or date range filters.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="border-border text-foreground hover:bg-muted inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-bold transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground border-border border-b text-xs font-extrabold uppercase">
                  <th className="w-[9%] p-2.5 pl-3 lg:p-3 lg:pl-4">Match Date</th>
                  <th className="w-[24%] p-2.5 lg:p-3">Chicken Identifier</th>
                  <th className="w-[17%] p-2.5 lg:p-3">Opponent</th>
                  <th className="w-[13%] p-2.5 lg:p-3">Arena Location</th>
                  <th className="w-[9%] p-2.5 text-center lg:p-3">Outcome</th>
                  <th className="w-[13%] p-2.5 text-center lg:p-3">Post-Fight Condition</th>
                  <th className="bg-card sticky right-0 w-[15%] min-w-[160px] p-2.5 text-center lg:min-w-[120px] lg:p-2">
                    Media &amp; Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border text-muted-foreground divide-y font-semibold">
                {paginatedRows.map((log) => {
                  const fowl = log.fowl_id != null ? fowlById.get(log.fowl_id) : null;
                  const code = fowl ? birdCodes.get(String(fowl.id)) : '';
                  const hatch = fowl?.birthdate;
                  const isOrphan = log.fowl_id == null;
                  const openFowlInfo = fowl
                    ? (event: React.MouseEvent) => {
                        event.stopPropagation();
                        ui.setSelectedFowlForDetails(fowl);
                      }
                    : undefined;

                  return (
                    <tr
                      key={log.id}
                      onClick={() =>
                        router.push(
                          `/match-logs/${log.id}/edit?returnTo=${encodeURIComponent(currentReturnPath)}`,
                        )
                      }
                      className="hover:bg-muted/30 group cursor-pointer transition-colors duration-150"
                    >
                      <td className="text-muted-foreground p-2.5 pl-3 font-mono whitespace-nowrap lg:p-3 lg:pl-4">
                        {log.date}
                      </td>

                      <td className="min-w-0 p-2.5 lg:p-3">
                        {openFowlInfo ? (
                          <button
                            type="button"
                            onClick={openFowlInfo}
                            aria-label={`View info for ${log.entry_name}`}
                            title={`View info for ${log.entry_name}`}
                            className="focus-visible:ring-ring flex w-full min-w-0 cursor-pointer flex-col items-start rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
                          >
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                                <ChickenIcon className="text-success h-3.5 w-3.5" />
                              </div>
                              {code && (
                                <span className="text-success rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-xs font-black uppercase">
                                  [{formatBirdCodeForDisplay(code)}]
                                </span>
                              )}
                              <span className="text-card-foreground min-w-0 font-bold break-words transition-colors group-hover:text-emerald-600">
                                {log.entry_name}
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-muted-foreground text-xs font-semibold">
                                {log.breed || '—'}
                                {hatch ? ` · ${t('registry.hatchedDate', { date: hatch })}` : ''}
                              </span>
                              {log.age_category && (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-bold whitespace-nowrap text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                  {log.age_category}
                                </span>
                              )}
                            </div>
                          </button>
                        ) : (
                          <>
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                                <ChickenIcon className="text-success h-3.5 w-3.5" />
                              </div>
                              {code && (
                                <span className="text-success rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-xs font-black uppercase">
                                  [{formatBirdCodeForDisplay(code)}]
                                </span>
                              )}
                              <span className="text-card-foreground min-w-0 font-bold break-words transition-colors group-hover:text-emerald-600">
                                {log.entry_name}
                              </span>
                              {isOrphan && (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                  Historical entry (no profile linked)
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-muted-foreground text-xs font-semibold">
                                {log.breed || '—'}
                                {hatch ? ` · ${t('registry.hatchedDate', { date: hatch })}` : ''}
                              </span>
                              {log.age_category && (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-bold whitespace-nowrap text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                  {log.age_category}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </td>

                      <td className="min-w-0 p-2.5 lg:p-3">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {log.opponent_photo_url && (
                            <img
                              src={log.opponent_photo_url}
                              alt="Opponent"
                              className="border-border h-6 w-6 shrink-0 rounded-full border object-cover"
                            />
                          )}
                          <span className="text-card-foreground min-w-0 font-bold break-words">
                            {log.opponent || '—'}
                          </span>
                        </div>
                        <span className="text-muted-foreground mt-0.5 block text-xs font-semibold break-words normal-case">
                          {[log.opponent_breed, log.opponent_bloodline]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </td>

                      <td className="text-muted-foreground p-2.5 font-normal break-words lg:p-3">
                        {log.location || '—'}
                      </td>

                      <td className="p-2.5 text-center lg:p-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black tracking-wider uppercase ${
                            log.outcome && log.outcome.toLowerCase() === 'win'
                              ? 'text-success border-emerald-500/20 bg-emerald-500/10'
                              : log.outcome && log.outcome.toLowerCase() === 'loss'
                                ? 'text-danger border-rose-500/20 bg-rose-500/10'
                                : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {log.outcome || '—'}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        {log.post_fight_condition ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-black tracking-wider break-words uppercase ${
                              (log.post_fight_condition || '').toLowerCase().includes('deceased')
                                ? 'text-danger border-rose-500/20 bg-rose-500/10'
                                : (log.post_fight_condition || '')
                                      .toLowerCase()
                                      .includes('critical') ||
                                    (log.post_fight_condition || '')
                                      .toLowerCase()
                                      .includes('severely')
                                  ? 'text-warning border-amber-500/20 bg-amber-500/10'
                                  : 'text-teal border-teal-500/20 bg-teal-500/10'
                            }`}
                          >
                            {log.post_fight_condition}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs font-bold">—</span>
                        )}
                      </td>

                      <td
                        className="bg-card sticky right-0 w-[15%] min-w-[160px] p-2.5 text-center lg:min-w-[120px] lg:p-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MatchMediaButtons
                          match={log}
                          videos={videosFor(matchMedia, log.id, log)}
                          photos={photosFor(matchMedia, log.id, log)}
                          posters={postersFor(matchMedia, log.id, log)}
                          returnTo={currentReturnPath}
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
          <div className="border-border bg-muted/20 text-muted-foreground flex flex-col items-center justify-between gap-3 border-t p-4 text-xs font-semibold sm:flex-row">
            <div>
              Showing <span className="text-foreground font-bold">{pageStart + 1}</span> to{' '}
              <span className="text-foreground font-bold">
                {Math.min(pageStart + PAGE_SIZE, totalItems)}
              </span>{' '}
              of <span className="text-foreground font-bold">{totalItems}</span> match records
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="border-border bg-card text-foreground hover:bg-muted flex cursor-pointer items-center gap-1 rounded border px-3 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>

              <div className="bg-muted text-foreground rounded px-3 py-1.5 font-bold">
                Page {currentPage} of {totalPages}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="border-border bg-card text-foreground hover:bg-muted flex cursor-pointer items-center gap-1 rounded border px-3 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
