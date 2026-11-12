'use client';

import React from 'react';
import { Link2 } from 'lucide-react';
import type { CrisscrossClassification } from '@/lib/lineage';

export interface LineagePairBadgeProps {
  sireName: string;
  damName: string;
  childCount: number;
  isSelected?: boolean;
  crisscross?: CrisscrossClassification | null;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}

export default function LineagePairBadge({
  sireName,
  damName,
  childCount,
  isSelected = false,
  crisscross = null,
  onClick,
  className = '',
  style,
  testId = 'lineage-pair-hub',
}: LineagePairBadgeProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      aria-label={`Breeding pair ${sireName} × ${damName}, ${childCount} offspring${
        crisscross?.isCrisscross ? `. CRISSCROSS: ${crisscross.reason}` : ''
      }`}
      aria-pressed={isSelected}
      title={`Breeding pair: ${sireName} × ${damName}${
        crisscross?.isCrisscross ? ` · CRISSCROSS: ${crisscross.reason}` : ''
      }`}
      className={`bg-card inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wider uppercase shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:outline-none ${
        isSelected
          ? 'border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/30 dark:text-emerald-400'
          : 'border-border text-muted-foreground hover:border-emerald-400 hover:text-foreground'
      } ${className}`}
      style={style}
    >
      <Link2 className="h-3 w-3" aria-hidden="true" />
      {childCount}
    </button>
  );
}
