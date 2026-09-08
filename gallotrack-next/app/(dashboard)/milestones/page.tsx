'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAgeLabel } from '@/lib/helpers';
import { useFowl } from '@/lib/contexts/fowl-context';

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
    { id: 'all', label: 'All', count: upcomingMilestones.length, color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { id: 'soon', label: 'Soon (30d)', count: soonCount, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'overdue', label: 'Overdue', count: overdueCount, color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { id: 'mature', label: 'Fully Mature', count: matureCount, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>📅</span> Development Calendar & Milestones
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Stage transitions predicted from each fowl&apos;s birth date · {activeFowls.length} active fowls tracked</p>
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
            className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
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
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">📅</span>
            <p className="text-sm font-bold text-slate-400">No milestones match this filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(({ fowl, info }) => {
              const soon = info.next !== null && info.next!.daysUntil >= 0 && info.next!.daysUntil <= 30;
              const overdue = info.next !== null && info.next!.daysUntil < 0;
              return (
                <div key={fowl.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${soon ? 'bg-emerald-50/80 border-emerald-200' : overdue ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50/60 border-slate-100'}`}>
                  <span className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-lg shrink-0">{info.current?.icon || '🐤'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{fowl.name} <span className="text-[9px] font-bold text-slate-400 font-mono">#{fowl.id}</span></p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">
                      {info.current?.stage || 'Chick'} · Age {getAgeLabel(info.parts)} · {fowl.gender}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {info.next ? (
                      <>
                        <p className={`text-[10px] font-black uppercase tracking-wide ${soon ? 'text-emerald-700' : overdue ? 'text-rose-600' : 'text-amber-700'}`}>
                          {info.next.stage} {soon ? '· SOON' : overdue ? '· OVERDUE' : ''}
                        </p>
                        <p className="text-[9px] font-mono text-slate-400 font-bold">
                          {info.next.date.toLocaleDateString()} · {info.next.daysUntil >= 0 ? `in ${info.next.daysUntil}d` : `${Math.abs(info.next.daysUntil)}d ago`}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] font-black text-emerald-700 uppercase">Fully mature</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STAGE REFERENCE */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl p-5">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Development Stage Reference</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-lg block">🐤</span>
            <p className="text-[10px] font-black text-slate-700 mt-1">Chick</p>
            <p className="text-[8px] text-slate-400">0–6 months</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-lg block">🐓</span>
            <p className="text-[10px] font-black text-slate-700 mt-1">Stag / Pullet</p>
            <p className="text-[8px] text-slate-400">6–12 months</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-lg block">💪</span>
            <p className="text-[10px] font-black text-slate-700 mt-1">Bull Stag / Hen</p>
            <p className="text-[8px] text-slate-400">12–24 months</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-lg block">👑</span>
            <p className="text-[10px] font-black text-slate-700 mt-1">Cock / Senior Hen</p>
            <p className="text-[8px] text-slate-400">24+ months</p>
          </div>
        </div>
      </div>
    </div>
  );
}
