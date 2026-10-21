'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  dateKeyOf,
  dateKeyToMs,
  formatShortDate,
  presetDateKeys,
  type DateRangeCustom,
  type DateRangePreset,
} from '@/lib/helpers';
import { cn } from '@/components/ui';
import { useT } from '@/lib/i18n';

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
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer"
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
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {DOW.map((d) => (
          <span key={d} className="text-xs font-medium text-slate-400 dark:text-slate-500 py-1">
            {d}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-8 sm:h-9" />;
          }

          const key = `${view.y}-${pad2(view.m + 1)}-${pad2(day)}`;
          const isToday = key === todayKey;
          const isStart = range.start === key;
          const isEnd = range.end === key;
          const inRange = Boolean(range.start && range.end && key > range.start && key < range.end);
          const disabled = Boolean(disabledBefore && key < disabledBefore);
          const dow = (leading + day - 1) % 7;
          const isSameDay = isStart && isEnd;
          const hasFullRange = Boolean(range.start && range.end);

          let btnCls =
            'relative z-10 w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer ';

          if (disabled) {
            btnCls += 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40 ';
          } else if (isStart || isEnd) {
            btnCls += 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/30 ';
          } else if (inRange) {
            btnCls +=
              'text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 ';
          } else if (isToday) {
            btnCls +=
              'text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-400/60 dark:border-emerald-600/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 ';
          } else {
            btnCls +=
              'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-900 dark:hover:text-white ';
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

export type Props = {
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
  const { t } = useT();
  const [now] = useState(() => Date.now());
  const initial = resolveRange(preset, custom, now);
  const [draftPreset, setDraftPreset] = useState<DateRangePreset>(preset);
  const [draft, setDraft] = useState<DateRangeCustom>(initial);
  const [startView, setStartView] = useState<MonthView>(() => viewOf(initial.start));
  const [endView, setEndView] = useState<MonthView>(() => viewOf(initial.end));
  const [mobileCalTab, setMobileCalTab] = useState<'start' | 'end'>('start');

  const close = () => onOpenChange(false);

  // Lock body scroll while open; restore on unmount or close
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  // Escape key closes and discards pending changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <>
      {/* BACKDROP: Modal overlay on phone (z-[60]), light overlay on desktop (sm:z-40) */}
      <div
        className="fixed inset-0 z-[60] sm:z-40 bg-black/60 sm:bg-black/20 backdrop-blur-xs transition-opacity"
        onClick={close}
        aria-hidden="true"
      />

      {/* DIALOG CONTAINER */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select date range"
        className={cn(
          // Mobile bottom sheet / dialog (< sm): Full viewport width with 12px margin, max 85dvh, internal scroll, pinned footer
          'fixed inset-x-3 bottom-3 z-[70] max-h-[85vh] max-h-[85dvh] flex flex-col',
          'bg-white dark:bg-card rounded-2xl border border-slate-200/90 dark:border-border shadow-2xl shadow-slate-900/20 dark:shadow-black/60',
          // Desktop anchored popover (>= sm): Anchor to trigger at right-0, max-w-44rem, unconstrained height
          'sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:mt-2 sm:w-[min(94vw,44rem)] sm:max-h-none sm:z-50'
        )}
      >
        {/* HEADER */}
        <div className="p-4 sm:p-6 pb-3 border-b border-slate-100 dark:border-border/60 flex items-center justify-between gap-2 shrink-0">
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
                  {t('dateRange.daysCount', { count: daysCount, days: daysCount === 1 ? t('dateRange.daySingle') : t('dateRange.dayPlural') })}
                </span>
              )}
            </div>
          </div>
          {/* Close button with 44px min touch target */}
          <button
            type="button"
            onClick={close}
            aria-label="Close date range dialog"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* SCROLLABLE DIALOG BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-3 space-y-4 overscroll-contain">
          {/* QUICK DATE RANGES (Presets wrap onto multiple lines without horizontal overflow) */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_CHIPS.map((chip) => {
              const isActive = draftPreset === chip.id;
              const chipLabel = (() => {
                switch (chip.id) {
                  case 'today': return t('dateRange.today');
                  case '7d': return t('dateRange.last7Days');
                  case '30d': return t('dateRange.last30Days');
                  case 'month': return t('dateRange.thisMonth');
                  case 'all': return t('dateRange.allTime');
                  case 'custom': return t('dateRange.customRange');
                  default: return chip.label;
                }
              })();
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => pickPreset(chip.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border min-h-[36px] flex items-center justify-center ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-semibold shadow-2xs'
                      : 'bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-muted/50 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  {chipLabel}
                </button>
              );
            })}
          </div>

          {/* COMPACT START & END DATE INPUTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50/80 dark:bg-muted/30 border border-slate-200 dark:border-border px-3.5 py-2">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('dateRange.startDate')}:</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">{startText}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50/80 dark:bg-muted/30 border border-slate-200 dark:border-border px-3.5 py-2">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('dateRange.endDate')}:</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">{endText}</span>
            </div>
          </div>

          {/* MOBILE SINGLE MONTH CALENDAR SWITCHER (< sm) */}
          <div className="sm:hidden flex border border-slate-200 dark:border-border rounded-xl p-1 bg-slate-100 dark:bg-muted/40">
            <button
              type="button"
              data-testid="mobile-cal-tab-start"
              onClick={() => setMobileCalTab('start')}
              className={cn(
                'flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[40px]',
                mobileCalTab === 'start'
                  ? 'bg-white dark:bg-card text-emerald-700 dark:text-emerald-400 shadow-2xs border border-slate-200/60 dark:border-border'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              Start Date ({startText})
            </button>
            <button
              type="button"
              data-testid="mobile-cal-tab-end"
              onClick={() => setMobileCalTab('end')}
              className={cn(
                'flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[40px]',
                mobileCalTab === 'end'
                  ? 'bg-white dark:bg-card text-emerald-700 dark:text-emerald-400 shadow-2xs border border-slate-200/60 dark:border-border'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              End Date ({endText})
            </button>
          </div>

          {/* MOBILE VIEW: SINGLE MONTH AT A TIME */}
          <div data-testid="mobile-calendar" className="block sm:hidden">
            {mobileCalTab === 'start' ? (
              <MonthCalendar
                title="Start Date"
                view={startView}
                onViewChange={setStartView}
                range={draft}
                todayKey={todayKey}
                onPick={(k) => {
                  pickStart(k);
                  setMobileCalTab('end');
                }}
              />
            ) : (
              <MonthCalendar
                title="End Date"
                view={endView}
                onViewChange={setEndView}
                range={draft}
                disabledBefore={draft.start || undefined}
                todayKey={todayKey}
                onPick={pickEnd}
              />
            )}
          </div>

          {/* DESKTOP VIEW: DUAL CALENDARS (>= sm) */}
          <div data-testid="desktop-calendars" className="hidden sm:grid sm:grid-cols-2 gap-3.5">
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

          {children && (
            <div className="pt-2 border-t border-slate-100 dark:border-border/60">
              {children(close)}
            </div>
          )}
        </div>

        {/* PINNED FOOTER: Apply & Cancel buttons above safe-area inset */}
        <div className="p-4 sm:p-6 pt-3 border-t border-slate-100 dark:border-border/60 flex items-center justify-end gap-2.5 shrink-0 bg-white dark:bg-card rounded-b-2xl pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
          <button
            type="button"
            onClick={close}
            className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer"
          >
            {t('dateRange.cancel')}
          </button>
          <button
            type="button"
            onClick={apply}
            className="h-11 px-6 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            {t('dateRange.apply')}
          </button>
        </div>
      </div>
    </>
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      triggerRef.current?.focus();
    }
    onOpenChange(nextOpen);
  };

  return (
    <div className="relative self-start md:self-auto">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => handleOpenChange(!open)}
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
          onOpenChange={handleOpenChange}
          onApply={onApply}
        >
          {children}
        </RangePopover>
      )}
    </div>
  );
}
