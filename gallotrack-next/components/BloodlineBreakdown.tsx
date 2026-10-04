'use client';
import React from 'react';
import {
  getBloodlineStats,
  UNKNOWN_BLOODLINE,
  type BloodlineComposition,
  type BloodlineStats,
} from '@/lib/bloodline-composition';

const PALETTE = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-lime-500',
];

const barColor = (strain: string, index: number): string => {
  if (strain.toLowerCase() === UNKNOWN_BLOODLINE.toLowerCase()) return 'bg-slate-400';
  return PALETTE[index % PALETTE.length];
};

type Props = {
  composition?: BloodlineComposition | null;
  stats?: BloodlineStats | null;
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

/**
 * Shows the hatian ng dugo — per-strain bloodline percentage breakdown.
 * Example: 50% Kelso · 25% Hatch · 25% Roundhead
 */
export default function BloodlineBreakdown({ composition, stats, title, subtitle, compact }: Props) {
  const resolved = stats ?? getBloodlineStats(composition ?? null);
  if (!resolved) return null;

  const { entries, dominant, strainCount, isDiluted, summary, knownPct, unknownPct } = resolved;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-lg p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
            🧬 {title || 'Bloodline Percentage Breakdown'}
          </p>
          {subtitle ? (
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">{subtitle}</p>
          ) : (
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
              50% Sire · 50% Dam — halved bawat henerasyon
            </p>
          )}
        </div>
        <div className="shrink-0 sm:text-right">
          <span className="inline-flex items-center gap-1.5 bg-emerald-700 text-white text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            {dominant.strain} {dominant.pct}%
          </span>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mt-1">
            {strainCount} bloodline{strainCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={entry.strain} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-xs font-black truncate ${
                  entry.isUnknown ? 'text-muted-foreground' : 'text-slate-700 dark:text-card-foreground'
                }`}
              >
                {entry.strain}
              </span>
              <span
                className={`text-xs font-black tabular-nums shrink-0 ${
                  entry.isUnknown ? 'text-muted-foreground' : 'text-slate-800 dark:text-card-foreground'
                }`}
              >
                {entry.pct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/80 dark:bg-muted overflow-hidden border border-white/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(entry.strain, i)}`}
                style={{ width: `${Math.max(2, Math.min(100, entry.pct))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {!compact && (
        <p className="text-xs text-muted-foreground font-semibold leading-relaxed border-t border-emerald-100 dark:border-emerald-900/50 pt-2">
          <span className="font-black text-emerald-700 dark:text-emerald-300">Summary:</span> {summary}
          {unknownPct > 0 && (
            <>
              {' '}
              · <span className="font-black text-muted-foreground">{unknownPct}% unregistered ancestry</span> — ilagay ang
              breed ng magulang para mabuo ang hatian.
            </>
          )}
          {knownPct > 0 && unknownPct === 0 && strainCount === 1 && (
            <> · Pure / single-bloodline ang hatian.</>
          )}
        </p>
      )}

      {isDiluted && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-md px-3 py-2">
          <p className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">⚠️ Banta ng “Galapsaw”</p>
          <p className="text-xs text-amber-700/90 dark:text-amber-300/90 font-semibold mt-0.5 leading-relaxed">
            Masyado nang maraming halo ang lahi ({strainCount} bloodlines, nangunguna lang ang {dominant.pct}%).
            Bumaba ang specific bloodline percentage — mas mahirap nang panatilihin ang magagandang katangian.
            Maganda ang pure o kontroladong breeding.
          </p>
        </div>
      )}
    </div>
  );
}
