import React from 'react';
import { Shield } from 'lucide-react';
import { RETIRED_FIGHTER_LABEL, RETIRED_FIGHTER_TOOLTIP } from '@/lib/registry-labels';
import { cn } from '@/components/ui/utils';

interface RetiredFighterBadgeProps {
  className?: string;
  compact?: boolean;
}

export default function RetiredFighterBadge({
  className,
  compact = false,
}: RetiredFighterBadgeProps) {
  return (
    <span
      data-testid="retired-fighter-badge"
      title={RETIRED_FIGHTER_TOOLTIP}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-black tracking-wider uppercase shadow-2xs transition-colors',
        compact
          ? 'border-amber-300 bg-amber-100/80 px-2 py-0.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
          : 'border-amber-300 bg-amber-100/80 px-2.5 py-0.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
        className,
      )}
    >
      <Shield
        className={cn(
          compact ? 'h-2.5 w-2.5' : 'h-3 w-3',
          'shrink-0 text-amber-600 dark:text-amber-400',
        )}
        aria-hidden="true"
      />
      <span>{RETIRED_FIGHTER_LABEL}</span>
    </span>
  );
}
