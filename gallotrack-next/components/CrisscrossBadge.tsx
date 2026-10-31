'use client';

import { Repeat } from 'lucide-react';
import type { CrisscrossClassification } from '@/lib/lineage';
import { cn } from '@/components/ui/utils';

type Props = {
  classification: CrisscrossClassification;
  compact?: boolean;
  className?: string;
};

/**
 * Shared CRISSCROSS tag. Only rendered for a qualifying pair; the tooltip and
 * accessible label always carry the plain-language reason.
 */
export default function CrisscrossBadge({
  classification,
  compact = false,
  className,
}: Props) {
  if (!classification.isCrisscross) return null;

  return (
    <span
      data-testid="crisscross-badge"
      role="img"
      aria-label={`CRISSCROSS: ${classification.reason}`}
      title={classification.reason}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-black tracking-tight uppercase',
        compact ? 'text-[10px]' : 'text-xs',
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
        className,
      )}
    >
      <Repeat className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden="true" />
      <span>CRISSCROSS</span>
    </span>
  );
}
