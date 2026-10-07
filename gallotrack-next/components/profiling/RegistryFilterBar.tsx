'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Filter, ChevronDown, Check, RotateCcw, Loader2, ArrowDownUp } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { REGISTRY_SORT_OPTIONS, type RegistrySortKey } from '@/lib/registry-roles';

export interface ParentOption {
  name: string;
  code?: string | null;
  count?: number;
}

export interface RegistryFilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  debouncedQuery: string;
  isDebouncing?: boolean;
  filterSire: string;
  onFilterSireChange: (s: string) => void;
  filterDam: string;
  onFilterDamChange: (d: string) => void;
  filterStage: string;
  onFilterStageChange: (st: string) => void;
  filterBreed: string;
  onFilterBreedChange: (b: string) => void;
  filterFights: 'all' | 'with' | 'without';
  onFilterFightsChange: (f: 'all' | 'with' | 'without') => void;
  filterReason?: string;
  onFilterReasonChange?: (r: string) => void;
  effectiveStatus: 'Active' | 'Archived' | 'Deceased';
  sort: RegistrySortKey;
  onSortChange: (key: RegistrySortKey) => void;
  sireOptions: ParentOption[];
  damOptions: ParentOption[];
  stageOptions: string[];
  breedOptions: string[];
  reasonOptions?: string[];
  filteredCount: number;
  totalCount: number;
  onResetAll: () => void;
}

/**
 * Searchable popover selector for Parent (Sire / Dam)
 */
