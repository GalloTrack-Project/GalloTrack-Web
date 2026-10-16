'use client';

import React from 'react';
import type { RelatednessClassification } from '@/lib/relatedness-classification';
import { AlertTriangle, CheckCircle2, GitBranch, HelpCircle } from 'lucide-react';
import { cn } from '@/components/ui/utils';

interface RelatednessBadgeProps {
  classification: RelatednessClassification;
  prefix?: string;
  showSecondary?: boolean;
  className?: string;
  compact?: boolean;
}

export default function RelatednessBadge({
  classification,
  prefix,
  showSecondary = false,
  className,
  compact = false,
}: RelatednessBadgeProps) {
  const { type, label, secondaryLabel, relationship, tooltip, inbreedingCoefficient } = classification;

  let colorClasses = '';
  let Icon = HelpCircle;

  switch (type) {
    case 'close':
      colorClasses =
        'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';
      Icon = AlertTriangle;
      break;
    case 'line':
      colorClasses =
        'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800';
      Icon = GitBranch;
      break;
    case 'outcross':
      colorClasses =
        'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
      Icon = CheckCircle2;
      break;
    case 'unknown':
    default:
      colorClasses =
        'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-muted/80 border-slate-300 dark:border-border';
      Icon = HelpCircle;
      break;
  }

  const tooltipParts = [
    tooltip,
    relationship ? `Relation: ${relationship}` : '',
    inbreedingCoefficient !== null
      ? (inbreedingCoefficient > 0 ? `Inbreeding: ${inbreedingCoefficient}%` : 'Inbreeding: 0%')
      : 'Inbreeding: —',
  ].filter(Boolean);

  const fullTooltip = tooltipParts.join(' · ');

  return (
    <span
      className={cn(
        'antigravity-badge inline-flex items-center gap-1.5 text-xs font-black border px-2.5 py-0.5 rounded-full uppercase tracking-tight transition-colors shrink-0',
        colorClasses,
        className
      )}
      title={fullTooltip}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>
        {prefix}
        {compact ? label.split(' ')[0] : label}
        {showSecondary && secondaryLabel ? (
          <span className="font-medium normal-case ml-1 opacity-80">({secondaryLabel})</span>
        ) : null}
      </span>
    </span>
  );
}
