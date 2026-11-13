'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import {
  sortParentEntries,
  type ParentPickerEntry,
  type ParentPickerSort,
} from '@/lib/lineage-parent-picker';
import { recordLabel } from './LineageBirdCard';

const ITEM_HEIGHT = 64;
const VIRTUALIZE_AFTER = 100;
const VIEWPORT_HEIGHT = 256;

type Props = {
  kind: 'sire' | 'dam';
  entries: ParentPickerEntry[];
  selected: ParentPickerEntry | null;
  sort: ParentPickerSort;
  onSortChange: (sort: ParentPickerSort) => void;
  onSelect: (name: string) => void;
  defaultOpen?: boolean;
};

export default function ParentCombobox({
  kind,
  entries,
  selected,
  sort,
  onSortChange,
  onSelect,
  defaultOpen = false,
}: Props) {
  const noun = kind === 'sire' ? 'sire' : 'dam';
  const plural = kind === 'sire' ? 'sires' : 'dams';
  const listboxId = `${kind}-parent-listbox`;
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const ordered = useMemo(() => sortParentEntries(entries, sort), [entries, sort]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) ||
        entry.code.toLowerCase().includes(q) ||
        entry.wingBand.toLowerCase().includes(q),
    );
  }, [ordered, query]);
  const virtualized = filtered.length > VIRTUALIZE_AFTER;
  const startIndex = virtualized
    ? Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 4)
    : 0;
  const endIndex = virtualized
    ? Math.min(filtered.length, startIndex + Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT) + 8)
    : filtered.length;
  const activeEntry = filtered[activeIndex];
  const activeOptionId =
    activeIndex >= 0 && activeIndex < filtered.length
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const option = document.getElementById(`${listboxId}-option-${activeIndex}`);
    if (typeof option?.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, listboxId, open]);

  useEffect(() => {
    if (!open || !virtualized || !listRef.current || activeIndex < 0) return;
    const list = listRef.current;
    const top = activeIndex * ITEM_HEIGHT;
    if (top < list.scrollTop) {
      list.scrollTop = top;
    } else if (top + ITEM_HEIGHT > list.scrollTop + VIEWPORT_HEIGHT) {
      list.scrollTop = top + ITEM_HEIGHT - VIEWPORT_HEIGHT;
    }
    setScrollTop(list.scrollTop);
  }, [activeIndex, open, virtualized]);

  function openPicker() {
    setOpen(true);
    setQuery('');
    setActiveIndex(0);
    setScrollTop(0);
  }

  function closePicker() {
    setOpen(false);
    setQuery('');
    inputRef.current?.focus();
  }

  function choose(entry: ParentPickerEntry) {
    onSelect(entry.name);
    setOpen(false);
    setQuery('');
    inputRef.current?.focus();
  }

  function move(delta: number) {
    if (ordered.length === 0) return;
    const index = ordered.findIndex((entry) => entry.name === selected?.name);
    const base = index >= 0 ? index : 0;
    const next = (base + delta + ordered.length) % ordered.length;
    onSelect(ordered[next].name);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPicker();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(filtered.length - 1, current + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, filtered.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeEntry) choose(activeEntry);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePicker();
    }
  }

  function renderOption(entry: ParentPickerEntry, index: number, style?: React.CSSProperties) {
    const isActive = index === activeIndex;
    const isSelected = entry.name === selected?.name;
    return (
      <button
        key={entry.name}
        id={`${listboxId}-option-${index}`}
        type="button"
        role="option"
        aria-selected={isSelected}
        tabIndex={-1}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(entry)}
        style={style}
        className={`border-border flex min-h-16 w-full cursor-pointer items-center gap-2 border-b px-3 py-2 text-left transition-colors last:border-b-0 ${
          isActive
            ? 'bg-emerald-50 dark:bg-emerald-950/40'
            : isSelected
              ? 'bg-muted/70'
              : 'bg-card hover:bg-muted/50'
        }`}
      >
        <span className="border-border bg-muted text-foreground shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs font-black uppercase">
          {formatBirdCodeForDisplay(entry.code)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-card-foreground block truncate text-sm font-black">
            {entry.name}
          </span>
          <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold">
            <span>{entry.children.length} offspring</span>
            <span aria-hidden="true">·</span>
            <span>{recordLabel(entry.stats)}</span>
          </span>
        </span>
        {isSelected && (
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
            <Check className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Selected</span>
          </span>
        )}
      </button>
    );
  }

  const closedLabel = selected
    ? `Select ${noun}, ${selected.name}, ${selected.children.length} offspring`
    : `Select ${noun}`;

  return (
    <div ref={wrapperRef} className="relative min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label={open ? `Search ${plural}` : closedLabel}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={open ? activeOptionId : undefined}
            readOnly={!open}
            value={open ? query : ''}
            placeholder={open ? `Search ${plural} by name, code, or wing band...` : ''}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
              setScrollTop(0);
            }}
            onClick={() => {
              if (!open) openPicker();
            }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            className="border-input-border bg-card text-foreground placeholder:text-muted-foreground min-h-11 w-full cursor-pointer rounded-lg border py-2 pr-9 pl-3 text-sm font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none sm:min-h-10"
          />
          {!open && (
            <span className="pointer-events-none absolute inset-0 flex min-w-0 items-center gap-2 py-2 pr-9 pl-3">
              {selected ? (
                <>
                  <span className="border-border bg-muted text-foreground shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs font-black uppercase">
                    {formatBirdCodeForDisplay(selected.code)}
                  </span>
                  <span className="text-card-foreground min-w-0 flex-1 truncate text-sm font-black">
                    {selected.name}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs font-semibold">
                    {selected.children.length} offspring
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground text-sm font-semibold">Select {noun}</span>
              )}
            </span>
          )}
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        </div>

        <button
          type="button"
          onClick={() => move(-1)}
          disabled={ordered.length <= 1}
          aria-label={`Previous ${noun}`}
          title={`Previous ${noun}`}
          className="border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          disabled={ordered.length <= 1}
          aria-label={`Next ${noun}`}
          title={`Next ${noun}`}
          className="border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {open ? `Showing ${filtered.length} of ${entries.length} ${plural}` : ''}
      </span>

      {open && (
        <div className="bg-card border-border absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-lg border shadow-xl">
          <div className="border-border flex flex-wrap items-center gap-2 border-b p-2.5">
            <label className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1.5 text-xs font-bold">
              Sort
              <select
                value={sort}
                onChange={(event) => onSortChange(event.target.value as ParentPickerSort)}
                aria-label={`Sort ${plural}`}
                className="border-input-border bg-card text-foreground h-9 min-w-0 flex-1 cursor-pointer rounded border px-2 text-xs font-bold focus:border-emerald-500 focus:outline-none"
              >
                <option value="most">Most offspring</option>
                <option value="name">Name</option>
                <option value="code">Code</option>
              </select>
            </label>
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold">
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              {query.trim() ? 'Filtered' : 'All'}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-muted-foreground space-y-1 p-5 text-center text-xs font-semibold">
              <p className="text-card-foreground text-sm font-black">No {plural} found</p>
              <p>Try a different name, code, or wing band.</p>
            </div>
          ) : virtualized ? (
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={`${noun === 'sire' ? 'Sires' : 'Dams'} list`}
              style={{ height: VIEWPORT_HEIGHT }}
              className="overflow-y-auto"
              onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            >
              <div style={{ height: filtered.length * ITEM_HEIGHT, position: 'relative' }}>
                {filtered.slice(startIndex, endIndex).map((entry, offset) => {
                  const index = startIndex + offset;
                  return renderOption(entry, index, {
                    position: 'absolute',
                    top: index * ITEM_HEIGHT,
                    left: 0,
                    right: 0,
                    height: ITEM_HEIGHT,
                  });
                })}
              </div>
            </div>
          ) : (
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={`${noun === 'sire' ? 'Sires' : 'Dams'} list`}
              className="max-h-64 overflow-y-auto"
            >
              {filtered.map((entry, index) => renderOption(entry, index))}
            </div>
          )}

          <div
            data-testid="parent-picker-count"
            className="border-border text-muted-foreground border-t px-3 py-2 text-xs font-semibold"
          >
            Showing {filtered.length} of {entries.length} {plural}
          </div>
        </div>
      )}
    </div>
  );
}
