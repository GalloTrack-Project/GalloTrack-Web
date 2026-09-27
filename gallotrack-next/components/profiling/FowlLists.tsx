'use client';
import React, { useState, useMemo } from 'react';
import type { FowlRecord, MatchRecord, SiblingRelation, ProfilingSubTab } from '@/lib/types';
import {
  getAgeParts,
  getAgeLabel,
  generationOf,
  generationPurity,
  generationInfo,
  getSiblingRelations,
  getArchiveBadgeStyle,
} from '@/lib/helpers';
import Pagination from '@/components/Pagination';
import { birdCodeOf, formatBirdCodeForDisplay } from '@/lib/bird-code';

type Props = {
  tab: 'males' | 'females' | 'archived' | 'deceased' | 'sireMaterial' | 'offspring';
  offspringFowls?: FowlRecord[];
  fowls: FowlRecord[];
  maleActiveFowls: FowlRecord[];
  femaleActiveFowls: FowlRecord[];
  archivedFowls: FowlRecord[];
  deceasedFowls: FowlRecord[];
  sireMaterialFowls: FowlRecord[];
  matchHistory: MatchRecord[];
  loading: boolean;
  setProfilingSubTab: (tab: ProfilingSubTab) => void;
  handleOpenEditModal: (fowl: FowlRecord) => void;
  handleSetActiveStatus: (fowl: FowlRecord) => Promise<void>;
  handleRestoreFowlOnly: (id: number) => void;
  setSelectedFowlForDetails: (fowl: FowlRecord) => void;
  setSelectedFowlForArchive: (fowl: FowlRecord) => void;
  setSelectedFowlForDeceased: (fowl: FowlRecord) => void;
  setPendingPermanentDelete: (fowl: FowlRecord) => void;
};

