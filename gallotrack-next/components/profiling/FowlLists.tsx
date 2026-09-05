'use client';
import React, { useState, useMemo } from 'react';
import type { FowlRecord, MatchRecord, SiblingRelation } from '@/lib/types';
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

type Props = {
  tab: 'males' | 'females' | 'archived' | 'deceased';
  fowls: FowlRecord[];
  maleActiveFowls: FowlRecord[];
  femaleActiveFowls: FowlRecord[];
  archivedFowls: FowlRecord[];
  deceasedFowls: FowlRecord[];
  matchHistory: MatchRecord[];
  loading: boolean;
  setProfilingSubTab: (tab: 'form' | 'males' | 'females' | 'archived' | 'deceased' | 'matchForm') => void;
  handleOpenEditModal: (fowl: FowlRecord) => void;
  handleRestoreFowlOnly: (id: number) => void;
  setSelectedFowlForDetails: (fowl: FowlRecord) => void;
  setSelectedFowlForArchive: (fowl: FowlRecord) => void;
  setSelectedFowlForDeceased: (fowl: FowlRecord) => void;
  setPendingPermanentDelete: (fowl: FowlRecord) => void;
};

function FowlCard({ fowl, index, gender, onDelete }: { fowl: FowlRecord; index: number; gender: 'Male' | 'Female'; onDelete: (f: FowlRecord) => void }) {
  const siblings = getSiblingRelations(fowl, []).map((s: SiblingRelation) => s.name);
  const cardGen = generationOf(fowl, []);
  const cardGenInfo = generationInfo(cardGen);
  return (
    <div className="antigravity-card bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center" style={{ animationDelay: `${(index % 5) * 0.8}s` }}>
      <button type="button" onClick={() => onDelete(fowl)} title="Delete this fowl" className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer shadow-sm">🗑️</button>
      <div className="antigravity-avatar w-24 h-24 bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 text-[9px] font-mono shadow-inner relative">
        {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : 'NO PHOTO'}
      </div>
      <div className="flex-1 w-full space-y-3">
        <span className="antigravity-badge absolute top-0 right-0 text-[8px] font-black uppercase px-3.5 py-1 bg-slate-900 text-white rounded-bl-xl tracking-widest shadow-2xs">{fowl.growth_stage || 'Stag'}</span>
        <div className="flex items-center space-x-2">
          <h4 className="text-base font-black text-slate-900">{fowl.name}</h4>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-emerald-700 bg-emerald-50 border-emerald-200">{fowl.breed}</span>
          <span className={`antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase ${gender === 'Male' ? 'text-sky-700 bg-sky-50 border-sky-200' : 'text-pink-700 bg-pink-50 border-pink-200'}`}>
            {gender === 'Male' ? '🐓 Male' : '🐔 Female'}
          </span>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-teal-700 bg-teal-50 border-teal-200">{cardGenInfo.short} · {generationPurity(cardGen)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
          <div>Sire: <strong className="text-slate-800">{fowl.sire || 'N/A'}</strong></div>
          <div>Dam: <strong className="text-slate-800">{fowl.dam || 'N/A'}</strong></div>
          <div>Color: <strong className="text-slate-800">{fowl.color_category} ({fowl.color})</strong></div>
          <div>Trait: <strong className="text-emerald-700">{fowl.behavior_trait}</strong></div>
          <div>Legs: <strong className="text-slate-800">{fowl.leg_color || 'N/A'}</strong></div>
          <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
            <span>📅 Age:</span>
            {(() => {
              const p = getAgeParts(fowl.birthdate);
              return p ? (
                <strong className="text-emerald-700 font-black">{getAgeLabel(p)} <span className="font-mono font-semibold text-slate-400">· born {fowl.birthdate}</span></strong>
              ) : (
                <strong className="text-amber-700 font-bold">{fowl.age || 'No birth date'}</strong>
              );
            })()}
          </div>
        </div>
        <div className="text-[10px] text-slate-500 flex justify-between items-center bg-slate-50 p-2.5 px-3.5 rounded-xl border border-slate-100">
          <div className="font-semibold">Siblings: <span className="text-emerald-700 font-extrabold">{siblings.length > 0 ? siblings.join(', ') : 'None'}</span></div>
        </div>
      </div>
    </div>
  );
}

