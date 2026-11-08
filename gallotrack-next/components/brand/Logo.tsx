'use client';

import React from 'react';
import { cn } from '@/components/ui/utils';

type LogoVariant = 'full' | 'mark';
type LogoSize = 'sm' | 'md' | 'lg';

type Props = {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  /** Force the light wordmark variant on dark surfaces (e.g. login artwork). */
  onDark?: boolean;
  /** Force the dark-text variant on light artwork plates. */
  onLight?: boolean;
};

const FULL_SIZE: Record<LogoSize, string> = {
  sm: 'h-7',
  md: 'h-8',
  lg: 'h-10',
};

const MARK_SIZE: Record<LogoSize, string> = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export default function Logo({
  variant = 'full',
  size = 'md',
  className,
  onDark = false,
  onLight = false,
}: Props) {
  if (variant === 'mark') {
    return (
      <img
        src="/brand/logo-mark.svg"
        alt="GalloTrack"
        width={256}
        height={256}
        draggable={false}
        className={cn('block shrink-0 object-contain', MARK_SIZE[size], className)}
      />
    );
  }

  const sizeClass = cn('block w-auto max-w-full object-contain', FULL_SIZE[size]);

  return (
    <span className={cn('inline-flex min-w-0 items-center', className)}>
      <img
        src="/brand/logo-full.svg"
        alt="GalloTrack"
        width={586}
        height={128}
        draggable={false}
        className={cn(sizeClass, onDark ? 'hidden' : onLight ? 'block' : 'dark:hidden')}
      />
      <img
        src="/brand/logo-full-dark.svg"
        alt="GalloTrack"
        width={586}
        height={128}
        draggable={false}
        className={cn(sizeClass, onDark ? 'block' : onLight ? 'hidden' : 'hidden dark:block')}
      />
    </span>
  );
}
