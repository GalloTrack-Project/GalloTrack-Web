'use client';
import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
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

function MonthCalendar({
  title,
  view,
  onViewChange,
  range,
  disabledBefore,
  todayKey,
  onPick,
}: CalendarProps) {
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const leading = new Date(view.y, view.m, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      className="rounded-xl border border-slate-200/80 dark:border-border bg-white dark:bg-card/40 p-4"
      role="group"
      aria-label={`${title} calendar`}
    >
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label={`Previous month (${title})`}
          onClick={() => onViewChange(shiftMonth(view, -1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            {title}
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {MONTH_NAMES[view.m]} {view.y}
          </span>
        </div>
        <button
          type="button"
          aria-label={`Next month (${title})`}
          onClick={() => onViewChange(shiftMonth(view, 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Day of Week Labels */}
      <div className="grid grid-cols-7 mb-1" aria-hidden="true">
        {DOW.map((d) => (
          <span
            key={d}
            className="text-xs font-medium text-slate-400 dark:text-slate-500 text-center uppercase py-1"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Date Grid */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-0">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`blank-${i}`} className="h-8 sm:h-9 w-full" />;
          }

          const key = `${view.y}-${pad2(view.m + 1)}-${pad2(day)}`;
          const isStart = Boolean(range.start && key === range.start);
          const isEnd = Boolean(range.end && key === range.end);
          const isSameDay = isStart && isEnd;
          const hasFullRange = Boolean(range.start && range.end && range.start < range.end);
          const inRange = Boolean(hasFullRange && key > range.start && key < range.end);
          const isToday = key === todayKey;
          const disabled = Boolean(disabledBefore && key < disabledBefore);
          const dow = i % 7; // 0 = Su, 6 = Sa

          let btnCls =
            'relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs flex items-center justify-center transition-all ';

          if (disabled) {
            btnCls += 'text-slate-300 dark:text-slate-600 cursor-not-allowed';
          } else if (isStart || isEnd) {
            btnCls +=
              'bg-emerald-600 text-white font-semibold shadow-xs hover:bg-emerald-700 active:scale-95 cursor-pointer';
          } else if (inRange) {
            btnCls +=
              'text-slate-900 dark:text-slate-100 font-medium hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 rounded-full cursor-pointer';
          } else {
            btnCls +=
              'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-normal hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer';
          }

          if (isToday && !isStart && !isEnd && !disabled) {
            btnCls += ' ring-1.5 ring-inset ring-emerald-500/50 text-emerald-700 dark:text-emerald-400 font-semibold';
          }

          return (
            <div key={key} className="relative h-8 sm:h-9 flex items-center justify-center">
              {/* Continuous Range Strip */}
              {inRange && (
                <div
                  className={`absolute inset-y-0.5 inset-x-0 bg-emerald-50 dark:bg-emerald-950/40 ${
                    dow === 0 ? 'rounded-l-full' : ''
                  } ${dow === 6 ? 'rounded-r-full' : ''}`}
                />
              )}
              {isStart && hasFullRange && !isSameDay && (
                <div className="absolute inset-y-0.5 right-0 left-1/2 bg-emerald-50 dark:bg-emerald-950/40" />
              )}
              {isEnd && hasFullRange && !isSameDay && (
                <div className="absolute inset-y-0.5 left-0 right-1/2 bg-emerald-50 dark:bg-emerald-950/40" />
              )}

              <button
                type="button"
                disabled={disabled}
                aria-label={`${MONTH_NAMES[view.m]} ${day}, ${view.y}`}
                aria-pressed={isStart || isEnd}
                onClick={() => !disabled && onPick(key)}
                className={btnCls}
              >
                {day}
              </button>
            </div>
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

  const daysCount =
    showRange && draft.start && draft.end
      ? Math.max(1, Math.round((dateKeyToMs(draft.end) - dateKeyToMs(draft.start)) / 86400000) + 1)
      : null;

  return (
    <div
      role="dialog"
      aria-label="Select date range"
      className="absolute right-0 mt-2 z-50 w-[min(94vw,44rem)] bg-white dark:bg-card rounded-2xl border border-slate-200/90 dark:border-border shadow-2xl shadow-slate-900/10 dark:shadow-black/40 p-5 sm:p-6 space-y-4"
    >
      {/* HEADER */}
      <div className="pb-3 border-b border-slate-100 dark:border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
            Select Date Range
          </h3>
          <div className="mt-0.5 flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              {startText} → {endText}
            </span>
            {daysCount !== null && (
              <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                {daysCount} {daysCount === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* QUICK DATE RANGES */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_CHIPS.map((chip) => {
          const isActive = draftPreset === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => pickPreset(chip.id)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-semibold shadow-2xs'
                  : 'bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-muted/50 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* COMPACT START & END DATE INPUTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50/80 dark:bg-muted/30 border border-slate-200 dark:border-border px-3.5 py-2">
          <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Start:</span>
          <span className="text-xs font-semibold text-slate-900 dark:text-white">{startText}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50/80 dark:bg-muted/30 border border-slate-200 dark:border-border px-3.5 py-2">
          <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">End:</span>
          <span className="text-xs font-semibold text-slate-900 dark:text-white">{endText}</span>
        </div>
      </div>

      {/* DUAL CALENDARS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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

      {/* FOOTER */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-border/60">
        <button
          type="button"
          onClick={close}
          className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={apply}
          className="px-5 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          Apply
        </button>
      </div>

      {children && (
        <div className="pt-2 border-t border-slate-100 dark:border-border/60">
          {children(close)}
        </div>
      )}
    </div>
  );
}

export default function DateRangePicker({
  label,
  preset,
  custom,
  open,
  onOpenChange,
  onApply,
  children,
}: Props) {
  const close = () => onOpenChange(false);

  return (
    <div className="relative self-start md:self-auto">
      {open && <div className="fixed inset-0 z-40" onClick={close} aria-hidden="true" />}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-card border border-slate-200/90 dark:border-border hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-muted/40 shadow-2xs transition-all cursor-pointer"
      >
        <CalendarIcon className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
        <span className="font-semibold text-slate-900 dark:text-slate-100">{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
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
