'use client';

import React from 'react';
import { ChevronDown, Download, Printer, RefreshCw } from 'lucide-react';
import DateRangePicker from '@/components/DateRangePicker';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useT } from '@/lib/i18n';

export type DashboardHeaderAction = 'matches' | 'registry' | 'print' | 'sync';

export function dispatchDashboardAction(action: DashboardHeaderAction): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('gt-dashboard-action', { detail: action }));
}

export default function DashboardHeaderActions() {
  const t = useT();
  const {
    dateRangeLabel,
    dateRangeOpen,
    setDateRangeOpen,
    dateRangePreset,
    setDateRangePreset,
    dateRangeCustom,
    setDateRangeCustom,
    loading,
  } = useFowl();
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <div className="hidden lg:block">
        <DateRangePicker
          label={dateRangeLabel}
          preset={dateRangePreset}
          custom={dateRangeCustom}
          open={dateRangeOpen}
          onOpenChange={setDateRangeOpen}
          onApply={(preset, custom) => {
            setDateRangePreset(preset);
            setDateRangeCustom(custom);
          }}
        />
      </div>
      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={t('heritage.exportReports')}
          aria-haspopup="menu"
          aria-expanded={open}
          className="border-border bg-card text-foreground hover:bg-muted flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-2.5 text-xs font-black shadow-2xs sm:px-3"
        >
          <Download className="text-brand-orange h-4 w-4" aria-hidden="true" />
          <span className="hidden xl:inline">{t('heritage.exportReports')}</span>
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {open && (
          <div
            role="menu"
            className="border-border bg-popover text-popover-foreground absolute top-full right-0 z-50 mt-2 w-60 rounded-xl border p-2 shadow-xl"
          >
            <p className="text-muted-foreground px-2.5 py-1 text-xs font-black tracking-wider uppercase">
              {t('heritage.exportData')}
            </p>
            {(
              [
                ['matches', t('heritage.exportMatches')],
                ['registry', t('heritage.exportRegistry')],
                ['print', t('heritage.printReport')],
              ] as const
            ).map(([action, label]) => (
              <button
                key={action}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  dispatchDashboardAction(action);
                }}
                className="hover:bg-muted flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-xs font-bold"
              >
                {action === 'print' ? (
                  <Printer className="text-muted-foreground h-4 w-4" aria-hidden="true" />
                ) : (
                  <Download className="text-brand-orange h-4 w-4" aria-hidden="true" />
                )}
                {label}
              </button>
            ))}
            <div className="bg-border my-1 h-px" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                dispatchDashboardAction('sync');
              }}
              disabled={loading}
              className="hover:bg-muted flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-xs font-bold disabled:opacity-50"
            >
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
              {loading ? t('heritage.syncing') : t('heritage.syncData')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
