'use client';
import React from 'react';
import { Dna, Swords, BarChart3, Building2 } from 'lucide-react';

const features = [
  {
    icon: Dna,
    title: 'Lineage Tracking',
    subtitle: 'Ancestry & Genetics',
    description:
      'Map sire and dam parentage with structured offspring birth codes (such as 1A1, 2B1) and automatic bloodline percentage breakdowns.',
    highlight: 'Parentage & Bloodline Math',
  },
  {
    icon: Swords,
    title: 'Match Analytics',
    subtitle: 'Match Logs',
    description:
      'Log official battle encounters, opponent details, match outcomes (win, loss, draw), calculated win rates, and post-fight condition status.',
    highlight: 'Match Logs & Win Rates',
  },
  {
    icon: BarChart3,
    title: 'Flock Dashboard',
    subtitle: 'Flock Overview',
    description:
      'Monitor active rosters across roosters, breeding hens, and growing stags with centralized flock counts and fight status splits.',
    highlight: 'Flock Overview & Status',
  },
  {
    icon: Building2,
    title: 'Farm Registry',
    subtitle: 'Chicken Registry & Inventory',
    description:
      'Catalog active breeders, offspring, and archived chickens with physical wing band tracking and structured breeding classifications.',
    highlight: 'Breeding Registry & Inventory',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-14 sm:py-20 bg-muted/40 border-y border-border/60 relative scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-12">
          <h2 className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            Core Capabilities
          </h2>
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Built for Gamefowl Breeders
          </p>
          <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
            Eliminate paper ledgers. GalloTrack gives breeders reliable digital tools to record heritage, track match logs, and plan breeding pairings.
          </p>
        </div>

        {/* 4 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative rounded-xl border border-border/80 bg-card p-5 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between"
              >
                {/* Top Icon and Label */}
                <div className="space-y-3.5">
                  <div className="w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider block">
                      {feature.subtitle}
                    </span>
                    <h3 className="text-lg font-black text-foreground tracking-tight">
                      {feature.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Bottom Highlight Tag */}
                <div className="pt-4 mt-5 border-t border-border/60">
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
