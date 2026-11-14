import type { ReactNode } from 'react';
import { cn } from './utils';

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  delta?: {
    value: string;
    label?: string;
    tone?: 'positive' | 'negative' | 'neutral';
  };
  density?: 'default' | 'compact';
  valueClassName?: string;
  title?: string;
  className?: string;
};

const DELTA_TONE: Record<string, string> = {
  positive: 'text-success',
  negative: 'text-danger',
  neutral: 'text-muted-foreground',
};

function StatCard({
  label,
  value,
  hint,
  icon,
  delta,
  density = 'default',
  valueClassName,
  title,
  className,
}: StatCardProps) {
  const tone = delta?.tone ?? 'neutral';
  const compact = density === 'compact';

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col',
        compact
          ? 'border-border bg-card text-card-foreground gap-1.5 rounded-md border p-2.5 text-center shadow-xs'
          : 'border-border bg-card text-card-foreground gap-3 rounded-md border p-5 shadow-xs',
        className,
      )}
      title={title}
    >
      <div
        className={cn(
          'flex min-w-0 items-center gap-3',
          compact ? 'justify-center' : 'justify-between',
        )}
      >
        <p
          className={cn(
            compact
              ? 'text-muted-foreground text-xs font-bold tracking-wide break-words uppercase'
              : 'text-muted-foreground text-sm font-medium',
            'min-w-0',
          )}
        >
          {label}
        </p>
        {icon ? <span className="text-muted-foreground shrink-0">{icon}</span> : null}
      </div>
      <div className={cn(compact ? 'min-w-0' : 'flex min-w-0 items-baseline gap-2')}>
        <p
          className={cn(
            compact
              ? 'text-sm leading-snug font-black break-words'
              : 'text-foreground text-3xl font-semibold tracking-tight tabular-nums',
            valueClassName,
          )}
        >
          {value}
        </p>
        {delta ? (
          <span className={cn('text-xs font-medium tabular-nums', DELTA_TONE[tone])}>
            {delta.value}
          </span>
        ) : null}
      </div>
      {delta?.label ? (
        <p
          className={cn(
            'text-xs',
            compact ? 'text-muted-foreground leading-snug break-words' : 'text-muted-foreground',
          )}
        >
          {delta.label}
        </p>
      ) : hint ? (
        <p
          className={cn(
            'text-xs',
            compact ? 'text-muted-foreground leading-snug break-words' : 'text-muted-foreground',
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export { StatCard };
export type { StatCardProps };
