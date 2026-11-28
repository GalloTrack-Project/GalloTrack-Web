'use client';

import Logo from '@/components/brand/Logo';
import { BRAND_TAGLINE_KEY } from '@/lib/brand-tagline';
import { useT } from '@/lib/i18n';

export default function FooterBand({ className = '' }: { className?: string }) {
  const t = useT();

  return (
    <div
      data-testid="footer-band"
      aria-hidden="true"
      className={`border-primary/10 from-accent-soft via-background to-brand-orange/15 relative mt-10 hidden min-h-28 items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-r px-6 md:flex [@media(max-height:700px)]:hidden ${className}`}
    >
      <div className="from-primary/15 via-brand-orange/10 absolute inset-x-0 bottom-0 h-10 bg-gradient-to-r to-transparent" />
      <div className="relative flex min-w-0 items-center gap-3">
        <span className="bg-background ring-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ring-1">
          <Logo variant="mark" size="sm" />
        </span>
        <p className="text-primary text-sm font-black tracking-[0.16em] uppercase">
          {t(BRAND_TAGLINE_KEY)}
        </p>
      </div>
    </div>
  );
}
