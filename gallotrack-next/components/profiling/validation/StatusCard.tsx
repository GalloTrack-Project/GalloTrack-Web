'use client';

import React from 'react';
import { cn } from '@/components/ui/utils';
import { StatusBadge } from './StatusBadge';
import type { StatusTone } from './types';

export type StatusCardProps = {
  icon: React.ReactNode;
  title: string;
  badge?: {
    tone: StatusTone;
    label: string;
  };
  value?: string;
  helper?: string;
  children?: React.ReactNode;
  /** Announce value/helper changes to screen readers. */
  live?: boolean;
  className?: string;
};

export function StatusCard({
  icon,
  title,
  badge,
  value,
  helper,
  children,
  live = false,
  className,
}: StatusCardProps) {
  return (
    <article
      className={cn(
        'flex min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-muted/30 p-3.5 sm:p-4',
        className,
      )}
      {...(live ? { 'aria-live': 'polite' as const } : {})}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground"
        >
          {icon}
        </span>
        <h4 className="min-w-0 flex-1 text-xs leading-snug font-black tracking-wider break-words text-muted-foreground uppercase">
          {title}
        </h4>
      </div>

      {(badge || value) && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {badge ? <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge> : null}
          {value ? (
            <p className="min-w-0 text-sm font-black break-words text-card-foreground">{value}</p>
          ) : null}
        </div>
      )}

      {children}

      {helper ? (
        <p className="text-xs leading-relaxed font-semibold break-words text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </article>
  );
}
