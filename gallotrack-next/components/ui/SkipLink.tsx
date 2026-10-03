import type { ReactNode } from 'react';
import { cn } from './utils';

type SkipLinkProps = {
  href?: string;
  children?: ReactNode;
  className?: string;
};

function SkipLink({ href = '#main-content', children = 'Skip to main content', className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground',
        className,
      )}
    >
      {children}
    </a>
  );
}

export { SkipLink };
export type { SkipLinkProps };
