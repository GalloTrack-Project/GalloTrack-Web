import { Link2 } from 'lucide-react';
import { cn } from '@/components/ui/utils';

/**
 * The single interactive affordance for an unlinked historical row.
 * Used by every Match Logs layout so the badge-button never drifts.
 */
export default function LinkProfileButton({
  entryName,
  onClick,
  className,
}: {
  entryName: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Link profile for ${entryName}`}
      className={cn(
        'border-border bg-muted text-muted-foreground hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500/50 inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold whitespace-nowrap transition-colors focus-visible:outline-none dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300',
        className,
      )}
    >
      <Link2 className="h-3 w-3" aria-hidden="true" />
      <span>Historical entry ? Link profile</span>
    </button>
  );
}
