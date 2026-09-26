'use client';
import React, { useMemo, useState } from 'react';
import type { FowlRecord } from '@/lib/types';
import { getFowlBloodlineStats, UNKNOWN_BLOODLINE } from '@/lib/bloodline-composition';
import BloodlineBreakdown from '@/components/BloodlineBreakdown';

const MAX_ANCESTOR_GENERATIONS = 3;

const key = (v?: string | null) => (v || '').trim().toLowerCase();
const isAbsent = (v?: string | null) => {
  const k = key(v);
  return k === '' || k === 'foundation stock';
};

type CardProps = {
  label: string;
  name: string;
  fowl?: FowlRecord;
  fowls: FowlRecord[];
  codes: Map<string, string>;
  generation: number;
  accent: 'emerald' | 'sky' | 'amber' | 'violet';
  onPick?: (f: FowlRecord) => void;
};

const ACCENT: Record<CardProps['accent'], { border: string; badge: string; text: string }> = {
  emerald: { border: 'border-emerald-300 dark:border-emerald-800', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-400' },
  sky: { border: 'border-sky-300 dark:border-sky-800', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400', text: 'text-sky-700 dark:text-sky-400' },
  amber: { border: 'border-amber-300 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400', text: 'text-amber-700 dark:text-amber-400' },
  violet: { border: 'border-violet-300 dark:border-violet-800', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400', text: 'text-violet-700 dark:text-violet-400' },
};

function AncestorCard({ label, name, fowl, fowls, codes, generation, accent, onPick }: CardProps) {
  const a = ACCENT[accent];
  const stats = fowl ? getFowlBloodlineStats(fowl, fowls) : null;
  const code = fowl ? codes.get(String(fowl.id)) || '' : '';
  const missing = isAbsent(name);

  return (
    <button
      type="button"
      onClick={() => fowl && onPick?.(fowl)}
      disabled={!fowl}
      className={`w-[184px] shrink-0 text-left bg-card rounded-xl border ${a.border} shadow-sm px-3 py-2 space-y-1 transition-all ${
        fowl ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'opacity-90 cursor-default'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[8px] font-black uppercase tracking-widest ${a.text}`}>{label}</span>
        <span className="text-[8px] font-black text-muted-foreground tabular-nums">G{generation}</span>
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        {code && (
          <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded shrink-0 ${a.badge}`}>{code}</span>
        )}
        <span className="text-[11px] font-black text-card-foreground truncate">
          {missing ? (name || 'Foundation Stock') : name}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold text-muted-foreground truncate">
          {fowl ? fowl.breed || '—' : 'Not in registry'}
        </span>
        {stats && (
          <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
            {stats.dominant.pct}%
          </span>
        )}
      </div>
      {stats && stats.strainCount > 1 && (
        <p className="text-[8px] font-semibold text-muted-foreground truncate">{stats.summary}</p>
      )}
    </button>
  );
}

type BranchProps = {
  sireName?: string;
  damName?: string;
  generation: number;
  fowls: FowlRecord[];
  byName: Map<string, FowlRecord>;
  codes: Map<string, string>;
  onPick?: (f: FowlRecord) => void;
};

function Branch({ sireName, damName, generation, fowls, byName, codes, onPick }: BranchProps) {
  if (generation > MAX_ANCESTOR_GENERATIONS) return null;
  const accent: CardProps['accent'] =
    generation === 1 ? 'sky' : generation === 2 ? 'amber' : 'violet';

  const renderNode = (name: string | undefined, role: 'Sire' | 'Dam') => {
    const fowl = isAbsent(name) ? undefined : byName.get(key(name));
    const label = generation === 1 ? role : generation === 2 ? `Grand${role}` : `G-Grand${role}`;
    return (
      <div className="flex items-stretch gap-6">
        <div className="flex flex-col justify-center">
          <AncestorCard
            label={label}
            name={name || 'Foundation Stock'}
            fowl={fowl}
            fowls={fowls}
            codes={codes}
            generation={generation}
            accent={accent}
            onPick={onPick}
          />
        </div>
        {fowl && generation < MAX_ANCESTOR_GENERATIONS && (
          <Branch
            sireName={fowl.sire}
            damName={fowl.dam}
            generation={generation + 1}
            fowls={fowls}
            byName={byName}
            codes={codes}
            onPick={onPick}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col justify-between gap-4 py-1">
      {renderNode(sireName, 'Sire')}
      {renderNode(damName, 'Dam')}
    </div>
  );
}

type Props = {
  fowls: FowlRecord[];
  codes: Map<string, string>;
  selectedId?: number | null;
  onSelect?: (f: FowlRecord) => void;
};

/**
 * 4-generation ancestor (pedigree) chart.
 * Subject on the left, ancestors branching right: Sire above, Dam below.
 */
export default function PedigreeTree({ fowls, codes, selectedId, onSelect }: Props) {
  const [internalId, setInternalId] = useState<number | null>(null);
  const activeId = selectedId != null ? selectedId : internalId;
  const select = (f: FowlRecord) => {
    setInternalId(f.id);
    onSelect?.(f);
  };

  const byName = useMemo(() => {
    const m = new Map<string, FowlRecord>();
    fowls.forEach((f) => {
      const k = key(f.name);
      if (k && !m.has(k)) m.set(k, f);
    });
    return m;
  }, [fowls]);

  const subject = useMemo(
    () => fowls.find((f) => f.id === activeId) || fowls[0] || null,
    [fowls, activeId]
  );

  if (fowls.length === 0 || !subject) {
    return (
      <div className="bg-card p-10 text-center rounded-3xl border border-border shadow-sm space-y-2">
        <p className="text-sm font-extrabold text-card-foreground">No Pedigree To Show</p>
        <p className="text-xs text-muted-foreground font-medium">Register chickens with Sire and Dam to build the lineage map.</p>
      </div>
    );
  }

  const stats = getFowlBloodlineStats(subject, fowls);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-3xl border border-border shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
            📜 Pedigree / Lineage Map
          </p>
          <p className="text-[10px] text-muted-foreground font-semibold">
            3 ancestor generations (parents → grandparents → great-grandparents). Sire sa itaas, Dam sa ibaba.
          </p>
        </div>
        <label className="shrink-0">
          <span className="sr-only">Select chicken</span>
          <select
            value={subject.id}
            onChange={(e) => {
              const f = fowls.find((x) => x.id === Number(e.target.value));
              if (f) select(f);
            }}
            className="w-full sm:w-72 p-2.5 border border-border rounded-xl bg-card text-card-foreground text-xs font-bold outline-none focus:border-emerald-500 cursor-pointer"
          >
            {fowls.map((f) => (
              <option key={f.id} value={f.id}>
                {codes.get(String(f.id)) ? `${codes.get(String(f.id))} · ` : ''}
                {f.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {stats && (
        <BloodlineBreakdown
          stats={stats}
          title={`Bloodline Hatian — ${subject.name}`}
          subtitle="Bawat ninuno ay nag-aambag ng 50% sa kada henerasyon"
        />
      )}

      <div className="bg-card rounded-3xl border border-border shadow-sm p-5 overflow-auto max-h-[70vh]">
        <div className="flex items-stretch gap-6 min-w-max">
          <div className="flex flex-col justify-center">
            <AncestorCard
              label="Subject"
              name={subject.name}
              fowl={subject}
              fowls={fowls}
              codes={codes}
              generation={0}
              accent="emerald"
              onPick={select}
            />
          </div>
          <Branch
            sireName={subject.sire}
            damName={subject.dam}
            generation={1}
            fowls={fowls}
            byName={byName}
            codes={codes}
            onPick={select}
          />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground font-semibold">
        Ang bawat porsyento ay hati mula sa magulang ({UNKNOWN_BLOODLINE} = hindi rehistrado ang magulang sa registry).
        Kapag masyadong maraming krus at hindi na-track, bumababa ang specific bloodline percentage (“galapsaw”).
      </p>
    </div>
  );
}
