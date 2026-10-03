import type { ReactNode } from 'react';
import { cn } from './utils';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

function EmptyState({ title, description, icon, action, compact = false, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card/50 text-center',
        compact ? 'px-4 py-8' : 'px-6 py-16',
        className,
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2 pt-1">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
