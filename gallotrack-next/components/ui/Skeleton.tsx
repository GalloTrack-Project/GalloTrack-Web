import { cn } from './utils';

type SkeletonProps = {
  className?: string;
};

function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('block h-4 w-full animate-pulse rounded-md bg-muted', className)}
    />
  );
}

export { Skeleton };
export type { SkeletonProps };
