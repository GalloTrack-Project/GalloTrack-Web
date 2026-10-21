'use client';
import React from 'react';
import { Dna, Swords, Trophy } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';

export default function ProductPreviewMockup() {
  return (
    <div className="relative mx-auto w-full max-w-xl min-w-0 select-none">
      {/* Decorative background glows */}
      <div className="pointer-events-none absolute -top-10 -left-10 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 -bottom-10 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />

      {/* Main Mockup Card */}
      <div className="border-border/80 bg-card/90 relative space-y-5 overflow-hidden rounded-2xl border p-5 shadow-2xl backdrop-blur-xl sm:p-6">
        {/* Subtle top glare banner */}
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        {/* Card Header: Rooster Identity */}
        <div className="border-border/60 flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="text-success flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 shadow-inner">
              <ChickenIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-success rounded border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-black uppercase">
                  [1A1]
                </span>
                <h3 className="text-foreground min-w-0 text-lg font-black tracking-tight break-words">
                  Sample Rooster
                </h3>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs font-semibold">
                Crossbred · Wing Band #WB-001
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-muted text-muted-foreground border-border rounded border px-2 py-0.5 font-mono text-xs font-bold tracking-wider uppercase">
              Sample Data
            </span>
            <span className="text-success inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-black tracking-wide uppercase">
              <span className="bg-success h-2 w-2 animate-pulse rounded-full" />
              Active Rooster
            </span>
          </div>
        </div>

        {/* Lineage & Ancestry Chips */}
        <div className="space-y-2.5">
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs font-bold tracking-wider uppercase">
            <span className="flex min-w-0 items-center gap-1.5">
              <Dna className="h-3.5 w-3.5 text-emerald-500" />
              Automatic Bloodline Calculation
            </span>
            <span className="text-foreground font-black">Generation F1</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="border-border/60 bg-muted/30 space-y-1 rounded-lg border p-3">
              <span className="text-muted-foreground block text-xs font-bold tracking-widest uppercase">
                Sire (Father)
              </span>
              <p className="text-foreground truncate font-extrabold">Sample Sire</p>
              <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Pure Strain A
              </span>
            </div>
            <div className="border-border/60 bg-muted/30 space-y-1 rounded-lg border p-3">
              <span className="text-muted-foreground block text-xs font-bold tracking-widest uppercase">
                Dam (Mother)
              </span>
              <p className="text-foreground truncate font-extrabold">Sample Dam</p>
              <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Pure Strain B
              </span>
            </div>
          </div>

          {/* Bloodline Composition Progress */}
          <div className="space-y-1.5 pt-1">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-bold">
              <span>Bloodline Composition</span>
              <span className="text-foreground">50% Strain A / 50% Strain B</span>
            </div>
            <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
              <div className="h-full w-1/2 bg-amber-400" title="50% Strain A" />
              <div className="h-full w-1/2 bg-emerald-500" title="50% Strain B" />
            </div>
          </div>
        </div>

        {/* Match Performance Snapshot */}
        <div className="border-border/60 space-y-3 border-t pt-2">
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs font-bold tracking-wider uppercase">
            <span className="flex min-w-0 items-center gap-1.5">
              <Swords className="h-3.5 w-3.5 text-emerald-500" />
              Fight Performance
            </span>
            <span className="text-success font-black">83.3% Win Rate</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="border-border/60 bg-muted/30 rounded-lg border p-2.5">
              <p className="text-success text-lg font-black">10</p>
              <span className="text-muted-foreground text-xs font-bold uppercase">Wins</span>
            </div>
            <div className="border-border/60 bg-muted/30 rounded-lg border p-2.5">
              <p className="text-danger text-lg font-black">1</p>
              <span className="text-muted-foreground text-xs font-bold uppercase">Loss</span>
            </div>
            <div className="border-border/60 bg-muted/30 rounded-lg border p-2.5">
              <p className="text-lg font-black text-amber-500">1</p>
              <span className="text-muted-foreground text-xs font-bold uppercase">Draw</span>
            </div>
          </div>

          {/* Last Match Snapshot Row */}
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
            <div className="flex min-w-0 flex-wrap items-center gap-2 pr-2">
              <Trophy className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="text-foreground truncate font-bold">Won vs Opponent A</span>
              <span className="text-muted-foreground hidden text-xs sm:inline">· Sample Arena</span>
            </div>
            <span className="text-success shrink-0 text-xs font-extrabold tracking-wide uppercase">
              Fit / Recovered
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
