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
        'text-low-sample bg-low-sample-bg border-low-sample/25';
      Icon = AlertTriangle;
      break;
    case 'line':
      colorClasses =
        'text-cock bg-cock-bg border-cock/25';
      Icon = GitBranch;
      break;
    case 'outcross':
      colorClasses =
        'text-win bg-win-bg border-win/25';
      Icon = CheckCircle2;
      break;
    case 'unknown':
    default:
      colorClasses =
        'text-muted-foreground bg-muted border-border';
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
