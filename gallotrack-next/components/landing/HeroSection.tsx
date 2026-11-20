'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2 } from 'lucide-react';
import HeroCarousel from '@/components/hero/HeroCarousel';
import { HERO_IMAGES } from '@/lib/hero-config';
import { useAuth } from '@/lib/contexts/auth-context';
import { useT } from '@/lib/i18n';
import HeroDecorations from './HeroDecorations';

export default function HeroSection() {
  const auth = useAuth();
  const t = useT();
  const isLoggedIn = !!auth.currentUserId;

  return (
    <section className="bg-background relative overflow-hidden pt-8 pb-28 sm:pt-12 sm:pb-32 lg:pt-16 lg:pb-36">
      <HeroDecorations />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-10 xl:gap-14">
          <div className="min-w-0 space-y-5 text-center sm:space-y-6 lg:col-span-6 lg:text-left">
            <div className="border-primary/25 bg-accent-soft text-brand-red inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-black tracking-wide">
              <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="break-words">{t('landing.badge')}</span>
            </div>

            <h1 className="text-foreground text-[clamp(2.15rem,5.6vw,4.75rem)] leading-[0.98] font-black tracking-tight">
              <span className="block break-words">{t('landing.headlineAdvanced')}</span>
              <span className="text-brand-red block break-words">{t('landing.headlineAccent')}</span>
              <span className="block break-words">{t('landing.headlineAnalytics')}</span>
            </h1>

            <p className="text-muted-foreground mx-auto max-w-xl text-base leading-relaxed font-semibold break-words sm:text-lg lg:mx-0">
              {t('landing.subtitle')}
            </p>

            <div className="flex flex-col items-stretch justify-center gap-3 pt-1 sm:flex-row sm:items-center lg:justify-start">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="bg-sidebar text-sidebar-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-black shadow-lg shadow-primary/25 transition-colors hover:bg-sidebar-end focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <span>{t('landing.openDashboard')}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="bg-sidebar text-sidebar-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-black shadow-lg shadow-primary/25 transition-colors hover:bg-sidebar-end focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <span>{t('landing.getStarted')}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/login"
                    className="border-border bg-card/80 text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-12 items-center justify-center rounded-lg border px-6 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    {t('landing.login')}
                  </Link>
                </>
              )}
            </div>

            <div className="border-border/70 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t pt-4 text-xs font-bold sm:text-sm lg:justify-start">
              <span className="text-muted-foreground flex min-w-0 items-center gap-2">
                <CheckCircle2 className="text-brand-red h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="break-words">{t('landing.privateRecords')}</span>
              </span>
              <span className="text-muted-foreground flex min-w-0 items-center gap-2">
                <CheckCircle2 className="text-brand-red h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="break-words">{t('landing.automaticBloodline')}</span>
              </span>
            </div>
          </div>

          <div className="flex min-w-0 justify-center lg:col-span-6">
            <HeroCarousel images={HERO_IMAGES} className="max-w-xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
