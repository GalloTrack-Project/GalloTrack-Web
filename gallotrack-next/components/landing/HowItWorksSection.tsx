'use client';

import React from 'react';
import { ArrowRight, GitFork, Swords, TrendingUp, UserCheck } from 'lucide-react';
import { useT, type TranslationKey } from '@/lib/i18n';

type WorkflowStep = {
  step: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: typeof UserCheck;
};

const STEPS: WorkflowStep[] = [
  {
    step: '01',
    titleKey: 'landing.stepRegisterTitle',
    descriptionKey: 'landing.stepRegisterDesc',
    icon: UserCheck,
  },
  {
    step: '02',
    titleKey: 'landing.stepOffspringTitle',
    descriptionKey: 'landing.stepOffspringDesc',
    icon: GitFork,
  },
  {
    step: '03',
    titleKey: 'landing.stepMatchesTitle',
    descriptionKey: 'landing.stepMatchesDesc',
    icon: Swords,
  },
  {
    step: '04',
    titleKey: 'landing.stepReviewTitle',
    descriptionKey: 'landing.stepReviewDesc',
    icon: TrendingUp,
  },
];

export default function HowItWorksSection() {
  const t = useT();

  return (
    <section id="how-it-works" className="bg-background relative scroll-mt-24 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl space-y-3 text-center sm:mb-14">
          <h2 className="text-brand-red font-mono text-xs font-black tracking-widest uppercase">
            {t('landing.workflowEyebrow')}
          </h2>
          <p className="text-foreground text-2xl font-black tracking-tight break-words sm:text-3xl">
            {t('landing.workflowTitle')}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed font-medium break-words sm:text-base">
            {t('landing.workflowDescription')}
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="border-border/70 bg-card/90 relative flex min-w-0 flex-col justify-between rounded-xl border p-5 shadow-sm transition-colors hover:border-brand-orange/50 motion-reduce:transition-none"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-brand-red/80 font-mono text-xl font-black">
                      {step.step}
                    </span>
                    <div className="bg-accent-soft text-brand-red flex h-9 w-9 items-center justify-center rounded-lg">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>

                  <h3 className="text-foreground text-base font-black tracking-tight break-words">
                    {t(step.titleKey)}
                  </h3>

                  <p className="text-muted-foreground text-xs leading-relaxed font-medium break-words sm:text-sm">
                    {t(step.descriptionKey)}
                  </p>
                </div>

                {index < STEPS.length - 1 && (
                  <div className="text-border pointer-events-none absolute top-1/2 -right-3 z-20 hidden -translate-y-1/2 lg:block">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
