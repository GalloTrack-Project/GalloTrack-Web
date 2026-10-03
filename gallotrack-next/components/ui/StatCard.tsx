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
  className?: string;
};

const DELTA_TONE: Record<string, string> = {
  positive: 'text-success',
  negative: 'text-danger',
  neutral: 'text-muted-foreground',
};

function StatCard({ label, value, hint, icon, delta, className }: StatCardProps) {
  const tone = delta?.tone ?? 'neutral';

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-md border border-border bg-card p-5 text-card-foreground shadow-xs',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
        {delta ? (
          <span className={cn('text-xs font-medium tabular-nums', DELTA_TONE[tone])}>
            {delta.value}
          </span>
        ) : null}
      </div>
      {delta?.label ? (
        <p className="text-xs text-muted-foreground">{delta.label}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export { StatCard };
export type { StatCardProps };
