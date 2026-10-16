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
  const { type, badgeLabel, tooltipText } = classification;

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
      title={tooltipText}
    >
      <span>{badgeLabel}</span>
    </span>
  );
}
