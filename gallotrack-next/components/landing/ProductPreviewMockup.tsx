'use client';
import React from 'react';
import { Dna, Swords, Trophy } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';

export default function ProductPreviewMockup() {
  return (
    <div className="relative w-full max-w-xl mx-auto select-none min-w-0">
      {/* Decorative background glows */}
      <div className="absolute -top-10 -left-10 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Mockup Card */}
      <div className="relative rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl p-5 sm:p-6 space-y-5 overflow-hidden">
        {/* Subtle top glare banner */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        {/* Card Header: Rooster Identity */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-success shadow-inner shrink-0">
              <ChickenIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-emerald-500/15 text-success border border-emerald-500/25 uppercase">
                  [1A1]
                </span>
                <h3 className="text-lg font-black text-foreground tracking-tight min-w-0 break-words">
                  Sample Rooster
                </h3>
              </div>
              <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                Crossbred · Wing Band #WB-001
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border uppercase tracking-wider">
              Sample Data
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-success border border-emerald-500/20 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Active Rooster
            </span>
          </div>
        </div>

        {/* Lineage & Ancestry Chips */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-1.5 min-w-0">
              <Dna className="w-3.5 h-3.5 text-emerald-500" />
              Automatic Bloodline Calculation
            </span>
            <span className="text-foreground font-black">Generation F1</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block">Sire (Father)</span>
              <p className="font-extrabold text-foreground truncate">Sample Sire</p>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">Pure Strain A</span>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block">Dam (Mother)</span>
              <p className="font-extrabold text-foreground truncate">Sample Dam</p>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">Pure Strain B</span>
            </div>
          </div>

          {/* Bloodline Composition Progress */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
              <span>Bloodline Composition</span>
              <span className="text-foreground">50% Strain A / 50% Strain B</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
              <div className="h-full bg-amber-400 w-1/2" title="50% Strain A" />
              <div className="h-full bg-emerald-500 w-1/2" title="50% Strain B" />
            </div>
          </div>
        </div>

        {/* Match Performance Snapshot */}
        <div className="pt-2 border-t border-border/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-1.5 min-w-0">
              <Swords className="w-3.5 h-3.5 text-emerald-500" />
              Fight Performance
            </span>
            <span className="text-success font-black">83.3% Win Rate</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
              <p className="text-lg font-black text-success">10</p>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Wins</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
              <p className="text-lg font-black text-danger">1</p>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Loss</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
              <p className="text-lg font-black text-amber-500">1</p>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Draw</span>
            </div>
          </div>

          {/* Last Match Snapshot Row */}
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between text-xs">
            <div className="flex flex-wrap items-center gap-2 min-w-0 pr-2">
              <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-foreground truncate">
                Won vs Opponent A
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">· Sample Arena</span>
            </div>
            <span className="font-extrabold text-success shrink-0 text-xs uppercase tracking-wide">
              Fit / Recovered
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
