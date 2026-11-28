'use client';

import React from 'react';
import { Link2 } from 'lucide-react';
import type { CrisscrossClassification } from '@/lib/lineage';
import { useT } from '@/lib/i18n';

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
  const t = useT();
  const label = t('lineageDirectory.pairLabel', {
    sire: sireName,
    dam: damName,
    count: childCount,
  });

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      aria-label={`${t('lineageDirectory.pairAria', {
        sire: sireName,
        dam: damName,
        count: childCount,
      })}${crisscross?.isCrisscross ? `. CRISSCROSS: ${crisscross.reason}` : ''}`}
      aria-pressed={isSelected}
      title={`${label}${crisscross?.isCrisscross ? ` · CRISSCROSS: ${crisscross.reason}` : ''}`}
      className={`border-low-sample/35 bg-low-sample-bg text-low-sample relative inline-flex max-w-[15rem] cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black shadow-sm focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none ${
        isSelected
          ? 'ring-2 ring-brand-orange/55'
          : 'hover:border-brand-orange/60 hover:bg-accent-soft'
      } ${className}`}
      style={style}
    >
      <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">
        {sireName} × {damName} · {childCount}
      </span>
      <span
        aria-hidden="true"
        className="bg-low-sample absolute bottom-[-5px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full ring-2 ring-card"
      />
    </button>
  );
}
