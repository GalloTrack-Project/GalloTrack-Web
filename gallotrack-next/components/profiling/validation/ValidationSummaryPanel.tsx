'use client';

import React from 'react';
import { BadgeCheck, GitBranch, ListChecks } from 'lucide-react';
import { useT } from '@/lib/i18n';
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
  registerDisabled: boolean;
  registerBusy: boolean;
  registerLabel: string;
  registerHelper: string;
  /** Optional secondary action (e.g. Cancel) rendered below the register helper. */
  footer?: React.ReactNode;
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
  registerDisabled,
  registerBusy,
  registerLabel,
  registerHelper,
  footer,
}: ValidationSummaryPanelProps) {
  const { t } = useT();
  const completed = requiredFields.filter((field) => field.complete).length;
  const total = requiredFields.length;
  const allComplete = total > 0 && completed === total;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const progressText = t('registry.requiredFieldsProgress', {
    done: String(completed),
    total: String(total),
  });

  return (
    <section
      data-testid="validation-summary-panel"
      className="min-w-0 overflow-hidden rounded-lg border-2 border-slate-900 bg-white p-4 shadow-sm sm:p-5 dark:border-border dark:bg-card"
    >
      <div className="mb-4 flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
          <h3 className="min-w-0 text-xs font-black tracking-widest break-words text-muted-foreground uppercase">
            {t('registry.validationSummaryPanel')}
          </h3>
        </div>
        <span className="self-start rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-black break-words text-emerald-700 sm:self-auto dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
          {t('registry.nextIdLabel', { id: nextIdLabel })}
        </span>
      </div>

      <div
        data-testid="validation-summary-grid"
        className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3"
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
                  'h-full rounded-full transition-[width] duration-300',
                  allComplete ? 'bg-success' : 'bg-warning',
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
      </div>

      <MissingFieldsList items={requiredFields} />

      <div className="mt-4 space-y-2">
        <button
          type="submit"
          disabled={registerDisabled || registerBusy}
          aria-busy={registerBusy}
          aria-describedby="registration-status"
          className={cn(
            'flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-black tracking-widest uppercase transition-all',
            'focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
            registerDisabled || registerBusy
              ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
              : 'cursor-pointer bg-slate-900 text-white shadow-md hover:bg-emerald-700 active:scale-[0.99]',
          )}
        >
          {registerBusy ? (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
          ) : null}
          <span>{registerLabel}</span>
        </button>

        <p
          id="registration-status"
          role="status"
          aria-live="polite"
          className={cn(
            'text-center text-xs font-semibold break-words',
            registerDisabled || registerBusy ? 'text-warning' : 'text-muted-foreground',
          )}
        >
          {registerHelper}
        </p>

        {footer ? <div className="pt-1">{footer}</div> : null}
      </div>
    </section>
  );
}
