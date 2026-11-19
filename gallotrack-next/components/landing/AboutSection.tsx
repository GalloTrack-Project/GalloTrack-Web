'use client';

import React from 'react';
import { Award, Database, GraduationCap, ShieldCheck } from 'lucide-react';
import { useT, type TranslationKey } from '@/lib/i18n';

type Tenet = {
  icon: typeof Database;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
};

const TENETS: Tenet[] = [
  {
    icon: Database,
    titleKey: 'landing.tenantLineageTitle',
    descriptionKey: 'landing.tenantLineageDesc',
  },
  {
    icon: ShieldCheck,
    titleKey: 'landing.tenantPrivacyTitle',
    descriptionKey: 'landing.tenantPrivacyDesc',
  },
  {
    icon: Award,
    titleKey: 'landing.tenantMatchesTitle',
    descriptionKey: 'landing.tenantMatchesDesc',
  },
];

export default function AboutSection() {
  const t = useT();

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="bg-muted/30 border-border/60 relative scroll-mt-24 border-t py-14 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="space-y-3 text-center">
            <div className="border-primary/25 bg-accent-soft text-brand-red inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-wide">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('landing.aboutBadge')}</span>
            </div>
            <h2
              id="about-title"
              className="text-foreground text-2xl font-black tracking-tight break-words sm:text-3xl"
            >
              {t('landing.aboutTitle')}
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-sm leading-relaxed font-medium break-words sm:text-base">
              {t('landing.aboutDescription')}
            </p>
          </div>

          <div className="border-border/80 bg-card space-y-6 rounded-2xl border p-6 shadow-sm sm:p-8">
            <div className="text-muted-foreground space-y-3 text-sm leading-relaxed font-medium">
              <p className="break-words">{t('landing.aboutNarrativeOne')}</p>
              <p className="break-words">{t('landing.aboutNarrativeTwo')}</p>
            </div>

            <div className="border-border/60 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
              {TENETS.map((tenet) => {
                const Icon = tenet.icon;
                return (
                  <div key={tenet.titleKey} className="flex min-w-0 items-start gap-3">
                    <div className="bg-accent-soft text-brand-red flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-foreground text-xs font-extrabold break-words">
                        {t(tenet.titleKey)}
                      </h3>
                      <p className="text-muted-foreground mt-0.5 text-xs font-medium break-words">
                        {t(tenet.descriptionKey)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
