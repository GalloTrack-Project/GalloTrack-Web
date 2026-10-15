'use client';
import React from 'react';
import { UserCheck, GitFork, Swords, TrendingUp } from 'lucide-react';

const steps = [
  {
    step: '01',
    title: 'Register Your Breeders',
    icon: UserCheck,
    description:
      'Enroll your active sires (Breeding Males with numeric IDs) and dams (Breeding Females with letter IDs) with bloodlines, wing bands, and physical traits.',
  },
  {
    step: '02',
    title: 'Track Offspring & Lineage',
    icon: GitFork,
    description:
      'Log new clutches and assign structured offspring codes (e.g., 1A1) while automatically calculating bloodline composition percentages.',
  },
  {
    step: '03',
    title: 'Record Match Logs',
    icon: Swords,
    description:
      'Log fight encounters with opponent details, arena locations, fight outcomes (Win/Loss/Draw), and post-fight condition status.',
  },
  {
    step: '04',
    title: 'Review Performance & Insights',
    icon: TrendingUp,
    description:
      'Evaluate individual and pairing win rates, track battle-tested offspring, and make informed breeding pairings.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-14 sm:py-20 bg-background relative scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-14">
          <h2 className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            Workflow
          </h2>
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            How GalloTrack Works
          </p>
          <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
            A structured protocol from breeder registration through match logs and win rate tracking.
          </p>
        </div>

        {/* 4 Steps Timeline / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="relative flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur-sm shadow-sm hover:border-emerald-500/40 transition-colors"
              >
                <div className="space-y-3.5">
                  {/* Step Number and Icon */}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black font-mono text-emerald-600/70 dark:text-emerald-400/80">
                      {s.step}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-base font-black text-foreground tracking-tight">
                    {s.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                    {s.description}
                  </p>
                </div>

                {/* Step indicator arrow for desktop */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-border pointer-events-none z-20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
