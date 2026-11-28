'use client';

import React from 'react';
import { BadgeCheck, GitBranch, ListChecks, ShieldCheck, Tag } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Z_LAYERS } from '@/lib/ui-layers';
import { cn } from '@/components/ui/utils';
import { MissingFieldsList } from './MissingFieldsList';
import { StatusCard } from './StatusCard';
import type { StatusTone, ValidationFieldItem } from './types';

export type ValidationSummaryPanelProps = {
  nextIdLabel: string;
  requiredFields: ValidationFieldItem[];
  dataCompleteness: number;
  validationTone: StatusTone;
  validationLabel: string;
  validationHelper: string;
  lineageTone: StatusTone;
  lineageLabel: string;
  lineageHelper: string;
  registerBusy: boolean;
  registerLabel: string;
  registerHelper: string;
  /** Optional secondary action (e.g. Cancel) rendered below the register helper. */
  footer?: React.ReactNode;
  /** Pin the submit/cancel controls to the viewport for long forms. */
  stickyActions?: boolean;
};

export function ValidationSummaryPanel({
  nextIdLabel,
  requiredFields,
  dataCompleteness,
  validationTone,
  validationLabel,
  validationHelper,
  lineageTone,
  lineageLabel,
  lineageHelper,
  registerBusy,
  registerLabel,
  registerHelper,
  footer,
  stickyActions = false,
}: ValidationSummaryPanelProps) {
  const { t } = useT();
  const actionBarRef = React.useRef<HTMLDivElement>(null);
  const completed = requiredFields.filter((field) => field.complete).length;
  const total = requiredFields.length;
  const allComplete = total > 0 && completed === total;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const progressText = t('registry.requiredFieldsProgress', {
    done: String(completed),
    total: String(total),
  });

  React.useEffect(() => {
    if (!stickyActions || typeof document === 'undefined') return;
    const bar = actionBarRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty('--form-action-bar-height', `${bar.getBoundingClientRect().height}px`);
    };
    update();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(bar);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      root.style.removeProperty('--form-action-bar-height');
    };
  }, [stickyActions]);

  const submitButton = (
    <button
      type="submit"
      disabled={registerBusy}
      aria-busy={registerBusy}
      aria-describedby="registration-status"
      className={cn(
        'focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-[58px] w-full items-center justify-center gap-2 rounded-full px-4 py-3.5 text-sm font-black tracking-widest uppercase transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        stickyActions && 'sm:w-auto sm:min-w-56',
        registerBusy
          ? 'border-border bg-muted text-muted-foreground cursor-not-allowed border'
          : 'from-sidebar to-sidebar-active cursor-pointer bg-gradient-to-r text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]',
      )}
    >
      {registerBusy ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      <span className="whitespace-nowrap">{registerLabel}</span>
    </button>
  );

  const statusText = (
    <p
      id="registration-status"
      role="status"
      aria-live="polite"
      className={cn(
        'min-w-0 text-center text-xs font-semibold break-words',
        stickyActions && 'order-2 sm:order-1 sm:flex-1 sm:text-left',
        registerBusy ? 'text-warning' : 'text-muted-foreground',
      )}
    >
      {registerHelper}
    </p>
  );

  const footerNode = footer ? (
    <div className={cn('pt-1', stickyActions && 'w-full sm:w-40 sm:shrink-0 sm:pt-0 [&>button]:w-full')}>
      {footer}
    </div>
  ) : null;

  return (
    <section
      data-testid="validation-summary-panel"
      className="bg-card border-primary/10 min-w-0 overflow-hidden rounded-[20px] border p-4 shadow-lg shadow-primary/5 sm:p-5"
    >
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <ShieldCheck className="text-brand-red h-4 w-4 shrink-0" aria-hidden="true" />
        <h3 className="text-brand-red min-w-0 text-xs font-black tracking-widest break-words uppercase">
          {t('registry.validationSummaryPanel')}
        </h3>
      </div>

      <div
        data-testid="validation-summary-grid"
        className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatusCard
          icon={<ListChecks className="h-4 w-4" />}
          title={t('registry.requiredFieldsTitle')}
          badge={{
            tone: allComplete ? 'success' : 'warning',
            label: allComplete
              ? t('registry.requiredFieldsComplete')
              : t('registry.requiredFieldsIncomplete'),
          }}
          value={progressText}
          helper={t('registry.optionalProfileCompleteness', {
            pct: String(dataCompleteness),
          })}
          live
        >
          <div className="min-w-0" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} aria-valuetext={progressText}>
            <div className="h-2.5 w-full overflow-hidden rounded-full border border-border bg-muted">
              <div
                className={cn(
                  'from-brand-red to-brand-orange h-full rounded-full bg-gradient-to-r transition-[width] duration-300',
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </StatusCard>

        <StatusCard
          icon={<BadgeCheck className="h-4 w-4" />}
          title={t('registry.validationStatus')}
          badge={{ tone: validationTone, label: validationLabel }}
          helper={validationHelper}
          live
        />

        <StatusCard
          icon={<GitBranch className="h-4 w-4" />}
          title={t('registry.lineageStatus')}
          badge={{ tone: lineageTone, label: lineageLabel }}
          helper={lineageHelper}
          live
        />

        <StatusCard
          icon={<Tag className="h-4 w-4" />}
          title={t('registry.nextIdTitle')}
          value={nextIdLabel}
          helper={t('registry.nextIdLabel', { id: nextIdLabel })}
        />
      </div>

      <MissingFieldsList items={requiredFields} />

      {stickyActions ? (
        <div
          ref={actionBarRef}
          data-testid="form-action-bar"
          className="bg-card border-border fixed inset-x-0 bottom-0 border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:left-64 md:px-6 dark:shadow-[0_-4px_16px_rgba(0,0,0,0.35)]"
          style={{ zIndex: Z_LAYERS.actionBar }}
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {statusText}
            <div className="order-1 flex min-w-0 flex-col gap-2 sm:order-2 sm:flex-row sm:items-center">
              {footerNode}
              {submitButton}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {submitButton}
          {statusText}
          {footerNode}
        </div>
      )}
    </section>
  );
}
