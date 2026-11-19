'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bird,
  ClipboardCheck,
  Feather,
  FileText,
  GitBranch,
  type LucideIcon,
} from 'lucide-react';
import { useT, type TranslationKey } from '@/lib/i18n';
import StepCard, { type StepTone } from './StepCard';
import FooterWave from './FooterWave';

type WorkflowStep = {
  number: string;
  tone: StepTone;
  icon: LucideIcon;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
};

const STEPS: WorkflowStep[] = [
  {
    number: '01',
    tone: 'red',
    icon: FileText,
    titleKey: 'landing.stepRegisterTitle',
    descriptionKey: 'landing.stepRegisterDesc',
  },
  {
    number: '02',
    tone: 'orange',
    icon: GitBranch,
    titleKey: 'landing.stepOffspringTitle',
    descriptionKey: 'landing.stepOffspringDesc',
  },
  {
    number: '03',
    tone: 'red',
    icon: ClipboardCheck,
    titleKey: 'landing.stepMatchesTitle',
    descriptionKey: 'landing.stepMatchesDesc',
  },
  {
    number: '04',
    tone: 'orange',
    icon: BarChart3,
    titleKey: 'landing.stepReviewTitle',
    descriptionKey: 'landing.stepReviewDesc',
  },
];

export default function HowItWorksSection() {
  const t = useT();
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(
    () => typeof window !== 'undefined' && !('IntersectionObserver' in window),
  );
  const title = t('landing.workflowTitle');
  const [titleBefore, titleAfter] = title.split('GalloTrack');

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || revealed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [revealed]);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="from-background via-background to-accent-soft/40 relative scroll-mt-24 overflow-hidden bg-gradient-to-b py-20 sm:py-24"
    >
      <div
        aria-hidden="true"
        className="text-brand-red/10 dark:text-brand-red/10 pointer-events-none absolute -top-24 -left-24 hidden h-96 w-96 lg:block"
      >
        <Bird className="h-full w-full" strokeWidth={0.65} />
      </div>
      <div
        aria-hidden="true"
        className="text-brand-orange/15 dark:text-brand-orange/10 pointer-events-none absolute top-12 -right-16 hidden h-80 w-80 rotate-12 lg:block"
      >
        <Feather className="h-full w-full" strokeWidth={0.75} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <span
              aria-hidden="true"
              className="to-brand-red/70 h-px w-10 bg-gradient-to-r from-transparent to-brand-red/70 sm:w-16"
            />
            <p className="border-primary/20 bg-accent-soft/70 text-brand-red inline-flex items-center rounded-full border px-3.5 py-1.5 text-[10px] font-black tracking-[0.24em] uppercase break-words sm:px-4 sm:text-xs sm:tracking-[0.3em]">
              {t('landing.workflowBadge')}
            </p>
            <span
              aria-hidden="true"
              className="to-brand-red/70 h-px w-10 bg-gradient-to-l from-transparent to-brand-red/70 sm:w-16"
            />
          </div>

          <h2
            id="how-it-works-title"
            className="text-foreground mt-6 text-[clamp(2.6rem,5.2vw,4.5rem)] leading-[1.02] font-black tracking-tight break-words"
          >
            {titleBefore}
            <span className="text-brand-red">GalloTrack</span>
            {titleAfter}
          </h2>

          <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-base leading-relaxed font-medium break-words sm:text-lg">
            {t('landing.workflowDescription')}
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-x-6 gap-y-10 pt-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <StepCard
              key={step.number}
              number={step.number}
              tone={step.tone}
              icon={step.icon}
              title={t(step.titleKey)}
              description={t(step.descriptionKey)}
              revealed={revealed}
              delayMs={index * 100}
            />
          ))}
        </div>
      </div>

      <FooterWave />
    </section>
  );
}
