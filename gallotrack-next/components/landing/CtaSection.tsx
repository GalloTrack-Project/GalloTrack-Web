'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useT } from '@/lib/i18n';

export default function CtaSection() {
  const auth = useAuth();
  const t = useT();
  const isLoggedIn = !!auth.currentUserId;

  return (
    <section className="from-hero-start via-hero-mid to-sidebar-end relative overflow-hidden bg-gradient-to-br py-12 text-sidebar-foreground sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-grid)" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl space-y-6 px-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-3">
          <h2 className="text-2xl leading-tight font-black tracking-tight break-words sm:text-3xl md:text-4xl">
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-sidebar-muted text-xs leading-relaxed font-medium break-words sm:text-sm">
            {t('landing.ctaDescription')}
          </p>
        </div>

        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="bg-card text-brand-red focus-visible:ring-sidebar-foreground inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-7 text-sm font-black shadow-xl transition-colors hover:bg-accent-soft focus-visible:ring-2 focus-visible:outline-none"
            >
              <span>{t('landing.openDashboard')}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="bg-card text-brand-red focus-visible:ring-sidebar-foreground inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-7 text-sm font-black shadow-xl transition-colors hover:bg-accent-soft focus-visible:ring-2 focus-visible:outline-none"
              >
                <span>{t('landing.ctaCreate')}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="border-sidebar-foreground/30 bg-sidebar-foreground/10 text-sidebar-foreground hover:bg-sidebar-foreground/20 focus-visible:ring-sidebar-foreground inline-flex min-h-12 items-center justify-center rounded-lg border px-6 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {t('landing.login')}
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