function ArchivedCard({ fowl, index, onDelete }: { fowl: FowlRecord; index: number; onDelete: (f: FowlRecord) => void }) {
  const cardGen = generationOf(fowl, []);
  const cardGenInfo = generationInfo(cardGen);
  return (
    <div className="antigravity-card bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center bg-slate-50/50" style={{ animationDelay: `${(index % 5) * 0.8}s` }}>
      <button type="button" onClick={() => onDelete(fowl)} title="Delete this fowl" className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer shadow-sm">🗑️</button>
      <div className="antigravity-avatar w-24 h-24 bg-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 text-[9px] font-mono shadow-inner relative">
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
          <h4 className="text-base font-black text-slate-700">{fowl.name}</h4>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-800 bg-amber-50 border-amber-200">📦 Archived</span>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-700 bg-amber-50 border-amber-200">{fowl.breed}</span>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-teal-700 bg-teal-50 border-teal-200">{cardGenInfo.short} · {generationPurity(cardGen)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div>Sire: <strong className="text-slate-800">{fowl.sire || 'N/A'}</strong></div>
          <div>Dam: <strong className="text-slate-800">{fowl.dam || 'N/A'}</strong></div>
          <div>Color: <strong className="text-slate-800">{fowl.color_category} ({fowl.color})</strong></div>
          <div>Trait: <strong className="text-emerald-700">{fowl.behavior_trait}</strong></div>
          <div>Legs: <strong className="text-slate-800">{fowl.leg_color || 'N/A'}</strong></div>
          <div className="col-span-2">Archive Reason: <strong className="text-amber-800">{fowl.archive_reason || 'Unspecified'}</strong></div>
        </div>
      </div>
    </div>
  );
}

