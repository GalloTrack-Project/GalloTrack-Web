'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/components/ui/utils';
import { StatusBadge } from './StatusBadge';
import type { ValidationFieldItem } from './types';

export type MissingFieldsListProps = {
  items: ValidationFieldItem[];
  title?: string;
};

function focusField(targetId: string) {
  if (typeof document === 'undefined') return;
  const field = document.getElementById(targetId);
  if (!field) return;
  if (typeof field.scrollIntoView === 'function') {
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  field.focus({ preventScroll: true });
}

export function MissingFieldsList({ items, title }: MissingFieldsListProps) {
  const { t } = useT();
  const completed = items.filter((item) => item.complete).length;
  const allComplete = items.length > 0 && completed === items.length;

  return (
    <div
      className="mt-4 min-w-0 rounded-lg border border-border bg-card/60 p-3.5 sm:p-4"
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h4 className="min-w-0 text-xs font-black tracking-wider break-words text-muted-foreground uppercase">
          {title || t('registry.requiredFieldsChecklistTitle')}
        </h4>
        <StatusBadge tone={allComplete ? 'success' : 'warning'}>
          {allComplete
            ? t('registry.requiredFieldsComplete')
            : t('registry.requiredFieldsIncomplete')}
        </StatusBadge>
      </div>

      <ul className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className="min-w-0">
            <button
              type="button"
              data-field-key={item.key}
              onClick={() => focusField(item.targetId)}
              aria-label={`${t('registry.focusFieldAria', { field: item.label })} — ${
                item.complete
                  ? t('registry.requiredFieldComplete')
                  : t('registry.requiredFieldMissing')
              }`}
              className={cn(
                'flex min-h-[44px] w-full min-w-0 items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors',
                'focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                item.complete
                  ? 'border-success/30 bg-success/10 hover:bg-success/15'
                  : 'border-warning/30 bg-warning/5 hover:bg-warning/10',
              )}
            >
              {item.complete ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 text-xs font-bold break-words text-foreground">
                {item.label}
              </span>
              <span
                className={cn(
                  'shrink-0 text-xs font-black tracking-wider uppercase',
                  item.complete ? 'text-success' : 'text-warning',
                )}
              >
                {item.complete
                  ? t('registry.requiredFieldComplete')
                  : t('registry.requiredFieldMissing')}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {allComplete ? (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs font-bold text-success">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{t('registry.requiredFieldsAllComplete')}</span>
        </p>
      ) : null}
    </div>
  );
}
