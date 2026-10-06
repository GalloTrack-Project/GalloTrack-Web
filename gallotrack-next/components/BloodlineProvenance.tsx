'use client';
import React from 'react';
import type { FowlRecord } from '@/lib/types';
import { traceComposition, type TraceSource } from '@/lib/bloodline-composition';

const DOT = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-lime-500',
];

const SIDE: Record<TraceSource['side'], { label: string; icon: string; badge: string }> = {
  sire: {
    label: 'Sire',
    icon: '♂',
    badge: 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
  dam: {
    label: 'Dam',
    icon: '♀',
    badge: 'bg-pink-100 dark:bg-pink-950/60 text-pink border-pink-200 dark:border-pink-800',
  },
  self: {
    label: 'Self',
    icon: '🧬',
    badge: 'bg-slate-100 dark:bg-muted text-muted-foreground border-slate-200 dark:border-border',
  },
};

const depthBadge = (depth: number): string => {
  if (depth <= 0) return 'SELF';
  if (depth === 1) return 'PARENT';
  if (depth === 2) return 'GRANDPARENT';
  if (depth === 3) return 'GREAT-GRANDPARENT';
  return `GEN ${depth}`;
};

const depthLabel = (depth: number): string => {
  if (depth <= 0) return 'Self';
  if (depth === 1) return 'Parent';
  if (depth === 2) return 'Grandparent';
  if (depth === 3) return 'Great-grandparent';
  return `${depth} generations up`;
};

const depthHint = (depth: number): string => {
  if (depth <= 0) return 'The subject itself — its own listed strain.';
  const chain = Array.from({ length: depth }, () => '½').join(' × ');
  return `${depthLabel(depth)} — halved ${depth} time${depth === 1 ? '' : 's'} on the way down (share × ${chain}).`;
};

type Props = {
  fowl: FowlRecord | null | undefined;
  fowls: FowlRecord[];
  /** Called when a registered ancestor's name is clicked. */
  onOpenAncestor?: (fowl: FowlRecord) => void;
  title?: string;
  subtitle?: string;
};

/**
 * Explains where every percentage in the bloodline composition came from:
 * which ancestor, through which parent, and how many generations back.
 * Percentages here are the exact same numbers BloodlineBreakdown publishes.
 */
export default function BloodlineProvenance({ fowl, fowls, onOpenAncestor, title, subtitle }: Props) {
  const trace = React.useMemo(() => (fowl ? traceComposition(fowl, fowls) : []), [fowl, fowls]);

  const meaningful = trace.some((entry) => entry.sources.some((s) => s.depth > 0 || s.ancestor.id === null));
  if (!fowl || !meaningful) return null;

  const findAncestor = (source: TraceSource): FowlRecord | null => {
    if (source.ancestor.id !== null) {
      const byId = fowls.find((f) => f.id === source.ancestor.id);
      if (byId) return byId;
    }
    const key = (source.ancestor.name || '').trim().toLowerCase();
    if (!key || key === 'foundation stock') return null;
    return fowls.find((f) => (f.name || '').trim().toLowerCase() === key) || null;
  };

  return (
    <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-100 dark:border-sky-900/50 rounded-lg p-4 space-y-3">
      <div className="min-w-0">
        <p className="text-xs font-black text-sky-700 dark:text-sky-300 uppercase tracking-widest">
          🔎 {title || 'Where Each Percentage Comes From'}
        </p>
        <p className="text-xs text-muted-foreground font-semibold mt-0.5 leading-relaxed">
          {subtitle ||
            'Bawat linya ay isang ninunong nag-ambag — 50% mula sa Sire, 50% mula sa Dam, hinahati kada henerasyon.'}
        </p>
      </div>

      <div className="space-y-3">
        {trace.map((entry, entryIndex) => {
          const dot = DOT[entryIndex % DOT.length];
          return (
            <div
              key={entry.strain}
              className="bg-white/80 dark:bg-card/70 border border-white/70 dark:border-border rounded-md p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
                  <span className="text-xs font-black truncate text-slate-800 dark:text-card-foreground">
                    {entry.strain}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wide text-muted-foreground shrink-0">
                    {entry.sources.length} source{entry.sources.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="text-xs font-black tabular-nums shrink-0 text-slate-900 dark:text-card-foreground">
                  {entry.pct}%
                </span>
              </div>

              <div className="space-y-2">
                {entry.sources.map((source, i) => {
                  const record = findAncestor(source);
                  const side = SIDE[source.side];
                  const shareOfStrain = entry.pct > 0 ? (source.pct / entry.pct) * 100 : 0;
                  return (
                    <div key={`${source.side}-${source.depth}-${source.ancestor.name}-${i}`} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`font-black shrink-0 ${source.side === 'sire' ? 'text-sky-600 dark:text-sky-300' : source.side === 'dam' ? 'text-pink' : 'text-muted-foreground'}`}
                            aria-hidden="true"
                          >
                            {side.icon}
                          </span>
                          {record && onOpenAncestor ? (
                            <button
                              type="button"
                              onClick={() => onOpenAncestor(record)}
                              className="font-bold text-slate-800 dark:text-card-foreground hover:underline underline-offset-2 truncate cursor-pointer max-w-[12rem]"
                              title={`Open ${source.ancestor.name} profile`}
                            >
                              {source.ancestor.name}
                            </button>
                          ) : (
                            <span
                              className={`font-bold truncate ${source.ancestor.name ? 'text-slate-700 dark:text-card-foreground' : 'text-amber-700 dark:text-amber-300'}`}
                            >
                              {source.ancestor.name || 'Unregistered parent'}
                            </span>
                          )}
                          <span
                            className={`text-xs font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${side.badge}`}
                          >
                            {side.label}
                          </span>
                          <span
                            className="text-xs font-black uppercase px-1.5 py-0.5 rounded-full border bg-white dark:bg-muted text-muted-foreground border-slate-200 dark:border-border shrink-0"
                            title={depthHint(source.depth)}
                          >
                            {depthBadge(source.depth)}
                          </span>
                          {source.circular && (
                            <span
                              className="text-xs font-black uppercase px-1.5 py-0.5 rounded-full border bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 shrink-0"
                              title="Circular pedigree — the walk stopped here instead of looping forever."
                            >
                              Loop
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-black tabular-nums text-slate-800 dark:text-card-foreground">
                          {source.pct}%
                        </span>
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-slate-200/70 dark:bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${dot}`}
                          style={{ width: `${Math.max(2, Math.min(100, shareOfStrain))}%` }}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground font-semibold">
                        {entry.pct}% ng strain na ito ay galing kay{' '}
                        <span className="font-bold">{source.ancestor.name || 'unregistered parent'}</span>
                        {source.depth > 0 && (
                          <>
                            {' '}
                            (ninuno ay may {source.share}% sa sariling komposisyon → {source.pct}% dito)
                          </>
                        )}
                        {source.ancestor.id === null && source.ancestor.name && <> · hindi rehistrado</>}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground font-semibold leading-relaxed border-t border-sky-100 dark:border-sky-900/50 pt-2">
        Ang kabuuan ay eksaktong pareho ng pinapakita sa “Bloodline Percentage” sa itaas — ang trace na ito ay
        nagpapakita lang kung saan galing ang bawat porsyento.
      </p>
    </div>
  );
}
