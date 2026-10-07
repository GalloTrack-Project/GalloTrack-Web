import { cn } from '@/components/ui/utils';
import { isActiveStatus, isArchivedStatus, isDeceasedStatus } from '@/lib/registry-roles';

const TONES = {
  active: {
    label: 'Active',
    pill: 'bg-emerald-500/15 text-success border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  archived: {
    label: 'Archived',
    pill: 'bg-amber-500/15 text-warning border-amber-500/30',
    dot: 'bg-amber-400',
  },
  deceased: {
    label: 'Deceased',
    pill: 'bg-rose-500/15 text-danger border-rose-500/30',
    dot: 'bg-rose-400',
  },
  other: {
    label: '',
    pill: 'bg-muted border-border text-muted-foreground',
    dot: 'bg-muted-foreground/50',
  },
} as const;

/**
 * One status badge for both pages (Registry + Inventory): Active = emerald,
 * Archived = amber, Deceased = rose. Unknown legacy values (e.g. the old
 * 'Sire Material' status) show their raw label in neutral grey.
 */
export default function StatusBadge({
  status,
  className,
  showDot = true,
}: {
  status?: string | null;
  className?: string;
  showDot?: boolean;
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
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-black uppercase px-2 py-0.5 rounded-full border whitespace-nowrap',
        rec.pill,
        className,
      )}
    >
      {showDot && <span className={cn('w-2 h-2 rounded-full shrink-0', rec.dot)} aria-hidden="true" />}
      {label}
    </span>
  );
}
