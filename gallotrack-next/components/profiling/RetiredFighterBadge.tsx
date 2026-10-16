import React from 'react';
import { Shield } from 'lucide-react';
import { RETIRED_FIGHTER_LABEL, RETIRED_FIGHTER_TOOLTIP } from '@/lib/registry-labels';
import { cn } from '@/components/ui/utils';

interface RetiredFighterBadgeProps {
  className?: string;
  compact?: boolean;
}

export default function RetiredFighterBadge({ className, compact = false }: RetiredFighterBadgeProps) {
  return (
    <span
      data-testid="retired-fighter-badge"
      title={RETIRED_FIGHTER_TOOLTIP}
      className={cn(
        'inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-full border transition-colors shadow-2xs',
        compact
          ? 'text-[10px] px-2 py-0.5 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/60'
          : 'text-xs px-2.5 py-0.5 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/60',
        className
      )}
    >
      <Shield className={cn(compact ? 'w-2.5 h-2.5' : 'w-3 h-3', 'text-amber-600 dark:text-amber-400 shrink-0')} aria-hidden="true" />
      <span>{RETIRED_FIGHTER_LABEL}</span>
    </span>
  );
}