function DeceasedCard({ fowl, index, onDelete }: { fowl: FowlRecord; index: number; onDelete: (f: FowlRecord) => void }) {
  const cardGen = generationOf(fowl, []);
  const cardGenInfo = generationInfo(cardGen);
  return (
    <div className="antigravity-card bg-white p-5 rounded-3xl border border-rose-200/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center" style={{ animationDelay: `${(index % 5) * 0.8}s` }}>
      <button type="button" onClick={() => onDelete(fowl)} title="Delete this fowl" className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer shadow-sm">🗑️</button>
      <div className="antigravity-avatar w-24 h-24 bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 text-[9px] font-mono shadow-inner relative grayscale">
        {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : 'NO PHOTO'}
      </div>
      <div className="flex-1 w-full space-y-3">
        <span className="antigravity-badge absolute top-0 right-0 text-[8px] font-black uppercase px-3.5 py-1 bg-rose-900 text-white rounded-bl-xl tracking-widest shadow-2xs">● DECEASED</span>
        <div className="flex items-center space-x-2">
          <h4 className="text-base font-black text-slate-900 line-through opacity-75">{fowl.name}</h4>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-rose-700 bg-rose-50 border-rose-200">{fowl.breed}</span>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-teal-700 bg-teal-50 border-teal-200">{cardGenInfo.short} · {generationPurity(cardGen)}%</span>
          <span className="antigravity-badge text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase text-rose-700 bg-rose-50 border-rose-200">💀 Cause of Death: {fowl.death_reason || 'Unspecified'}{fowl.death_date ? ` · ${fowl.death_date}` : ''}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
          <div>Sire: <strong className="text-slate-800">{fowl.sire || 'N/A'}</strong></div>
          <div>Dam: <strong className="text-slate-800">{fowl.dam || 'N/A'}</strong></div>
          <div>Growth Stage: <strong className="text-slate-800">{fowl.growth_stage || 'Chick'}</strong></div>
          <div>Color: <strong className="text-slate-800">{fowl.color_category} ({fowl.color})</strong></div>
          <div>Legs: <strong className="text-slate-800">{fowl.leg_color || 'N/A'}</strong></div>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function FowlLists({
  tab,
  maleActiveFowls,
  femaleActiveFowls,
  archivedFowls,
  deceasedFowls,
  setProfilingSubTab,
  setPendingPermanentDelete,
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
    const list = tab === 'males' ? maleActiveFowls : tab === 'females' ? femaleActiveFowls : tab === 'archived' ? archivedFowls : deceasedFowls;
    const start = (page - 1) * PAGE_SIZE;
    return { list, pagedList: list.slice(start, start + PAGE_SIZE), totalPages: Math.ceil(list.length / PAGE_SIZE) };
  }, [tab, maleActiveFowls, femaleActiveFowls, archivedFowls, deceasedFowls, page]);

  if (tab === 'males' || tab === 'females') {
    const isMaleTab = tab === 'males';
    const birds = paginatedBirds.list;
    const pagedList = paginatedBirds.pagedList;
    const totalPages = paginatedBirds.totalPages;
    const tabIcon = isMaleTab ? '🐓' : '🐔';
    const tabLabel = isMaleTab ? 'Rooster / Male Housing' : 'Hen / Female Housing';
    const tabSub = isMaleTab ? 'Dedicated cock inventory space — stags, roosters, cocks' : 'Dedicated hen inventory space — pullets, hens';
    const accentBg = isMaleTab ? 'bg-sky-600' : 'bg-pink-600';
    const accentSoft = isMaleTab ? 'bg-sky-50 border-sky-200' : 'bg-pink-50 border-pink-200';
    const accentText = isMaleTab ? 'text-sky-400' : 'text-pink-400';
    const emptyTitle = isMaleTab ? 'No Roosters / Males Encoded' : 'No Hens / Females Encoded';
    const emptyHint = isMaleTab ? 'No male gamefowl are registered in the active farm inventory yet. Encode your first rooster / stag / cock to begin populating this housing space.' : 'No female gamefowl are registered in the active farm inventory yet. Encode your first hen / pullet to begin populating this housing space.';

    return (
      <div className="space-y-4 animate-fadeIn">
        <div className={`bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4 ${isMaleTab ? 'border-l-4 border-l-sky-500' : 'border-l-4 border-l-pink-500'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xl shrink-0 ${accentSoft}`}>{tabIcon}</div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">{tabLabel}</h2>
              <p className="text-[10px] text-slate-400 font-semibold">{tabSub}</p>
            </div>
          </div>
          <span className={`shrink-0 text-[10px] font-black text-white px-3 py-1.5 rounded-full ${accentBg}`}>{birds.length} Registered</span>
        </div>
        {birds.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto ${isMaleTab ? 'bg-sky-50' : 'bg-pink-50'} ${accentText}`}>{tabIcon}</div>
            <h3 className="text-base font-extrabold text-slate-800">{emptyTitle}</h3>
            <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">{emptyHint}</p>
            <button type="button" onClick={() => setProfilingSubTab('form')} className="mt-2 inline-block bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700 transition-all">
              ➕ Encode First {isMaleTab ? 'Rooster' : 'Hen'}
            </button>
          </div>
        ) : (
          <>
            {pagedList.map((fowl, index) => (
              <FowlCard key={fowl.id} fowl={fowl} index={index} gender={isMaleTab ? 'Male' : 'Female'} onDelete={setPendingPermanentDelete} />
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
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto">📦</div>
            <h3 className="text-base font-extrabold text-slate-800">Archived Registry Empty</h3>
            <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">No gamefowl records have been archived. Archived fowl are non-mortality removals (sold, transferred, retired, inactive); deaths belong under 💀 Deceased.</p>
          </div>
        ) : (
          <>
            {pagedList.map((fowl, index) => (
              <ArchivedCard key={fowl.id} fowl={fowl} index={index} onDelete={setPendingPermanentDelete} />
            ))}
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
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto">💀</div>
          <h3 className="text-base font-extrabold text-slate-800">No Mortality Records</h3>
          <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">No gamefowl nodes recorded under mortality logs.</p>
        </div>
      ) : (
        <>
          {deceasedPagedList.map((fowl, index) => (
            <DeceasedCard key={fowl.id} fowl={fowl} index={index} onDelete={setPendingPermanentDelete} />
          ))}
          <Pagination currentPage={page} totalPages={deceasedTotalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
