'use client';

import { BarChart3, Network, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useT, type TranslationKey } from '@/lib/i18n';
import FeatureCard, { type AboutFeatureTone } from './FeatureCard';

type Feature = {
  color: AboutFeatureTone;
  icon: LucideIcon;
  titleKey: TranslationKey;
  textKey: TranslationKey;
};

const FEATURES: Feature[] = [
  {
    color: 'red',
    icon: Network,
    titleKey: 'landing.tenantLineageTitle',
    textKey: 'landing.tenantLineageDesc',
  },
  {
    color: 'orange',
    icon: ShieldCheck,
    titleKey: 'landing.tenantPrivacyTitle',
    textKey: 'landing.tenantPrivacyDesc',
  },
  {
    color: 'red',
    icon: BarChart3,
    titleKey: 'landing.tenantMatchesTitle',
    textKey: 'landing.tenantMatchesDesc',
  },
];

export default function AboutFeatures() {
  const t = useT();

  return (
    <section
      aria-label={t('landing.aboutTitle')}
      className="relative z-20 mx-auto -mt-4 w-full max-w-7xl px-4 pt-6 pb-16 sm:px-6 lg:-mt-12 lg:px-8"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <div
            key={feature.titleKey}
            className="landing-step-in h-full"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <FeatureCard
              color={feature.color}
              icon={feature.icon}
              title={t(feature.titleKey)}
              text={t(feature.textKey)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