function SearchableParentDropdown({
  label,
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (val: string) => void;
  options: ParentOption[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input inside popover
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter((opt) => {
      const matchName = opt.name.toLowerCase().includes(term);
      const matchCode = opt.code ? opt.code.toLowerCase().includes(term) : false;
      return matchName || matchCode;
    });
  }, [options, searchTerm]);

  const selectedOption = options.find((o) => o.name.toLowerCase() === value.toLowerCase());
  const selectedDisplay = value === 'all'
    ? placeholder
    : selectedOption?.code
    ? `${selectedOption.code} · ${selectedOption.name}`
    : value;

  return (
    <div className="relative flex flex-col gap-1 w-full" ref={dropdownRef}>
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <button
        id={id}
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'h-9 w-full px-3 text-xs font-medium rounded-md border text-left flex items-center justify-between gap-2 transition-all cursor-pointer',
          value !== 'all'
            ? 'border-emerald-500/50 bg-emerald-500/5 text-foreground font-bold'
            : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
        )}
      >
        <span className="truncate">{selectedDisplay}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-150', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 w-full min-w-[220px] max-w-xs z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg overflow-hidden animate-fadeIn"
        >
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={`Search ${label.toLowerCase()}…`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-sm border border-border bg-background focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-border/30">
            <button
              type="button"
              role="option"
              aria-selected={value === 'all'}
              onClick={() => {
                onChange('all');
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-sm text-left transition-colors cursor-pointer',
                value === 'all' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold' : 'hover:bg-muted text-foreground'
              )}
            >
              <span>{placeholder}</span>
              {value === 'all' && <Check className="w-3.5 h-3.5 text-success" />}
            </button>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.toLowerCase() === opt.name.toLowerCase();
                return (
                  <button
                    key={opt.name}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.name);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-sm text-left transition-colors cursor-pointer',
                      isSelected ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold' : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {opt.code && (
                        <span className="font-mono text-xs font-bold px-1 py-0.2 rounded bg-muted border border-border uppercase shrink-0">
                          [{opt.code}]
                        </span>
                      )}
                      <span className="truncate">{opt.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-success shrink-0 ml-1.5" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegistryFilterBar({
  query,
  onQueryChange,
  debouncedQuery,
  isDebouncing = false,
  filterSire,
  onFilterSireChange,
  filterDam,
  onFilterDamChange,
  filterStage,
  onFilterStageChange,
  filterBreed,
  onFilterBreedChange,
  filterFights,
  onFilterFightsChange,
  filterReason = 'all',
  onFilterReasonChange,
  effectiveStatus,
  sort,
  onSortChange,
  sireOptions,
  damOptions,
  stageOptions,
  breedOptions,
  reasonOptions = [],
  filteredCount,
  totalCount,
  onResetAll,
}: RegistryFilterBarProps) {
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global '/' keyboard shortcut to focus search input
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName || ''))) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Compute active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (filterSire !== 'all') count++;
    if (filterDam !== 'all') count++;
    if (filterStage !== 'all') count++;
    if (filterBreed !== 'all') count++;
    if (filterFights !== 'all') count++;
    if (filterReason !== 'all') count++;
    return count;
  }, [query, filterSire, filterDam, filterStage, filterBreed, filterFights, filterReason]);

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="bg-card rounded-lg border border-border shadow-xs p-4 sm:p-5 space-y-3.5">
      {/* Top Row: Search Input + Mobile Filter Toggle + Result Counter Badge */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground"
          >
            {isDebouncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </span>
          <input
            ref={searchInputRef}
            id="registry-search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onQueryChange('');
              }
            }}
            placeholder="Search name, ID, wing band…"
            aria-label="Search Registry"
            className={cn(
              'h-10 w-full rounded-md border border-input-border bg-background py-2 pl-9 pr-16 text-sm text-foreground font-medium',
              'placeholder:text-muted-foreground placeholder:font-normal',
              'focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
              'transition-all duration-150',
              '[&::-webkit-search-cancel-button]:appearance-none'
            )}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onQueryChange('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search input"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="hidden sm:inline-flex items-center justify-center text-xs font-mono text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded border border-border"
                title="Press / anywhere to search"
              >
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Mobile Filter Toggle Button */}
        <button
          type="button"
          onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
          aria-expanded={isMobilePanelOpen}
          aria-controls="mobile-filter-dropdowns"
          className={cn(
            'md:hidden h-10 px-3 rounded-md border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors',
            hasActiveFilters
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-border bg-muted/60 text-muted-foreground hover:bg-muted'
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
          {activeFiltersCount > (query.trim() ? 1 : 0) && (
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              {activeFiltersCount - (query.trim() ? 1 : 0)}
            </span>
          )}
        </button>

        {/* Live Result Count Badge */}
        <div className="hidden sm:flex items-center shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-muted/80 text-foreground border border-border">
            <span className="text-muted-foreground">Results:</span>
            <span className={cn('font-black', filteredCount === 0 && 'text-danger')}>
              {filteredCount} of {totalCount}
            </span>
          </span>
        </div>
      </div>

      {/* Dropdown Filters Grid: Visible on desktop, collapsible on mobile */}
      <div
        id="mobile-filter-dropdowns"
        className={cn(
          'transition-all duration-200',
          isMobilePanelOpen ? 'block' : 'hidden md:block'
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* 1. Father (Sire) */}
          <SearchableParentDropdown
            id="filter-by-sire"
            label="Father (Sire)"
            value={filterSire}
            onChange={onFilterSireChange}
            options={sireOptions}
            placeholder="All Fathers (Sire)"
          />

          {/* 2. Mother (Dam) */}
          <SearchableParentDropdown
            id="filter-by-dam"
            label="Mother (Dam)"
            value={filterDam}
            onChange={onFilterDamChange}
            options={damOptions}
            placeholder="All Mothers (Dam)"
          />

          {/* 3. Growth Stage */}
          <div className="flex flex-col gap-1 w-full">
            <label htmlFor="filter-by-growth-stage" className="text-xs font-semibold text-muted-foreground">
              Growth Stage
            </label>
            <div className="relative">
              <select
                id="filter-by-growth-stage"
                value={filterStage}
                onChange={(e) => onFilterStageChange(e.target.value)}
                className={cn(
                  'h-9 w-full px-3 pr-8 text-xs font-medium rounded-md border appearance-none transition-all cursor-pointer',
                  filterStage !== 'all'
                    ? 'border-emerald-500/50 bg-emerald-500/5 text-foreground font-bold'
                    : 'border-border bg-background text-foreground hover:bg-muted/50'
                )}
              >
                <option value="all">All Stages</option>
                {stageOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* 4. Breed */}
          <div className="flex flex-col gap-1 w-full">
            <label htmlFor="filter-by-breed" className="text-xs font-semibold text-muted-foreground">
              Breed
            </label>
            <div className="relative">
              <select
                id="filter-by-breed"
                value={filterBreed}
                onChange={(e) => onFilterBreedChange(e.target.value)}
                className={cn(
                  'h-9 w-full px-3 pr-8 text-xs font-medium rounded-md border appearance-none transition-all cursor-pointer',
                  filterBreed !== 'all'
                    ? 'border-emerald-500/50 bg-emerald-500/5 text-foreground font-bold'
                    : 'border-border bg-background text-foreground hover:bg-muted/50'
                )}
              >
                <option value="all">All Breeds</option>
                {breedOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* 5. Fight Record */}
          <div className="flex flex-col gap-1 w-full">
            <label htmlFor="filter-by-fights" className="text-xs font-semibold text-muted-foreground">
              Fight Record
            </label>
            <div className="relative">
              <select
                id="filter-by-fights"
                value={filterFights}
                onChange={(e) => onFilterFightsChange(e.target.value as 'all' | 'with' | 'without')}
                className={cn(
                  'h-9 w-full px-3 pr-8 text-xs font-medium rounded-md border appearance-none transition-all cursor-pointer',
                  filterFights !== 'all'
                    ? 'border-emerald-500/50 bg-emerald-500/5 text-foreground font-bold'
                    : 'border-border bg-background text-foreground hover:bg-muted/50'
                )}
              >
                <option value="all">All Chickens</option>
                <option value="with">With Fight Records</option>
                <option value="without">Without Fight Records</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* 6. Sort (Task B — applied before pagination) */}
          <div className="flex flex-col gap-1 w-full">
            <label htmlFor="registry-sort" className="text-xs font-semibold text-muted-foreground">
              Sort
            </label>
            <div className="relative">
              <ArrowDownUp className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" />
              <select
                id="registry-sort"
                value={sort}
                onChange={(e) => onSortChange(e.target.value as RegistrySortKey)}
                className={cn(
                  'h-9 w-full pl-8 pr-8 text-xs font-medium rounded-md border appearance-none transition-all cursor-pointer',
                  sort !== 'identifier'
                    ? 'border-emerald-500/50 bg-emerald-500/5 text-foreground font-bold'
                    : 'border-border bg-background text-foreground hover:bg-muted/50'
                )}
              >
                {REGISTRY_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Optional: Reason (Archived / Deceased) */}
          {(effectiveStatus === 'Archived' || effectiveStatus === 'Deceased') && onFilterReasonChange && (
            <div className="flex flex-col gap-1 w-full sm:col-span-2 md:col-span-1">
              <label htmlFor="filter-by-reason" className="text-xs font-semibold text-muted-foreground">
                {effectiveStatus === 'Archived' ? 'Archive Reason' : 'Cause of Death'}
              </label>
              <div className="relative">
                <select
                  id="filter-by-reason"
                  value={filterReason}
                  onChange={(e) => onFilterReasonChange(e.target.value)}
                  className={cn(
                    'h-9 w-full px-3 pr-8 text-xs font-medium rounded-md border appearance-none transition-all cursor-pointer',
                    filterReason !== 'all'
                      ? 'border-emerald-500/50 bg-emerald-500/5 text-foreground font-bold'
                      : 'border-border bg-background text-foreground hover:bg-muted/50'
                  )}
                >
                  <option value="all">{effectiveStatus === 'Archived' ? 'All Reasons' : 'All Causes'}</option>
                  {reasonOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Chips & Reset All */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 animate-fadeIn">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active filters:
          </span>

          {query.trim() && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
              <span>Search: &ldquo;{query}&rdquo;</span>
              <button
                type="button"
                onClick={() => onQueryChange('')}
                className="hover:text-emerald-950 dark:hover:text-white cursor-pointer"
                aria-label="Remove search filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterSire !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border">
              <span>Father: {filterSire}</span>
              <button
                type="button"
                onClick={() => onFilterSireChange('all')}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Remove sire filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterDam !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border">
              <span>Mother: {filterDam}</span>
              <button
                type="button"
                onClick={() => onFilterDamChange('all')}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Remove dam filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterStage !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border">
              <span>Stage: {filterStage}</span>
              <button
                type="button"
                onClick={() => onFilterStageChange('all')}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Remove stage filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterBreed !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border">
              <span>Breed: {filterBreed}</span>
              <button
                type="button"
                onClick={() => onFilterBreedChange('all')}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Remove breed filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterFights !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border">
              <span>Fights: {filterFights === 'with' ? 'With records' : 'Without records'}</span>
              <button
                type="button"
                onClick={() => onFilterFightsChange('all')}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Remove fight filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterReason !== 'all' && onFilterReasonChange && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border">
              <span>Reason: {filterReason}</span>
              <button
                type="button"
                onClick={() => onFilterReasonChange('all')}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Remove reason filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline px-1.5 py-1 ml-auto cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset all</span>
          </button>
        </div>
      )}

      {/* Mobile live count (visible only on small screens) */}
      <div className="sm:hidden flex items-center justify-between pt-1 border-t border-border/40 text-xs">
        <span className="text-muted-foreground">Results:</span>
        <span className={cn('font-mono font-bold', filteredCount === 0 && 'text-danger')}>
          {filteredCount} of {totalCount}
        </span>
      </div>
    </div>
  );
}
