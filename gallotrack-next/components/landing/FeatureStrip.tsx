'use client';

import React from 'react';
import { Bell, Bird, GitBranch, HeartHandshake, Trophy } from 'lucide-react';
import { useT, type TranslationKey } from '@/lib/i18n';

type FeatureStripItem = {
  id: string;
  href: string;
  icon: typeof Bird;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  tone: string;
};

const ITEMS: FeatureStripItem[] = [
  {
    id: 'registry',
    href: '#capability-registry',
    icon: Bird,
    titleKey: 'landing.featureRegistryTitle',
    descriptionKey: 'landing.featureRegistryDesc',
    tone: 'bg-primary text-primary-foreground',
  },
  {
    id: 'matches',
    href: '#capability-matches',
    icon: Trophy,
    titleKey: 'landing.featureMatchesTitle',
    descriptionKey: 'landing.featureMatchesDesc',
    tone: 'bg-brand-orange text-primary-foreground',
  },
  {
    id: 'lineage',
    href: '#capability-lineage',
    icon: GitBranch,
    titleKey: 'landing.featureLineageTitle',
    descriptionKey: 'landing.featureLineageDesc',
    tone: 'bg-sidebar text-sidebar-foreground',
  },
  {
    id: 'breeding',
    href: '#capability-breeding',
    icon: HeartHandshake,
    titleKey: 'landing.featureBreedingTitle',
    descriptionKey: 'landing.featureBreedingDesc',
    tone: 'bg-primary text-primary-foreground',
  },
  {
    id: 'notifications',
    href: '#capability-notifications',
    icon: Bell,
    titleKey: 'landing.featureNotificationsTitle',
    descriptionKey: 'landing.featureNotificationsDesc',
    tone: 'bg-brand-orange text-primary-foreground',
  },
];

export default function FeatureStrip() {
  const t = useT();

  return (
    <section aria-label={t('landing.featureStripAria')} className="relative z-20 -mt-12 pb-10 sm:-mt-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:px-6 md:grid-cols-3 lg:grid-cols-5 lg:px-8">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={item.href}
              className="group border-border bg-card focus-visible:ring-ring focus-visible:ring-offset-background hover:border-brand-orange/60 flex min-h-24 min-w-0 items-center gap-3 rounded-xl border p-4 shadow-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${item.tone}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="text-card-foreground block text-sm leading-snug font-black break-words">
                  {t(item.titleKey)}
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs leading-snug font-semibold break-words">
                  {t(item.descriptionKey)}
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
