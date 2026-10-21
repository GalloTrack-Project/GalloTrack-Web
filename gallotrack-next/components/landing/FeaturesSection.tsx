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
    <section
      id="features"
      className="bg-muted/40 border-border/60 relative scroll-mt-24 border-y py-14 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-10 max-w-3xl space-y-3 text-center sm:mb-12">
          <h2 className="font-mono text-xs font-black tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
            Core Capabilities
          </h2>
          <p className="text-foreground text-2xl font-black tracking-tight sm:text-3xl">
            Built for Gamefowl Breeders
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed font-medium sm:text-base">
            Eliminate paper ledgers. GalloTrack gives breeders reliable digital tools to record
            heritage, track match logs, and plan breeding pairings.
          </p>
        </div>

        {/* 4 Feature Cards Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group border-border/80 bg-card relative flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all duration-200 hover:border-emerald-500/40 hover:shadow-md"
              >
                {/* Top Icon and Label */}
                <div className="space-y-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-colors duration-200 group-hover:bg-emerald-600 group-hover:text-white dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-mono text-xs font-bold tracking-wider uppercase">
                      {feature.subtitle}
                    </span>
                    <h3 className="text-foreground text-lg font-black tracking-tight">
                      {feature.title}
                    </h3>
                  </div>

                  <p className="text-muted-foreground text-xs leading-relaxed font-medium sm:text-sm">
                    {feature.description}
                  </p>
                </div>

                {/* Bottom Highlight Tag */}
                <div className="border-border/60 mt-5 border-t pt-4">
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
