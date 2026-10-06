'use client';
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  dateKeyOf,
  dateKeyToMs,
  formatShortDate,
  presetDateKeys,
  type DateRangeCustom,
  type DateRangePreset,
} from '@/lib/helpers';

const PRESET_CHIPS: { id: DateRangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
  { id: '3m', label: 'Last 3 months' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type MonthView = { y: number; m: number };

const pad2 = (n: number) => String(n).padStart(2, '0');

const viewOf = (key: string): MonthView => {
  const d = new Date(dateKeyToMs(key));
  return { y: d.getFullYear(), m: d.getMonth() };
};

const shiftMonth = (view: MonthView, delta: number): MonthView => {
  const d = new Date(view.y, view.m + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
};

type CalendarProps = {
  title: string;
  view: MonthView;
  onViewChange: (v: MonthView) => void;
  range: DateRangeCustom;
  disabledBefore?: string;
  todayKey: string;
  onPick: (key: string) => void;
};

function MonthCalendar({ title, view, onViewChange, range, disabledBefore, todayKey, onPick }: CalendarProps) {
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const leading = new Date(view.y, view.m, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-3" role="group" aria-label={`${title} calendar`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{title}</p>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          aria-label={`Previous month (${title})`}
          onClick={() => onViewChange(shiftMonth(view, -1))}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <span className="text-sm font-black text-card-foreground">
          {MONTH_NAMES[view.m]} {view.y}
        </span>
        <button
          type="button"
          aria-label={`Next month (${title})`}
          onClick={() => onViewChange(shiftMonth(view, 1))}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1" aria-hidden="true">
        {DOW.map((d) => (
          <span key={d} className="text-[10px] font-black text-muted-foreground text-center uppercase">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} className="h-8 sm:h-9" />;
          const key = `${view.y}-${pad2(view.m + 1)}-${pad2(day)}`;
          const isStart = !!range.start && key === range.start;
          const isEnd = !!range.end && key === range.end;
          const inRange =
            !!range.start && !!range.end && key > range.start && key < range.end;
          const isToday = key === todayKey;
          const disabled = !!disabledBefore && key < disabledBefore;

          let cls =
            'h-8 sm:h-9 w-full rounded-md text-xs font-bold flex items-center justify-center transition-colors ';
          if (disabled) {
            cls += 'text-muted-foreground/40 cursor-not-allowed';
          } else if (isStart) {
            cls += 'bg-emerald-600 text-white shadow-sm';
          } else if (isEnd) {
            cls += 'bg-sky-600 text-white shadow-sm';
          } else if (inRange) {
            cls += 'bg-emerald-500/15 text-card-foreground';
          } else {
            cls += 'text-card-foreground hover:bg-muted';
          }
          if (isToday && !isStart && !isEnd && !disabled) {
            cls += ' ring-1 ring-inset ring-emerald-500/60';
          }

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-label={`${MONTH_NAMES[view.m]} ${day}, ${view.y}`}
              aria-pressed={isStart || isEnd}
              onClick={() => !disabled && onPick(key)}
              className={cls}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  label: string;
  preset: DateRangePreset;
  custom: DateRangeCustom;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (preset: DateRangePreset, custom: DateRangeCustom) => void;
  children?: (close: () => void) => React.ReactNode;
};

function resolveRange(preset: DateRangePreset, custom: DateRangeCustom, now: number): DateRangeCustom {
  if (preset === 'all' || preset === 'custom') return custom;
  return presetDateKeys(preset, now) ?? custom;
}

type PopoverProps = {
  preset: DateRangePreset;
  custom: DateRangeCustom;
  onOpenChange: (open: boolean) => void;
  onApply: (preset: DateRangePreset, custom: DateRangeCustom) => void;
  children?: (close: () => void) => React.ReactNode;
};

function RangePopover({ preset, custom, onOpenChange, onApply, children }: PopoverProps) {
  const [now] = useState(() => Date.now());
  const initial = resolveRange(preset, custom, now);
  const [draftPreset, setDraftPreset] = useState<DateRangePreset>(preset);
  const [draft, setDraft] = useState<DateRangeCustom>(initial);
  const [startView, setStartView] = useState<MonthView>(() => viewOf(initial.start));
  const [endView, setEndView] = useState<MonthView>(() => viewOf(initial.end));

  const close = () => onOpenChange(false);

  const pickPreset = (id: DateRangePreset) => {
    if (id === 'all' || id === 'custom') {
      setDraftPreset(id);
      return;
    }
    const keys = presetDateKeys(id, now);
    if (!keys) return;
    setDraft(keys);
    setDraftPreset(id);
    setStartView(viewOf(keys.start));
    setEndView(viewOf(keys.end));
  };

  const pickStart = (key: string) => {
    setDraftPreset('custom');
    setDraft((d) => ({ start: key, end: key < d.end ? d.end : key }));
  };

  const pickEnd = (key: string) => {
    if (key < draft.start) return;
    setDraftPreset('custom');
    setDraft((d) => ({ ...d, end: key }));
  };

  const apply = () => {
    onApply(draftPreset, draft);
    close();
  };

  const showRange = draftPreset !== 'all';
  const startText = showRange && draft.start ? formatShortDate(dateKeyToMs(draft.start)) : '—';
  const endText = showRange && draft.end ? formatShortDate(dateKeyToMs(draft.end)) : '—';
  const todayKey = dateKeyOf(now);

  return (
    <div
      role="dialog"
      aria-label="Select date range"
      className="absolute right-0 mt-2 z-50 w-[min(92vw,42rem)] bg-popover rounded-lg border border-border shadow-xl p-3 space-y-3"
    >
      <div className="flex flex-wrap gap-1.5">
        {PRESET_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => pickPreset(chip.id)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-black border transition-colors cursor-pointer ${
              draftPreset === chip.id
                ? 'bg-emerald-500/15 text-success border-emerald-500/40'
                : 'text-muted-foreground border-transparent hover:bg-muted'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/60 border border-border px-3 py-2 text-xs">
          <span className="font-bold text-muted-foreground">Start: </span>
          <span className="font-black text-emerald-700 dark:text-emerald-300">{startText}</span>
        </div>
        <div className="rounded-md bg-muted/60 border border-border px-3 py-2 text-xs">
          <span className="font-bold text-muted-foreground">End: </span>
          <span className="font-black text-sky-700 dark:text-sky-300">{endText}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MonthCalendar
          title="Start Date"
          view={startView}
          onViewChange={setStartView}
          range={draft}
          todayKey={todayKey}
          onPick={pickStart}
        />
        <MonthCalendar
          title="End Date"
          view={endView}
          onViewChange={setEndView}
          range={draft}
          disabledBefore={draft.start || undefined}
          todayKey={todayKey}
          onPick={pickEnd}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={close}
          className="px-4 py-2 rounded-md text-sm font-black text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={apply}
          className="px-5 py-2 rounded-md text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
        >
          Apply
        </button>
      </div>

      {children && (
        <>
          <div className="h-px bg-border" />
          {children(close)}
        </>
      )}
    </div>
  );
}

export default function DateRangePicker({ label, preset, custom, open, onOpenChange, onApply, children }: Props) {
  const close = () => onOpenChange(false);

  return (
    <div className="relative self-start md:self-auto">
      {open && <div className="fixed inset-0 z-40" onClick={close} aria-hidden="true" />}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="bg-muted hover:bg-muted/60 text-foreground border border-border px-4 py-2.5 rounded-lg text-sm font-black transition-all cursor-pointer flex items-center space-x-2 shadow-2xs"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
        <span>{label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open && (
        <RangePopover
          preset={preset}
          custom={custom}
          onOpenChange={onOpenChange}
          onApply={onApply}
        >
          {children}
        </RangePopover>
      )}
    </div>
  );
}
