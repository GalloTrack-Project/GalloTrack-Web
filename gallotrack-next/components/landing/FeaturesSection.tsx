'use client';

import React from 'react';
import { Bell, Bird, GitBranch, HeartHandshake, Trophy } from 'lucide-react';
import { useT, type TranslationKey } from '@/lib/i18n';

type Capability = {
  id: string;
  icon: typeof Bird;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  descriptionKey: TranslationKey;
  highlightKey: TranslationKey;
  tone: string;
};

const CAPABILITIES: Capability[] = [
  {
    id: 'capability-registry',
    icon: Bird,
    titleKey: 'landing.capabilityRegistryTitle',
    subtitleKey: 'landing.capabilityRegistrySubtitle',
    descriptionKey: 'landing.capabilityRegistryDesc',
    highlightKey: 'landing.capabilityRegistryHighlight',
    tone: 'bg-primary text-primary-foreground',
  },
  {
    id: 'capability-matches',
    icon: Trophy,
    titleKey: 'landing.capabilityMatchesTitle',
    subtitleKey: 'landing.capabilityMatchesSubtitle',
    descriptionKey: 'landing.capabilityMatchesDesc',
    highlightKey: 'landing.capabilityMatchesHighlight',
    tone: 'bg-brand-orange text-primary-foreground',
  },
  {
    id: 'capability-lineage',
    icon: GitBranch,
    titleKey: 'landing.capabilityLineageTitle',
    subtitleKey: 'landing.capabilityLineageSubtitle',
    descriptionKey: 'landing.capabilityLineageDesc',
    highlightKey: 'landing.capabilityLineageHighlight',
    tone: 'bg-sidebar text-sidebar-foreground',
  },
  {
    id: 'capability-breeding',
    icon: HeartHandshake,
    titleKey: 'landing.capabilityBreedingTitle',
    subtitleKey: 'landing.capabilityBreedingSubtitle',
    descriptionKey: 'landing.capabilityBreedingDesc',
    highlightKey: 'landing.capabilityBreedingHighlight',
    tone: 'bg-primary text-primary-foreground',
  },
  {
    id: 'capability-notifications',
    icon: Bell,
    titleKey: 'landing.capabilityNotificationsTitle',
    subtitleKey: 'landing.capabilityNotificationsSubtitle',
    descriptionKey: 'landing.capabilityNotificationsDesc',
    highlightKey: 'landing.capabilityNotificationsHighlight',
    tone: 'bg-brand-orange text-primary-foreground',
  },
];

export default function FeaturesSection() {
  const t = useT();

  return (
    <section id="features" className="bg-muted/40 border-border/60 relative scroll-mt-24 border-y py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl space-y-3 text-center sm:mb-12">
          <h2 className="text-brand-red font-mono text-xs font-black tracking-widest uppercase">
            {t('landing.capabilitiesEyebrow')}
          </h2>
          <p className="text-foreground text-2xl font-black tracking-tight break-words sm:text-3xl">
            {t('landing.capabilitiesTitle')}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed font-medium break-words sm:text-base">
            {t('landing.capabilitiesDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((capability) => {
            const Icon = capability.icon;
            return (
              <article
                key={capability.id}
                id={capability.id}
                className="group border-border/80 bg-card flex min-w-0 scroll-mt-28 flex-col justify-between rounded-xl border p-5 shadow-sm transition-colors hover:border-brand-orange/50 motion-reduce:transition-none"
              >
                <div className="space-y-3.5">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-lg ${capability.tone}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-mono text-xs font-bold tracking-wider uppercase">
                      {t(capability.subtitleKey)}
                    </span>
                    <h3 className="text-foreground text-lg font-black tracking-tight break-words">
                      {t(capability.titleKey)}
                    </h3>
                  </div>

                  <p className="text-muted-foreground text-xs leading-relaxed font-medium break-words sm:text-sm">
                    {t(capability.descriptionKey)}
                  </p>
                </div>

                <div className="border-border/60 mt-5 border-t pt-4">
                  <span className="text-brand-red inline-flex text-xs font-bold break-words">
                    {t(capability.highlightKey)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
