'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Circle, Clock3, XCircle } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { StatusTone } from './types';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  pending: 'border-info/40 bg-info/10 text-info',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  success: 'border-success/40 bg-success/10 text-success',
  error: 'border-danger/40 bg-danger/10 text-danger',
};

const TONE_ICONS = {
  neutral: Circle,
  pending: Clock3,
  warning: AlertTriangle,
  success: CheckCircle2,
  error: XCircle,
} as const;

export type StatusBadgeProps = {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
};

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  const Icon = TONE_ICONS[tone];

  return (
    <span
      data-status-badge={tone}
      className={cn(
        'inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-normal break-words rounded-full border px-2.5 py-1 text-xs font-black',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 whitespace-normal break-words">{children}</span>
    </span>
  );
}
