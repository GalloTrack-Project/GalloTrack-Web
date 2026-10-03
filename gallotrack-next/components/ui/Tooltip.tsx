'use client';

import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from './utils';

type TooltipProps = {
  content: ReactNode;
  children: ReactElement<Record<string, unknown>>;
  side?: 'top' | 'bottom';
  className?: string;
};

const SIDE_CLASS: Record<string, string> = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
};

function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const trigger = isValidElement(children)
    ? cloneElement(children, { 'aria-describedby': open ? id : undefined })
    : children;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      {trigger}
      <span
        role="tooltip"
        id={id}
        hidden={!open}
        className={cn(
          'absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-card-foreground shadow-md',
          SIDE_CLASS[side],
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}

export { Tooltip };
export type { TooltipProps };
