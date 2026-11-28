import { Archive, CircleCheck, CircleHelp, HeartCrack } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { isActiveStatus, isArchivedStatus, isDeceasedStatus } from '@/lib/registry-roles';

const TONES = {
  active: {
    label: 'Active',
    pill: 'bg-win-bg text-win border-win/30',
    icon: CircleCheck,
  },
  archived: {
    label: 'Archived',
    pill: 'bg-low-sample-bg text-low-sample border-low-sample/30',
    icon: Archive,
  },
  deceased: {
    label: 'Deceased',
    pill: 'bg-loss-bg text-loss border-loss/30',
    icon: HeartCrack,
  },
  other: {
    label: '',
    pill: 'bg-muted text-muted-foreground border-border',
    icon: CircleHelp,
  },
} as const;

/**
 * One status badge for both pages (Registry + Inventory): Active = win tokens,
 * Archived = low-sample tokens, Deceased = loss tokens. Unknown legacy values
 * (e.g. the old 'Sire Material' status) show their raw label in neutral grey.
 */
export default function StatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status?: string | null;
  className?: string;
  showIcon?: boolean;
}) {
  const value = status ?? '';
  const rec = isDeceasedStatus({ status: value })
    ? TONES.deceased
    : isArchivedStatus({ status: value })
      ? TONES.archived
      : isActiveStatus({ status: value })
        ? TONES.active
        : TONES.other;
  const label = rec.label || (value || 'Unknown');
  const Icon = rec.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-black uppercase',
        rec.pill,
        className,
      )}
    >
      {showIcon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}
