'use client';
import React from 'react';
import type { FowlRecord, PageId, ProfilingSubTab } from '@/lib/types';

type Props = {
  fowls: FowlRecord[];
  search: string;
  setSearch: (v: string) => void;
  debouncedSearch: string;
  setCurrentPage: (v: PageId) => void;
  setProfilingSubTab: (v: ProfilingSubTab) => void;
};

export default function MarketplacePage({ fowls, search, setSearch, debouncedSearch, setCurrentPage, setProfilingSubTab }: Props) {
  const filteredFowls = fowls.filter(
    item => item.status === 'Active' && item.breed.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Verified Breeding Cohort Catalog</h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Transparent cohort matrix filterable by active pedigree clusters</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-72">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input type="text" placeholder="Search lineage strains..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-slate-300 rounded-2xl bg-white text-neutral-900 placeholder:text-neutral-400 text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold" />
          </div>
          <button
            type="button"
            onClick={() => { setCurrentPage('profiling'); setProfilingSubTab('form'); }}
            className="shrink-0 bg-slate-900 hover:bg-emerald-700 active:scale-[0.98] text-white text-[11px] font-black px-4 py-3 rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span className="hidden sm:inline">Add Fowl</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredFowls.length === 0 ? (
          <div className="col-span-full bg-white p-14 text-center rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-3xl mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <h3 className="text-base font-extrabold text-slate-800">No Pedigree Cohorts Found</h3>
            <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">No active gamefowl strains match your search query.</p>
          </div>
        ) : (
          filteredFowls.map((item, index) => (
            <div key={item.id} className="antigravity-card bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-4 items-start" style={{ animationDelay: `${(index % 4) * 0.9}s` }}>
              <span className="antigravity-badge absolute top-0 right-0 bg-emerald-50 border-l border-b border-emerald-200 text-emerald-700 text-[8px] font-black px-3 py-1 rounded-bl-2xl uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                Verified Pedigree
              </span>
              <div className="antigravity-avatar w-20 h-20 bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center font-mono text-slate-300 text-[8px] relative shadow-inner">
                {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                )}
              </div>
              <div className="flex-1 w-full min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap pr-20">
                  <h4 className="font-black text-slate-900 text-base leading-none">{item.name}</h4>
                  <span className="text-[8px] font-mono font-black bg-slate-900 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">{item.growth_stage || 'Stag'}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-bold">Strain: <span className="text-slate-800 font-black">{item.breed}</span></p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: item.color?.toLowerCase() === 'bright red' ? '#dc2626' : item.color?.toLowerCase() === 'dark red' ? '#991b1b' : item.color?.toLowerCase() === 'grey' ? '#6b7280' : item.color?.toLowerCase() === 'black' ? '#1f2937' : item.color?.toLowerCase() === 'white' ? '#f9fafb' : '#e5e7eb' }}></span>
                    Tone: <strong className="text-slate-800 font-black">{item.color}</strong>
                  </div>
                  <div>Trait: <strong className="text-emerald-700 font-black">{item.behavior_trait}</strong></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
