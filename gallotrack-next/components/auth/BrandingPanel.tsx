'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  BarChart3,
  Dna,
  Home,
  Moon,
  ShieldCheck,
  Sun,
  Swords,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import Logo from '@/components/brand/Logo';
import AboutRooster from '@/components/about/AboutRooster';
import { CompactLanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { BUILD_SHA } from '@/lib/build-info';
import { HERO_IMAGES } from '@/lib/hero-config';
import { useT, type TranslationKey } from '@/lib/i18n';
import FeatureTile from './FeatureTile';
import WaveDecor from './WaveDecor';

type BrandFeature = {
  icon: LucideIcon;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
};

const FEATURES: BrandFeature[] = [
  {
    icon: Dna,
    titleKey: 'auth.featureLineageTitle',
    subtitleKey: 'auth.featureLineageDesc',
  },
  {
    icon: Swords,
    titleKey: 'auth.featureMatchTitle',
    subtitleKey: 'auth.featureMatchDesc',
  },
  {
    icon: BarChart3,
    titleKey: 'auth.featureDashboardTitle',
    subtitleKey: 'auth.featureDashboardDesc',
  },
  {
    icon: Trophy,
    titleKey: 'auth.featureRegistryTitle',
    subtitleKey: 'auth.featureRegistryDesc',
  },
];

export default function BrandingPanel() {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme === 'dark';
  const farmImage = HERO_IMAGES.find((image) => image.id === 'farm-2') ?? HERO_IMAGES[1];

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="from-sidebar-end via-sidebar to-sidebar-active relative flex min-h-[22rem] flex-col overflow-hidden bg-gradient-to-br px-5 pt-5 pb-20 text-white sm:px-8 lg:h-full lg:px-10 lg:py-8 xl:px-14">
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src={farmImage.src}
          alt=""
          fill
          priority
          sizes="(max-width: 1023px) 100vw, 59vw"
          className="object-cover object-center opacity-40 blur-[2px]"
        />
        <div className="from-sidebar-end/95 via-sidebar/85 to-sidebar-active/45 absolute inset-0 bg-gradient-to-br" />
        <div className="bg-brand-orange/25 absolute -top-24 right-[-10%] h-96 w-96 rounded-full blur-3xl" />
      </div>

      <div className="relative z-30 flex flex-1 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              aria-label={t('landing.brandHome')}
              className="focus-visible:ring-brand-gold inline-flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-slate-900 shadow-xl shadow-black/20 transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <Logo variant="mark" size="lg" />
              <span className="text-lg font-black tracking-tight sm:text-xl">
                GALLO<span className="text-brand-red">TRACK</span>
              </span>
            </Link>
            <p className="mt-3 font-mono text-[10px] font-bold tracking-[0.2em] break-words text-white/80 uppercase">
              {t('auth.buildLine', { sha: BUILD_SHA })}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <CompactLanguageSwitcher variant="glass" />
            <Link
              href="/"
              className="focus-visible:ring-brand-gold inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-white/60 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:outline-none"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>{t('auth.backHome')}</span>
            </Link>
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                aria-label={isDark ? t('header.switchToLight') : t('header.switchToDark')}
                title={isDark ? t('header.switchToLight') : t('header.switchToDark')}
                className="focus-visible:ring-brand-gold inline-flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-white/60 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:outline-none"
              >
                {isDark ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="my-auto max-w-2xl py-8 lg:py-10">
          <div className="landing-step-in">
            <h1 className="text-[clamp(2.2rem,4.2vw,3.5rem)] leading-[1.04] font-black tracking-tight break-words">
              <span className="block">{t('auth.brandingLead')}</span>
              <span className="text-brand-gold block">{t('auth.brandingAccent')}</span>
              <span className="block">{t('auth.brandingTail')}</span>
            </h1>
            <p className="mt-4 hidden max-w-xl text-sm leading-relaxed font-medium text-white/80 sm:block sm:text-base lg:text-lg">
              {t('landing.subtitle')}
            </p>
          </div>

          <div className="mt-7 hidden max-w-lg grid-cols-2 gap-3 lg:grid">
            {FEATURES.map((feature, index) => (
              <FeatureTile
                key={feature.titleKey}
                icon={feature.icon}
                title={t(feature.titleKey)}
                subtitle={t(feature.subtitleKey)}
                delayMs={100 + index * 100}
              />
            ))}
          </div>
        </div>

        <p className="relative z-30 mt-auto hidden w-fit max-w-full items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-sm lg:inline-flex">
          <ShieldCheck className="text-brand-gold h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="break-words">
            {t('landing.footerCapstone')} · {t('auth.capstoneTagline')}
          </span>
        </p>
      </div>

      <div className="absolute -right-10 bottom-0 z-20 hidden w-[64%] max-w-[44rem] lg:block">
        <div className="about-hero-rooster">
          <AboutRooster
            label={t('landing.aboutRoosterAlt')}
            className="h-auto w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.35)]"
          />
        </div>
      </div>

      <WaveDecor variant="left" />
    </section>
  );
}
