'use client';

import React from 'react';
import type { BreedingClassification } from '@/lib/breeding-classification';
import { cn } from '@/components/ui/utils';

interface BreedingTypeBadgeProps {
  classification: BreedingClassification;
  className?: string;
  compact?: boolean;
}

export default function BreedingTypeBadge({
  classification,
  className,
  compact = false,
}: BreedingTypeBadgeProps) {
  const { type, badgeLabel, tooltipText, compositionSource, basedOnAssumed } = classification;

  let qualifierText = '';
  let compactMarker = '';
  let qualifierExplanation = '';

  if (compositionSource === 'adjusted') {
    qualifierText = '(adjusted)';
    compactMarker = '*';
    qualifierExplanation = 'Adjusted by owner';
  } else if (compositionSource === 'declared') {
    qualifierText = '(declared)';
    compactMarker = '†';
    qualifierExplanation = 'Declared by owner';
  } else if (compositionSource === 'assumed' || basedOnAssumed) {
    qualifierText = '(assumed)';
    compactMarker = '~';
    qualifierExplanation =
      compositionSource === 'assumed'
        ? 'Assumed from registered breed (not verified)'
        : 'Lineage includes assumed foundation stock';
  }

  const hasQualifier = qualifierText !== '';
  const fullTooltip = hasQualifier
    ? `${tooltipText} · ${qualifierExplanation}`
    : tooltipText;

  let colorClasses = '';
  if (type === 'Purebred') {
    colorClasses =
      'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
  } else if (type === 'Crossbred') {
    colorClasses =
      'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';
  } else {
    colorClasses =
      'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-muted/80 border-slate-300 dark:border-border';
  }

  return (
    <span
      className={cn(
        'antigravity-badge inline-flex items-center gap-1 text-xs font-black border px-2.5 py-0.5 rounded-full uppercase tracking-tight transition-colors',
        colorClasses,
        className
      )}
      title={fullTooltip}
      aria-label={hasQualifier ? `${badgeLabel} ${qualifierText}` : badgeLabel}
    >
      <span>{badgeLabel}</span>
      {hasQualifier && (
        compact ? (
          <span
            className="font-mono text-[10px] font-black opacity-80 shrink-0"
            aria-label={qualifierExplanation}
            title={qualifierExplanation}
          >
            {compactMarker}
          </span>
        ) : (
          <span
            className="text-[10px] font-bold lowercase opacity-85 shrink-0"
            aria-label={qualifierExplanation}
            title={qualifierExplanation}
          >
            {qualifierText}
          </span>
        )
      )}
    </span>
  );
}
