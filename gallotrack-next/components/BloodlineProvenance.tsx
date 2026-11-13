'use client';
import React from 'react';
import type { FowlRecord } from '@/lib/types';
import { traceComposition, type TraceSource } from '@/lib/bloodline-composition';
import { getCompositionSourceInfo, hasBothParentsRecorded } from '@/lib/breeding-classification';
import { formatBloodlineDisplayValue } from '@/lib/bloodline-report-ui';

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
    icon: 'M',
    badge:
      'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
  dam: {
    label: 'Dam',
    icon: 'F',
    badge: 'bg-pink-100 dark:bg-pink-950/60 text-pink border-pink-200 dark:border-pink-800',
  },
  self: {
    label: 'Self',
    icon: '',
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
export default function BloodlineProvenance({
  fowl,
  fowls,
  onOpenAncestor,
  title,
  subtitle,
}: Props) {
  const trace = React.useMemo(() => (fowl ? traceComposition(fowl, fowls) : []), [fowl, fowls]);
  const sourceInfo = React.useMemo(
    () => (fowl ? getCompositionSourceInfo(fowl, fowls) : null),
    [fowl, fowls],
  );
  const show5050 = React.useMemo(() => hasBothParentsRecorded(fowl ?? null, fowls), [fowl, fowls]);

  const meaningful = trace.some((entry) =>
    entry.sources.some((s) => s.depth > 0 || s.ancestor.id === null),
  );
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
    <div className="min-w-0 space-y-3 rounded-lg border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50 p-4 dark:border-sky-900/50 dark:from-sky-950/40 dark:to-indigo-950/40">
      <div className="min-w-0">
        <p className="text-xs font-black tracking-widest text-sky-700 uppercase dark:text-sky-300">
           {title || 'Where Each Percentage Comes From'}
        </p>
        {sourceInfo?.sourceLabel && sourceInfo.source !== 'assumed' && (
          <p className="mt-0.5 text-xs font-bold text-sky-800 dark:text-sky-300">
            Source: <span className="font-semibold">{sourceInfo.sourceLabel}</span>
          </p>
        )}
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed font-semibold">
          {subtitle ||
            (show5050
              ? 'Bawat linya ay isang ninunong nag-ambag — 50% mula sa Sire, 50% mula sa Dam, hinahati kada henerasyon.'
              : 'Bawat linya ay isang ninunong nag-ambag sa komposisyon ng lahi.')}
        </p>
      </div>

      <div className="space-y-3">
        {trace.map((entry, entryIndex) => {
          const dot = DOT[entryIndex % DOT.length];
          return (
            <div
              key={entry.strain}
              className="dark:bg-card/70 dark:border-border space-y-2 rounded-md border border-white/70 bg-white/80 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
                  <span className="dark:text-card-foreground min-w-0 text-xs font-black break-words text-slate-800">
                    {formatBloodlineDisplayValue(entry.strain)}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs font-black tracking-wide uppercase">
                    {entry.sources.length} source{entry.sources.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="dark:text-card-foreground shrink-0 text-xs font-black text-slate-900 tabular-nums">
                  {entry.pct}%
                </span>
              </div>

              <div className="space-y-2">
                {entry.sources.map((source, i) => {
                  const record = findAncestor(source);
                  const side = SIDE[source.side];
                  const shareOfStrain = entry.pct > 0 ? (source.pct / entry.pct) * 100 : 0;
                  return (
                    <div
                      key={`${source.side}-${source.depth}-${source.ancestor.name}-${i}`}
                      className="space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span
                            className={`shrink-0 font-black ${source.side === 'sire' ? 'text-sky-600 dark:text-sky-300' : source.side === 'dam' ? 'text-pink' : 'text-muted-foreground'}`}
                            aria-hidden="true"
                          >
                            {side.icon}
                          </span>
                          {record && onOpenAncestor ? (
                            <button
                              type="button"
                              onClick={() => onOpenAncestor(record)}
                              className="dark:text-card-foreground min-w-0 cursor-pointer font-bold break-words text-slate-800 underline-offset-2 hover:underline"
                              title={`Open ${source.ancestor.name} profile`}
                            >
                              {source.ancestor.name}
                            </button>
                          ) : (
                            <span
                              className={`min-w-0 font-bold break-words ${source.ancestor.name ? 'dark:text-card-foreground text-slate-700' : 'text-amber-700 dark:text-amber-300'}`}
                            >
                              {source.ancestor.name || 'Unregistered parent'}
                            </span>
                          )}
                          <span
                            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-xs font-black uppercase ${side.badge}`}
                          >
                            {side.label}
                          </span>
                          <span
                            className="dark:bg-muted text-muted-foreground dark:border-border shrink-0 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-black uppercase"
                            title={depthHint(source.depth)}
                          >
                            {depthBadge(source.depth)}
                          </span>
                          {source.circular && (
                            <span
                              className="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-xs font-black text-amber-700 uppercase dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              title="Circular pedigree — the walk stopped here instead of looping forever."
                            >
                              Loop
                            </span>
                          )}
                        </span>
                        <span className="dark:text-card-foreground shrink-0 font-black text-slate-800 tabular-nums">
                          {source.pct}%
                        </span>
                      </div>

                      <div className="dark:bg-muted h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                        <div
                          className={`h-full rounded-full ${dot}`}
                          style={{ width: `${Math.max(2, Math.min(100, shareOfStrain))}%` }}
                        />
                      </div>

                      <p className="text-muted-foreground text-xs font-semibold">
                        {entry.pct}% ng strain na ito ay galing kay{' '}
                        <span className="font-bold">
                          {source.ancestor.name || 'unregistered parent'}
                        </span>
                        {source.depth > 0 && (
                          <>
                            {' '}
                            (ninuno ay may {source.share}% sa sariling komposisyon → {source.pct}%
                            dito)
                          </>
                        )}
                        {source.ancestor.id === null && source.ancestor.name && (
                          <> · hindi rehistrado</>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground border-t border-sky-100 pt-2 text-xs leading-relaxed font-semibold dark:border-sky-900/50">
        Ang kabuuan ay eksaktong pareho ng pinapakita sa “Bloodline Percentage” sa itaas — ang trace
        na ito ay nagpapakita lang kung saan galing ang bawat porsyento.
      </p>
    </div>
  );
}
