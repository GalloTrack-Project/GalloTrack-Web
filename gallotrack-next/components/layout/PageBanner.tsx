'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/components/ui/utils';

export interface PageBannerProps {
  icon: LucideIcon;
  title: ReactNode;
  subtitle: ReactNode;
  /** Optional owned image used as a faded decorative strip. */
  imageSrc?: string;
  /** Use h2 when the shared shell already owns the page h1. */
  headingLevel?: 'h1' | 'h2';
  /** Brand red tile by default on inventory; soft keeps older pages unchanged. */
  iconTone?: 'soft' | 'brand';
  /** Optional page controls rendered inside the banner, below the heading. */
  children?: ReactNode;
  className?: string;
}

export default function PageBanner({
  icon: Icon,
  title,
  subtitle,
  imageSrc,
  headingLevel = 'h1',
  iconTone = 'soft',
  children,
  className,
}: PageBannerProps) {
  const Heading = headingLevel;
  return (
    <section
      className={cn(
        'border-border bg-card relative isolate overflow-hidden rounded-2xl border shadow-sm',
        className,
      )}
    >
      {imageSrc && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-3/5 md:block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt=""
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
            className="h-full w-full object-cover object-center opacity-25 dark:opacity-15"
          />
          <div className="from-card via-card/90 to-card/25 absolute inset-0 bg-gradient-to-r" />
        </div>
      )}

      <div className="flex min-w-0 items-center gap-4 px-4 py-5 sm:px-6 sm:py-6">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-1 sm:h-16 sm:w-16',
            iconTone === 'brand'
              ? 'bg-brand text-brand-foreground ring-brand-strong/30 shadow-sm'
              : 'bg-accent-soft text-primary ring-primary/15',
          )}
        >
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
        </span>
        <div className="min-w-0">
          <Heading className="text-foreground text-2xl leading-tight font-black tracking-tight break-words sm:text-3xl">
            {title}
          </Heading>
          <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm leading-relaxed font-semibold break-words sm:text-base">
            {subtitle}
          </p>
        </div>
      </div>
      {children ? (
        <div className="relative border-t border-border/70 px-4 pb-4 sm:px-6 sm:pb-6">{children}</div>
      ) : null}
    </section>
  );
}
