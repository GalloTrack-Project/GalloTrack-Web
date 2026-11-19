'use client';

import React from 'react';
import Link from 'next/link';
import { CompactLanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { BUILD_SHA } from '@/lib/build-info';
import Logo from '@/components/brand/Logo';
import { useT } from '@/lib/i18n';

export default function Footer({ linkPrefix = '' }: { linkPrefix?: '' | '/' }) {
  const t = useT();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border/80 bg-card border-t py-8 text-sm sm:py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="min-w-0 space-y-2">
            <Link
              href="/"
              aria-label={t('landing.brandHome')}
              className="focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-w-0 flex-wrap items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <span className="bg-background ring-border inline-flex h-9 w-9 items-center justify-center rounded-lg p-1 shadow-sm ring-1">
                <Logo variant="mark" size="sm" />
              </span>
              <span className="text-foreground text-lg font-black tracking-tight">
                GALLO<span className="text-brand-red">TRACK</span>
              </span>
              <span className="text-muted-foreground border-border ml-1 rounded border px-1.5 py-0.5 font-mono text-xs font-bold tracking-widest uppercase">
                {t('landing.version')}
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm text-xs font-medium break-words">
              {t('landing.footerTagline')}
            </p>
            <p className="text-muted-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
              {t('landing.footerBuild', { sha: BUILD_SHA })}
            </p>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-5 text-xs font-bold">
            <a
              href={`${linkPrefix}#features`}
              className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t('landing.features')}
            </a>
            <a
              href={`${linkPrefix}#how-it-works`}
              className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t('landing.howItWorks')}
            </a>
            <Link
              href="/about"
              className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t('landing.about')}
            </Link>
            <Link
              href="/login"
              className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t('landing.login')}
            </Link>
            <Link
              href="/register"
              className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t('landing.signUp')}
            </Link>
            <CompactLanguageSwitcher />
          </div>
        </div>

        <div className="border-border/60 text-muted-foreground flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs sm:flex-row">
          <p className="text-center font-medium sm:text-left">
            &copy; {currentYear} GalloTrack. {t('landing.footerRights')}
          </p>
          <p className="text-brand-red text-center font-semibold sm:text-right">
            {t('landing.footerCapstone')}
          </p>
        </div>
      </div>
    </footer>
  );
}
