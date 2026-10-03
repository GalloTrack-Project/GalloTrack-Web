'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAgeLabel } from '@/lib/helpers';
import { useFowl } from '@/lib/contexts/fowl-context';
import { Calendar, CircleDot, Activity, Crown } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';

type Filter = 'all' | 'soon' | 'overdue' | 'mature';

export default function MilestonesPage() {
  const { upcomingMilestones, activeFowls } = useFowl();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = upcomingMilestones.filter(({ info }) => {
    if (filter === 'soon') return info.next && info.next.daysUntil >= 0 && info.next.daysUntil <= 30;
    if (filter === 'overdue') return info.next && info.next.daysUntil < 0;
    if (filter === 'mature') return !info.next;
    return true;
  });

  const soonCount = upcomingMilestones.filter(x => x.info.next && x.info.next.daysUntil >= 0 && x.info.next.daysUntil <= 30).length;
  const overdueCount = upcomingMilestones.filter(x => x.info.next && x.info.next.daysUntil < 0).length;
  const matureCount = upcomingMilestones.filter(x => !x.info.next).length;

  const filters: { id: Filter; label: string; count: number; color: string }[] = [
    { id: 'all', label: 'All', count: upcomingMilestones.length, color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-muted dark:text-foreground dark:border-border' },
    { id: 'soon', label: 'Soon (30d)', count: soonCount, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' },
    { id: 'overdue', label: 'Overdue', count: overdueCount, color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30' },
    { id: 'mature', label: 'Fully Mature', count: matureCount, color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-md bg-white dark:bg-card border border-slate-200 dark:border-border flex items-center justify-center text-muted-foreground hover:text-success hover:border-emerald-200 dark:hover:text-emerald-400 dark:hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-foreground tracking-tight flex items-center gap-2">
              <Calendar size={18} /> Development Calendar & Milestones
            </h1>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">Stage transitions predicted from each chicken&apos;s birth date · {activeFowls.length} active chickens tracked</p>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              filter === f.id
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : `${f.color} hover:shadow-sm`
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* MILESTONES LIST */}
      <div className="bg-white dark:bg-card rounded-lg border border-slate-200/80 dark:border-border shadow-sm p-5 sm:p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <span className="block mb-3 text-muted-foreground"><Calendar size={36} /></span>
            <p className="text-sm font-bold text-muted-foreground">No milestones match this filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(({ fowl, info }) => {
              const soon = info.next !== null && info.next!.daysUntil >= 0 && info.next!.daysUntil <= 30;
              const overdue = info.next !== null && info.next!.daysUntil < 0;
              return (
                <div key={fowl.id} className={`flex items-center gap-3 p-3 rounded-md border transition-all ${soon ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30' : overdue ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30' : 'bg-slate-50/60 border-slate-100 dark:bg-muted/50 dark:border-border'}`}>
                  <span className="w-10 h-10 rounded-sm border border-slate-200 dark:border-border bg-white dark:bg-card flex items-center justify-center text-lg shrink-0">{info.current?.icon || <CircleDot size={20} />}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 dark:text-foreground truncate">{fowl.name} <span className="text-xs font-bold text-muted-foreground font-mono">#{fowl.id}</span></p>
                    <p className="text-xs text-muted-foreground font-semibold truncate">
                      {info.current?.stage || 'Chick'} · Age {getAgeLabel(info.parts)} · {fowl.gender}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {info.next ? (
                      <>
                        <p className={`text-xs font-black uppercase tracking-wide ${soon ? 'text-emerald-700 dark:text-emerald-300' : overdue ? 'text-danger dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>
                          {info.next.stage} {soon ? '· SOON' : overdue ? '· OVERDUE' : ''}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground font-bold">
                          {info.next.date.toLocaleDateString()} · {info.next.daysUntil >= 0 ? `in ${info.next.daysUntil}d` : `${Math.abs(info.next.daysUntil)}d ago`}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase">Fully mature</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STAGE REFERENCE */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border border-slate-200 dark:border-border rounded-lg p-5">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Development Stage Reference</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-md p-3 text-center">
            <span className="text-lg block"><CircleDot size={20} className="mx-auto" /></span>
            <p className="text-xs font-black text-slate-700 dark:text-foreground mt-1">Chick</p>
            <p className="text-xs text-muted-foreground">0–6 months</p>
          </div>
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-md p-3 text-center">
            <span className="text-lg block"><ChickenIcon size={20} className="mx-auto" /></span>
            <p className="text-xs font-black text-slate-700 dark:text-foreground mt-1">Stag / Pullet</p>
            <p className="text-xs text-muted-foreground">6–12 months</p>
          </div>
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-md p-3 text-center">
            <span className="text-lg block"><Activity size={20} className="mx-auto" /></span>
            <p className="text-xs font-black text-slate-700 dark:text-foreground mt-1">Bull Stag / Hen</p>
            <p className="text-xs text-muted-foreground">12–24 months</p>
          </div>
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-md p-3 text-center">
            <span className="text-lg block"><Crown size={20} className="mx-auto" /></span>
            <p className="text-xs font-black text-slate-700 dark:text-foreground mt-1">Cock / Senior Hen</p>
            <p className="text-xs text-muted-foreground">24+ months</p>
          </div>
        </div>
      </div>
    </div>
  );
}
