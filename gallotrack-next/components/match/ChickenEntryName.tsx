import { cn } from '@/components/ui/utils';

export type ChickenNameVariant = 'linked' | 'historical';

/**
 * ONE shared name treatment for Match Logs. Linked entries look interactive;
 * historical entries stay neutral and must never advertise a link affordance.
 */
const VARIANT_CLASS: Record<ChickenNameVariant, string> = {
  linked:
    'text-card-foreground transition-colors group-hover:text-emerald-600',
  historical: 'text-muted-foreground cursor-default',
};

export default function ChickenEntryName({
  name,
  variant,
  className,
}: {
  name: string;
  variant: ChickenNameVariant;
  className?: string;
}) {
  return (
    <span className={cn('min-w-0 font-bold break-words', VARIANT_CLASS[variant], className)}>
      {name}
    </span>
  );
}
