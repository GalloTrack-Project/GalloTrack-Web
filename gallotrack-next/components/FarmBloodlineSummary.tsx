'use client';
import React, { useState } from 'react';
import { useGaloTrack } from '@/lib/context';
import { Dna, Trophy } from 'lucide-react';

export default function FarmBloodlineSummary() {
  const { getFarmBloodlineSummary } = useGaloTrack();
  const [expanded, setExpanded] = useState(false);
  const summary = getFarmBloodlineSummary();

  return (
    <div className="bg-card border-border space-y-4 rounded-lg border p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Dna className="text-teal h-5 w-5" />
          <h3 className="text-card-foreground text-sm font-black">Farm Bloodline Overview</h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-teal hover:text-teal cursor-pointer text-xs font-bold"
        >
          {expanded ? '▲ Less' : '▼ Details'}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-muted/50 border-border rounded-lg border p-3 text-center">
          <p className="text-teal text-2xl font-black">{summary.totalFowls}</p>
          <p className="text-muted-foreground mt-1 text-xs font-bold uppercase">Total Chickens</p>
        </div>
        <div className="bg-muted/50 border-border rounded-lg border p-3 text-center">
          <p className="text-info text-2xl font-black">{summary.avgPurity}%</p>
          <p className="text-muted-foreground mt-1 text-xs font-bold uppercase">Avg Purity</p>
        </div>
        <div className="bg-muted/50 border-border rounded-lg border p-3 text-center">
          <p className="text-success text-2xl font-black">{summary.avgHybridVigor}</p>
          <p className="text-muted-foreground mt-1 text-xs font-bold uppercase">Avg Vigor</p>
        </div>
        <div className="bg-muted/50 border-border rounded-lg border p-3 text-center">
          <p
            className={`text-2xl font-black ${summary.closeBreedingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-success'}`}
          >
            {summary.closeBreedingCount}
          </p>
          <p className="text-muted-foreground mt-1 text-xs font-bold uppercase">Close Breeding</p>
          {summary.lineBreedingCount > 0 ? (
            <p className="mt-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              {summary.lineBreedingCount} Line bred
            </p>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">0 Line bred</p>
          )}
        </div>
      </div>

      {/* Top Crosses */}
      {summary.topCrosses && summary.topCrosses.length > 0 && (
        <div className="space-y-2">
          <p className="text-warning flex items-center gap-1 text-xs font-black tracking-widest uppercase">
            <Trophy className="h-3 w-3" /> Top Performing Crosses
          </p>
          <div className="flex flex-wrap gap-2">
            {summary.topCrosses.map((c) => (
              <span
                key={c.pattern}
                className="bg-muted border-border text-warning rounded-full border px-2.5 py-1 text-xs font-bold"
              >
                <span
                  className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${c.tier === 'S' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                ></span>
                {c.pattern}{' '}
                <span className="text-muted-foreground">
                  ({c.tier}-tier, {c.vigor} vigor)
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Strain Distribution */}
      {summary.strainRankings && summary.strainRankings.length > 0 && (
        <div className="space-y-2">
          <p className="text-teal text-xs font-black tracking-widest uppercase">
            Strain Distribution
          </p>
          <div className="space-y-1.5">
            {summary.strainRankings.map((s) => (
              <div
                key={s.strain}
                className="bg-muted/50 border-border flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-card-foreground text-xs font-black">{s.strain}</span>
                  <span className="text-muted-foreground text-xs">({s.count} chickens)</span>
                </div>
                <span className="text-info text-xs font-bold">
                  {s.avgWinRate !== null ? `${s.avgWinRate}% avg win rate` : 'No match data'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross Patterns */}
      {summary.crossPatterns.length > 0 && expanded && (
        <div className="space-y-2">
          <p className="text-violet text-xs font-black tracking-widest uppercase">Cross Patterns</p>
          <div className="space-y-1.5">
            {summary.crossPatterns.map((cp) => (
              <div
                key={cp.pattern}
                className="bg-muted/50 border-border flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${cp.tier === 'S' ? 'bg-amber-400' : cp.tier === 'A' ? 'bg-emerald-400' : cp.tier === 'B' ? 'bg-sky-400' : 'bg-muted-foreground'}`}
                  ></span>
                  <span className="text-card-foreground text-xs font-black">{cp.pattern}</span>
                  <span className="text-muted-foreground text-xs">({cp.count})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-black ${cp.tier === 'S' ? 'text-warning bg-amber-500/15' : cp.tier === 'A' ? 'text-success bg-emerald-500/15' : 'bg-muted text-muted-foreground'}`}
                  >
                    {cp.tier}
                  </span>
                  <span className="text-success text-xs font-bold">{cp.avgVigor} vigor</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
