'use client';

import {
  Archive,
  BadgeCheck,
  Circle,
  ShieldAlert,
  Tag,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { FowlRecord } from '@/lib/types';
import { translateStatus, useLanguage } from '@/lib/i18n';
import { cn } from '@/components/ui/utils';

type StatusTone = {
  icon: LucideIcon;
  className: string;
};

const STATUS_TONES: Record<string, StatusTone> = {
  Active: {
    icon: BadgeCheck,
    className: 'border-win/20 bg-win-bg text-win',
  },
  Archived: {
    icon: Archive,
    className: 'border-low-sample/20 bg-low-sample-bg text-low-sample',
  },
  Deceased: {
    icon: XCircle,
    className: 'border-loss/20 bg-loss-bg text-loss',
  },
  Sold: {
    icon: Tag,
    className: 'border-info/20 bg-cock-bg text-info',
  },
  Quarantined: {
    icon: ShieldAlert,
    className: 'border-warning/20 bg-low-sample-bg text-warning',
  },
};

export default function LineageStatusBadge({
  fowl,
  compact = false,
  className,
}: {
  fowl: Pick<FowlRecord, 'status'>;
  compact?: boolean;
  className?: string;
}) {
  const { language } = useLanguage();
  const raw = (fowl.status || '').trim();
  const tone = STATUS_TONES[raw] ?? {
    icon: Circle,
    className: 'border-border bg-muted text-muted-foreground',
  };
  const Icon = tone.icon;
  const label = raw ? translateStatus(raw, language) : translateStatus('Active', language);

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border font-black',
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        tone.className,
        className,
      )}
      title={label}
    >
      <Icon className={compact ? 'h-2.5 w-2.5 shrink-0' : 'h-3 w-3 shrink-0'} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
