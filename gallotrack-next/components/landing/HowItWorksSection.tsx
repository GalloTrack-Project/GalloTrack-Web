'use client';
import React from 'react';
import { UserCheck, GitFork, Swords, TrendingUp } from 'lucide-react';

const steps = [
  {
    step: '01',
    title: 'Register Your Breeders',
    icon: UserCheck,
    description:
      'Enroll your active sires (Breeding Males with numeric IDs) and dams (Breeding Females with letter IDs) with verified bloodlines, wing bands, and health records.',
  },
  {
    step: '02',
    title: 'Track Offspring & Lineage',
    icon: GitFork,
    description:
      'Log new clutches and let GalloTrack assign structured offspring codes (e.g., 1A1) while automatically calculating pure and cross bloodline percentages.',
  },
  {
    step: '03',
    title: 'Record Match Encounters',
    icon: Swords,
    description:
      'Log fight events with opponent details, arena locations, fight outcomes (Win/Loss/Draw), and post-fight condition evaluations (Fit, Injured, Recovered).',
  },
  {
    step: '04',
    title: 'Review Performance & Insights',
    icon: TrendingUp,
    description:
      'Evaluate individual and family win rates, trace battle-tested bloodlines across generations, and make informed breeding pairings.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-background relative scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16 sm:mb-20">
          <h2 className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            Workflow
          </h2>
          <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            How GalloTrack Powers Your Breeding Operation
          </p>
          <p className="text-base text-muted-foreground font-medium leading-relaxed">
            A structured, repeatable protocol from pedigree registration through arena performance analytics.
          </p>
        </div>

        {/* 4 Steps Timeline / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="relative flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm shadow-sm hover:border-emerald-500/40 transition-colors"
              >
                <div className="space-y-4">
                  {/* Step Number and Icon */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-emerald-600/70 dark:text-emerald-400/80">
                      {s.step}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-foreground tracking-tight">
                    {s.title}
                  </h3>

                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    {s.description}
                  </p>
                </div>

                {/* Step indicator arrow for desktop */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 text-border pointer-events-none z-20">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
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
