'use client';
import React from 'react';
import { Dna, Swords, BarChart3, Building2 } from 'lucide-react';

const features = [
  {
    icon: Dna,
    title: 'Lineage Tracking',
    subtitle: 'Ancestry & Genetics',
    description:
      'Map full sire and dam parentage with structured offspring birth codes (such as 1A1, 2B1) and precise automated bloodline percentage breakdowns.',
    highlight: 'Parentage & Generation Math',
  },
  {
    icon: Swords,
    title: 'Match Analytics',
    subtitle: 'Fight Performance Logs',
    description:
      'Log official battle encounters, opponent details, match outcomes (win, loss, draw), calculated win rates, and post-fight physical recovery conditions.',
    highlight: 'Event & Recovery History',
  },
  {
    icon: BarChart3,
    title: 'Flock Dashboard',
    subtitle: 'Real-Time Farm Overview',
    description:
      'Monitor active rosters across roosters, breeding hens, and growing stags with centralized status indicators, fight splits, and health tracking.',
    highlight: 'Active Bird Metrics',
  },
  {
    icon: Building2,
    title: 'Farm Registry',
    subtitle: 'Flock Inventory & Breeding Hub',
    description:
      'Maintain complete digital archives for active breeders, chicks, and archived chickens with seamless multi-farm support and dedicated role permissions.',
    highlight: 'Multi-Farm Management',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-muted/40 border-y border-border/60 relative scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14 sm:mb-18">
          <h2 className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            Core Capabilities
          </h2>
          <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Engineered Specifically for Professional Gamefowl Breeders
          </p>
          <p className="text-base text-muted-foreground font-medium leading-relaxed">
            Eliminate guesswork and paper ledgers. GalloTrack gives breeders reliable digital tools to record heritage, evaluate fighting records, and plan every pairing.
          </p>
        </div>

        {/* 4 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative rounded-xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Top Icon and Label */}
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider block">
                      {feature.subtitle}
                    </span>
                    <h3 className="text-xl font-black text-foreground tracking-tight">
                      {feature.title}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Bottom Highlight Tag */}
                <div className="pt-6 mt-6 border-t border-border/60">
                  <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {feature.highlight}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