function FowlCard({ fowl, index, gender, onEdit, onArchive, onDeceased, onSetActive, allFowls }: { fowl: FowlRecord; index: number; gender: 'Male' | 'Female'; onEdit: (f: FowlRecord) => void; onArchive: (f: FowlRecord) => void; onDeceased: (f: FowlRecord) => void; onSetActive?: (f: FowlRecord) => void; allFowls: FowlRecord[] }) {
  const siblings = getSiblingRelations(fowl, allFowls).map((s: SiblingRelation) => s.name);
  const cardGen = generationOf(fowl, allFowls);
  const cardGenInfo = generationInfo(cardGen);
  return (
    <div className="antigravity-card bg-white dark:bg-card p-5 rounded-3xl border border-slate-200/80 dark:border-border shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center" style={{ animationDelay: `${(index % 5) * 0.8}s` }}>
      <span className="antigravity-badge absolute top-0 right-0 text-[8px] font-black uppercase px-3.5 py-1 bg-slate-900 text-white rounded-bl-xl tracking-widest shadow-2xs">{fowl.growth_stage || 'Stag'}</span>
      <div className="antigravity-avatar w-24 h-24 bg-slate-50 dark:bg-muted/50 border border-slate-200/80 dark:border-border rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 dark:text-muted-foreground text-[9px] font-mono shadow-inner relative">
        {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : 'NO PHOTO'}
      </div>
      <div className="flex-1 w-full space-y-3">
        <div className="flex items-center space-x-2">
          <h4 className="text-base font-black text-slate-900 dark:text-card-foreground">{fowl.name}</h4>
          <span className="antigravity-badge text-[9px] font-mono font-black border px-2.5 py-0.5 rounded-full uppercase text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-800">{formatBirdCodeForDisplay(birdCodeOf(fowl, allFowls)) || '—'}</span>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800">{fowl.breed}</span>
          <span className={`antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase ${gender === 'Male' ? 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-800' : 'text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-800'}`}>
            {gender === 'Male' ? '🐓 Male' : '🐔 Female'}
          </span>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800">{cardGenInfo.short} · {generationPurity(cardGen)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 dark:text-muted-foreground bg-slate-50/80 dark:bg-muted/50 p-3 rounded-2xl border border-slate-100 dark:border-border">
          <div>Sire: <strong className="text-slate-800 dark:text-card-foreground">{fowl.sire || 'N/A'}</strong></div>
          <div>Dam: <strong className="text-slate-800 dark:text-card-foreground">{fowl.dam || 'N/A'}</strong></div>
          <div>Color: <strong className="text-slate-800 dark:text-card-foreground">{fowl.color_category} ({fowl.color})</strong></div>
          <div>Trait: <strong className="text-emerald-700 dark:text-emerald-300">{fowl.behavior_trait}</strong></div>
          <div>Legs: <strong className="text-slate-800 dark:text-card-foreground">{fowl.leg_color || 'N/A'}</strong></div>
          <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-border flex items-center justify-between text-[10px]">
            <span>📅 Age:</span>
            {(() => {
              const p = getAgeParts(fowl.birthdate);
              return p ? (
                <strong className="text-emerald-700 dark:text-emerald-300 font-black">{getAgeLabel(p)} <span className="font-mono font-semibold text-slate-400 dark:text-muted-foreground">· born {fowl.birthdate}</span></strong>
              ) : (
                <strong className="text-amber-700 dark:text-amber-300 font-bold">{fowl.age || 'No birth date'}</strong>
              );
            })()}
          </div>
        </div>
        <div className="text-[10px] text-slate-500 dark:text-muted-foreground flex justify-between items-center bg-slate-50 dark:bg-muted/50 p-2.5 px-3.5 rounded-xl border border-slate-100 dark:border-border">
          <div className="font-semibold">Siblings: <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">{siblings.length > 0 ? siblings.join(', ') : 'None'}</span></div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={() => onEdit(fowl)} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            Edit
          </button>
          <button type="button" onClick={() => onArchive(fowl)} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 8-2-2H5l-2 2"/><path d="M3 12v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"/><path d="M10 12h4"/></svg>
            Archive
          </button>
          <button type="button" onClick={() => onDeceased(fowl)} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            Deceased
          </button>
          {onSetActive && (
            <button type="button" onClick={() => onSetActive(fowl)} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="m9 16-4-4 4-4"/></svg>
              Set to Active
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ArchivedCard({ fowl, index, onRestore, allFowls }: { fowl: FowlRecord; index: number; onRestore: (id: number) => void; allFowls: FowlRecord[] }) {
  const cardGen = generationOf(fowl, allFowls);
  const cardGenInfo = generationInfo(cardGen);
  return (
    <div className="antigravity-card bg-white dark:bg-card p-5 rounded-3xl border border-slate-200/80 dark:border-border shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center bg-slate-50/50 dark:bg-muted/50" style={{ animationDelay: `${(index % 5) * 0.8}s` }}>
      <div className="antigravity-avatar w-24 h-24 bg-slate-100 dark:bg-muted border border-slate-200/80 dark:border-border rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 dark:text-muted-foreground text-[9px] font-mono shadow-inner relative">
        {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover grayscale opacity-80" /> : 'NO PHOTO'}
      </div>
      <div className="flex-1 w-full space-y-3">
        {(() => {
          const badge = getArchiveBadgeStyle(fowl.archive_reason);
          return (
            <span className={`antigravity-badge absolute top-0 right-0 text-[8px] font-black uppercase px-3.5 py-1 ${badge.bg} rounded-bl-xl tracking-widest shadow-2xs`}>
              {badge.label}
            </span>
          );
        })()}
        <div className="flex items-center space-x-2">
          <h4 className="text-base font-black text-slate-700 dark:text-card-foreground">{fowl.name}</h4>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800">📦 Archived</span>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800">{fowl.breed}</span>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800">{cardGenInfo.short} · {generationPurity(cardGen)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 dark:text-muted-foreground bg-slate-50 dark:bg-muted/50 p-3 rounded-2xl border border-slate-100 dark:border-border">
          <div>Sire: <strong className="text-slate-800 dark:text-card-foreground">{fowl.sire || 'N/A'}</strong></div>
          <div>Dam: <strong className="text-slate-800 dark:text-card-foreground">{fowl.dam || 'N/A'}</strong></div>
          <div>Color: <strong className="text-slate-800 dark:text-card-foreground">{fowl.color_category} ({fowl.color})</strong></div>
          <div>Trait: <strong className="text-emerald-700 dark:text-emerald-300">{fowl.behavior_trait}</strong></div>
          <div>Legs: <strong className="text-slate-800 dark:text-card-foreground">{fowl.leg_color || 'N/A'}</strong></div>
          <div className="col-span-2">Archive Reason: <strong className="text-amber-800 dark:text-amber-300">{fowl.archive_reason || 'Unspecified'}</strong></div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={() => onRestore(fowl.id)} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}

function DeceasedCard({ fowl, index, onDelete, allFowls }: { fowl: FowlRecord; index: number; onDelete: (f: FowlRecord) => void; allFowls: FowlRecord[] }) {
  const cardGen = generationOf(fowl, allFowls);
  const cardGenInfo = generationInfo(cardGen);
  return (
    <div className="antigravity-card bg-white dark:bg-card p-5 rounded-3xl border border-rose-200/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center" style={{ animationDelay: `${(index % 5) * 0.8}s` }}>
      <div className="antigravity-avatar w-24 h-24 bg-slate-50 dark:bg-muted/50 border border-slate-200/80 dark:border-border rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 dark:text-muted-foreground text-[9px] font-mono shadow-inner relative grayscale">
        {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : 'NO PHOTO'}
      </div>
      <div className="flex-1 w-full space-y-3">
        <span className="antigravity-badge absolute top-0 right-0 text-[8px] font-black uppercase px-3.5 py-1 bg-rose-900 text-white rounded-bl-xl tracking-widest shadow-2xs">● DECEASED</span>
        <div className="flex items-center space-x-2">
          <h4 className="text-base font-black text-slate-900 dark:text-card-foreground line-through opacity-75">{fowl.name}</h4>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800">{fowl.breed}</span>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800">{cardGenInfo.short} · {generationPurity(cardGen)}%</span>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800">💀 Cause of Death: {fowl.death_reason || 'Unspecified'}{fowl.death_date ? ` · ${fowl.death_date}` : ''}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 dark:text-muted-foreground bg-slate-50/80 dark:bg-muted/50 p-3 rounded-2xl border border-slate-100 dark:border-border">
          <div>Sire: <strong className="text-slate-800 dark:text-card-foreground">{fowl.sire || 'N/A'}</strong></div>
          <div>Dam: <strong className="text-slate-800 dark:text-card-foreground">{fowl.dam || 'N/A'}</strong></div>
          <div>Growth Stage: <strong className="text-slate-800 dark:text-card-foreground">{fowl.growth_stage || 'Chick'}</strong></div>
          <div>Color: <strong className="text-slate-800 dark:text-card-foreground">{fowl.color_category} ({fowl.color})</strong></div>
          <div>Legs: <strong className="text-slate-800 dark:text-card-foreground">{fowl.leg_color || 'N/A'}</strong></div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={() => onDelete(fowl)} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function FowlLists({
  tab,
  offspringFowls,
  fowls,
  maleActiveFowls,
  femaleActiveFowls,
  archivedFowls,
  deceasedFowls,
  sireMaterialFowls,
  setProfilingSubTab,
  setPendingPermanentDelete,
  handleRestoreFowlOnly,
  setSelectedFowlForArchive,
  setSelectedFowlForDeceased,
  handleOpenEditModal,
  handleSetActiveStatus,
}: Props) {
  const [page, setPage] = useState(1);
  const prevTabRef = React.useRef(tab);
  React.useEffect(() => {
    if (prevTabRef.current !== tab) {
      prevTabRef.current = tab;
      setPage(1);
    }
  }, [tab]);

  const paginatedBirds = useMemo(() => {
    const list = tab === 'males' ? maleActiveFowls : tab === 'females' ? femaleActiveFowls : tab === 'archived' ? archivedFowls : tab === 'sireMaterial' ? sireMaterialFowls : tab === 'offspring' ? offspringFowls ?? [] : deceasedFowls;
    const start = (page - 1) * PAGE_SIZE;
    return { list, pagedList: list.slice(start, start + PAGE_SIZE), totalPages: Math.ceil(list.length / PAGE_SIZE) };
  }, [tab, maleActiveFowls, femaleActiveFowls, archivedFowls, deceasedFowls, sireMaterialFowls, offspringFowls, page]);

  if (tab === 'males' || tab === 'females') {
    const isMaleTab = tab === 'males';
    const birds = paginatedBirds.list;
    const pagedList = paginatedBirds.pagedList;
    const totalPages = paginatedBirds.totalPages;
    const tabIcon = isMaleTab ? '🐓' : '🐔';
    const tabLabel = isMaleTab ? 'Sire Registry' : 'Dam Registry';
    const tabSub = isMaleTab ? 'Active breeding males — every sire in the program' : 'Active breeding females — every dam in the program';
    const accentBg = isMaleTab ? 'bg-sky-600' : 'bg-pink-600';
    const accentSoft = isMaleTab ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800' : 'bg-pink-50 dark:bg-pink-950/50 border-pink-200 dark:border-pink-800';
    const accentText = isMaleTab ? 'text-sky-400' : 'text-pink-400';
    const emptyTitle = isMaleTab ? 'No Sires Encoded' : 'No Dams Encoded';
    const emptyHint = isMaleTab ? 'No sires are registered in the active farm inventory yet. Encode your first sire to begin populating this registry and line up its offspring.' : 'No dams are registered in the active farm inventory yet. Encode your first dam to begin populating this registry and line up its offspring.';

    return (
      <div className="space-y-4 animate-fadeIn">
        <div className={`bg-white dark:bg-card p-5 rounded-3xl border border-slate-200/80 dark:border-border shadow-sm flex items-center justify-between gap-4 ${isMaleTab ? 'border-l-4 border-l-sky-500' : 'border-l-4 border-l-pink-500'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xl shrink-0 ${accentSoft}`}>{tabIcon}</div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-card-foreground tracking-tight">{tabLabel}</h2>
              <p className="text-[10px] text-slate-400 dark:text-muted-foreground font-semibold">{tabSub}</p>
            </div>
          </div>
          <span className={`shrink-0 text-[10px] font-black text-white px-3 py-1.5 rounded-full ${accentBg}`}>{birds.length} Registered</span>
        </div>
        {birds.length === 0 ? (
          <div className="bg-white dark:bg-card p-12 text-center rounded-3xl border border-slate-200/80 dark:border-border shadow-sm space-y-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto ${isMaleTab ? 'bg-sky-50 dark:bg-sky-500/10' : 'bg-pink-50 dark:bg-pink-500/10'} ${accentText}`}>{tabIcon}</div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">{emptyTitle}</h3>
            <p className="text-xs text-slate-400 dark:text-muted-foreground font-medium max-w-sm mx-auto">{emptyHint}</p>
            <button type="button" onClick={() => setProfilingSubTab('form')} className="mt-2 inline-block bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700 transition-all">
              ➕ Encode First {isMaleTab ? 'Sire' : 'Dam'}
            </button>
          </div>
        ) : (
          <>
            {pagedList.map((fowl, index) => (
              <FowlCard key={fowl.id} fowl={fowl} index={index} gender={isMaleTab ? 'Male' : 'Female'} onEdit={handleOpenEditModal} onArchive={setSelectedFowlForArchive} onDeceased={setSelectedFowlForDeceased} allFowls={fowls} />
            ))}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    );
  }

  if (tab === 'archived') {
    const { pagedList, totalPages } = paginatedBirds;
    return (
      <div className="space-y-4 animate-fadeIn">
        {paginatedBirds.list.length === 0 ? (
          <div className="bg-white dark:bg-card p-12 text-center rounded-3xl border border-slate-200/80 dark:border-border shadow-sm space-y-3">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto">📦</div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">Archived Registry Empty</h3>
            <p className="text-xs text-slate-400 dark:text-muted-foreground font-medium max-w-sm mx-auto">No chicken records have been archived. Archived chickens are non-mortality removals (sold, transferred, retired, inactive); deaths belong under 💀 Deceased.</p>
          </div>
        ) : (
          <>
            {pagedList.map((fowl, index) => (
              <ArchivedCard key={fowl.id} fowl={fowl} index={index} onRestore={handleRestoreFowlOnly} allFowls={fowls} />
            ))}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    );
  }

  if (tab === 'sireMaterial') {
    const { pagedList, totalPages } = paginatedBirds;
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="bg-white dark:bg-card p-5 rounded-3xl border border-slate-200/80 dark:border-border shadow-sm flex items-center justify-between gap-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center text-xl shrink-0 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800 text-amber-500">🛡️</div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-card-foreground tracking-tight">Sire Material Registry</h2>
              <p className="text-[10px] text-slate-400 dark:text-muted-foreground font-semibold">Retired fighters promoted to breeding stock after critical injuries</p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-black text-white px-3 py-1.5 rounded-full bg-amber-600">{paginatedBirds.list.length} Registered</span>
        </div>
        {paginatedBirds.list.length === 0 ? (
          <div className="bg-white dark:bg-card p-12 text-center rounded-3xl border border-slate-200/80 dark:border-border shadow-sm space-y-3">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto">🛡️</div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">No Sire Material Yet</h3>
            <p className="text-xs text-slate-400 dark:text-muted-foreground font-medium max-w-sm mx-auto">No chickens have been retired to breeding stock. Open a fighter&rsquo;s details and click <strong>Mark as Sire Material</strong> to move it here.</p>
          </div>
        ) : (
          <>
            {pagedList.map((fowl, index) => (
              <FowlCard key={fowl.id} fowl={fowl} index={index} gender="Male" onEdit={handleOpenEditModal} onArchive={setSelectedFowlForArchive} onDeceased={setSelectedFowlForDeceased} onSetActive={handleSetActiveStatus} allFowls={fowls} />
            ))}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    );
  }

  if (tab === 'offspring') {
    const { pagedList, totalPages } = paginatedBirds;
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="bg-white dark:bg-card p-5 rounded-3xl border border-slate-200/80 dark:border-border shadow-sm flex items-center justify-between gap-4 border-l-4 border-l-teal-500">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center text-xl shrink-0 bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-800 text-teal-500">🥚</div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-card-foreground tracking-tight">Offspring Registry</h2>
              <p className="text-[10px] text-slate-400 dark:text-muted-foreground font-semibold">Every child sired or dropped by a registered sire and dam — one entry per offspring</p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-black text-white px-3 py-1.5 rounded-full bg-teal-600">{paginatedBirds.list.length} Registered</span>
        </div>
        {paginatedBirds.list.length === 0 ? (
          <div className="bg-white dark:bg-card p-12 text-center rounded-3xl border border-slate-200/80 dark:border-border shadow-sm space-y-3">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-500/10 text-teal-500 rounded-full flex items-center justify-center text-3xl mx-auto">🥚</div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">No Offspring Yet</h3>
            <p className="text-xs text-slate-400 dark:text-muted-foreground font-medium max-w-sm mx-auto">No chicken in the registry is linked to a registered sire or dam yet. Encode a chick with its sire and dam to line it up here.</p>
            <button type="button" onClick={() => setProfilingSubTab('form')} className="mt-2 inline-block bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700 transition-all">
              ➕ Encode First Offspring
            </button>
          </div>
        ) : (
          <>
            {pagedList.map((child, index) => {
              const childGender: 'Male' | 'Female' = child.gender === 'Male' || child.gender === 'Rooster' ? 'Male' : 'Female';
              if (child.status === 'Deceased') return <DeceasedCard key={child.id} fowl={child} index={index} onDelete={setPendingPermanentDelete} allFowls={fowls} />;
              if (child.status === 'Archived') return <ArchivedCard key={child.id} fowl={child} index={index} onRestore={handleRestoreFowlOnly} allFowls={fowls} />;
              return <FowlCard key={child.id} fowl={child} index={index} gender={childGender} onEdit={handleOpenEditModal} onArchive={setSelectedFowlForArchive} onDeceased={setSelectedFowlForDeceased} allFowls={fowls} />;
            })}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    );
  }

  // deceased
  const { pagedList: deceasedPagedList, totalPages: deceasedTotalPages } = paginatedBirds;
  return (
    <div className="space-y-4 animate-fadeIn">
      {paginatedBirds.list.length === 0 ? (
        <div className="bg-white dark:bg-card p-12 text-center rounded-3xl border border-slate-200/80 dark:border-border shadow-sm space-y-3">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto">💀</div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">No Mortality Records</h3>
          <p className="text-xs text-slate-400 dark:text-muted-foreground font-medium max-w-sm mx-auto">No chicken nodes recorded under mortality logs.</p>
        </div>
      ) : (
        <>
          {deceasedPagedList.map((fowl, index) => (
            <DeceasedCard key={fowl.id} fowl={fowl} index={index} onDelete={setPendingPermanentDelete} allFowls={fowls} />
          ))}
          <Pagination currentPage={page} totalPages={deceasedTotalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
