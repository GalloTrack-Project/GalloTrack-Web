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
  parentBreedOf,
} from '@/lib/helpers';
import Pagination from '@/components/Pagination';
import { birdCodeOf, formatBirdCodeForDisplay } from '@/lib/bird-code';
import { fowlMatchesQuery } from '@/lib/lineage';
import { archiveDisplay, retiredScopeLabel } from '@/lib/lifecycle';

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

export type RoleStatusFilter = 'Active' | 'Archived' | 'Deceased';

function FowlCard({ fowl, index, gender, onEdit, onArchive, onDeceased, onSetActive, onOpenDetails, allFowls }: { fowl: FowlRecord; index: number; gender: 'Male' | 'Female'; onEdit: (f: FowlRecord) => void; onArchive: (f: FowlRecord) => void; onDeceased: (f: FowlRecord) => void; onSetActive?: (f: FowlRecord) => void; onOpenDetails?: (f: FowlRecord) => void; allFowls: FowlRecord[] }) {
  const siblings = getSiblingRelations(fowl, allFowls).map((s: SiblingRelation) => s.name);
  const cardGen = generationOf(fowl, allFowls);
  const cardGenInfo = generationInfo(cardGen);
  const cardNameKey = fowl.name.trim().toLowerCase();
  const isRegisteredParent = allFowls.some(
    (o) => (o.sire || '').trim().toLowerCase() === cardNameKey || (o.dam || '').trim().toLowerCase() === cardNameKey,
  );
  const sireName = (fowl.sire || '').trim();
  const damName = (fowl.dam || '').trim();
  const isRegisteredOffspring =
    (!!sireName && sireName.toLowerCase() !== 'foundation stock') ||
    (!!damName && damName.toLowerCase() !== 'foundation stock');
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; onOpenDetails?.(fowl); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails?.(fowl); } }}
      className="antigravity-card bg-white dark:bg-card p-5 rounded-lg border border-slate-200/80 dark:border-border shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all focus:ring-2 focus:ring-emerald-400/60"
      style={{ animationDelay: `${(index % 5) * 0.8}s` }}
    >
      <span className="antigravity-badge absolute top-0 right-0 text-xs font-black uppercase px-3.5 py-1 bg-slate-900 text-white rounded-bl-md tracking-widest shadow-2xs">{fowl.growth_stage || 'Stag'}</span>
      <div className="antigravity-avatar w-24 h-24 bg-slate-50 dark:bg-muted/50 border border-slate-200/80 dark:border-border rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs font-mono shadow-inner relative">
        {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : 'NO PHOTO'}
      </div>
      <div className="flex-1 w-full space-y-3">
        <div className="flex items-center space-x-2">
          <h4 className="text-base font-black text-slate-900 dark:text-card-foreground">{fowl.name}</h4>
          <span className="antigravity-badge text-xs font-mono font-black border px-2.5 py-0.5 rounded-full uppercase text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-800">{formatBirdCodeForDisplay(birdCodeOf(fowl, allFowls)) || '—'}</span>
          {fowl.wing_band ? (
            <span className="antigravity-badge text-xs font-mono font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800" title="Wing Band ID (physical band on the chicken)">🏷 {fowl.wing_band}</span>
          ) : null}
          <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800">{fowl.breed}</span>
          <span className={`antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase ${gender === 'Male' ? 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-800' : 'text-pink bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-800'}`}>
            {gender === 'Male' ? '🐓 Male' : '🐔 Female'}
          </span>
          {isRegisteredParent && (
            <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-800" title="Has registered children in this farm">
              {gender === 'Male' ? 'Breeding Male' : 'Breeding Female'}
            </span>
          )}
          {isRegisteredOffspring && (
            <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-800" title="Registered child of a breeding pair in this farm">
              Non-Breeding
            </span>
          )}
          <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-teal bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800">{cardGenInfo.short} · {generationPurity(cardGen)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground bg-slate-50/80 dark:bg-muted/50 p-3 rounded-lg border border-slate-100 dark:border-border">
          <div>Sire: {(() => {
            const name = (fowl.sire || '').trim();
            const target = name && name.toLowerCase() !== 'foundation stock' ? allFowls.find((f) => f.name.trim().toLowerCase() === name.toLowerCase()) : undefined;
            return (
              <>
                {target ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onOpenDetails?.(target); }} className="font-bold text-sky-700 dark:text-sky-300 hover:underline underline-offset-2 cursor-pointer" title="Open the Sire's profile">{name}</button>
                ) : <strong className="text-slate-800 dark:text-card-foreground">{fowl.sire || 'N/A'}</strong>}
                {target?.breed && <span className="font-semibold"> · {target.breed}</span>}
              </>
            );
          })()}</div>
          <div>Dam: {(() => {
            const name = (fowl.dam || '').trim();
            const target = name && name.toLowerCase() !== 'foundation stock' ? allFowls.find((f) => f.name.trim().toLowerCase() === name.toLowerCase()) : undefined;
            return (
              <>
                {target ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onOpenDetails?.(target); }} className="font-bold text-pink hover:underline underline-offset-2 cursor-pointer" title="Open the Dam's profile">{name}</button>
                ) : <strong className="text-slate-800 dark:text-card-foreground">{fowl.dam || 'N/A'}</strong>}
                {target?.breed && <span className="font-semibold"> · {target.breed}</span>}
              </>
            );
          })()}</div>
          <div>Color: <strong className="text-slate-800 dark:text-card-foreground">{fowl.color_category} ({fowl.color})</strong></div>
          <div>Trait: <strong className="text-emerald-700 dark:text-emerald-300">{fowl.behavior_trait}</strong></div>
          <div>Legs: <strong className="text-slate-800 dark:text-card-foreground">{fowl.leg_color || 'N/A'}</strong></div>
          <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-border flex items-center justify-between text-xs">
            <span>📅 Age:</span>
            {(() => {
              const p = getAgeParts(fowl.birthdate);
              return p ? (
                <strong className="text-emerald-700 dark:text-emerald-300 font-black">{getAgeLabel(p)} <span className="font-mono font-semibold text-muted-foreground">· born {fowl.birthdate}</span></strong>
              ) : (
                <strong className="text-amber-700 dark:text-amber-300 font-bold">{fowl.age || 'No birth date'}</strong>
              );
            })()}
          </div>
        </div>
        <div className="text-xs text-muted-foreground flex justify-between items-center bg-slate-50 dark:bg-muted/50 p-2.5 px-3.5 rounded-md border border-slate-100 dark:border-border">
          <div className="font-semibold">Siblings: <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">{siblings.length > 0 ? siblings.join(', ') : 'None'}</span></div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={() => onEdit(fowl)} className="inline-flex items-center gap-1.5 text-xs font-bold text-success dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            Edit
          </button>
          <button type="button" onClick={() => onArchive(fowl)} className="inline-flex items-center gap-1.5 text-xs font-bold text-warning dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 8-2-2H5l-2 2"/><path d="M3 12v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"/><path d="M10 12h4"/></svg>
            Archive
          </button>
          <button type="button" onClick={() => onDeceased(fowl)} className="inline-flex items-center gap-1.5 text-xs font-bold text-danger dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            Deceased
          </button>
          {onSetActive && (
            <button type="button" onClick={() => onSetActive(fowl)} className="inline-flex items-center gap-1.5 text-xs font-bold text-success dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
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
  const sireBreed = parentBreedOf(fowl.sire, allFowls);
  const damBreed = parentBreedOf(fowl.dam, allFowls);
  return (
    <div className="antigravity-card bg-white dark:bg-card p-5 rounded-lg border border-slate-200/80 dark:border-border shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center bg-slate-50/50 dark:bg-muted/50" style={{ animationDelay: `${(index % 5) * 0.8}s` }}>
      <div className="antigravity-avatar w-24 h-24 bg-slate-100 dark:bg-muted border border-slate-200/80 dark:border-border rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs font-mono shadow-inner relative">
        {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover grayscale opacity-80" /> : 'NO PHOTO'}
      </div>
      <div className="flex-1 w-full space-y-3">
        {(() => {
          const kind = fowl.archive_kind;
          const badge = getArchiveBadgeStyle(
            kind
              ? kind === 'transfer'
                ? 'TRANSFERRED'
                : kind.toUpperCase()
              : fowl.archive_reason,
          );
          return (
            <span className={`antigravity-badge absolute top-0 right-0 text-xs font-black uppercase px-3.5 py-1 ${badge.bg} rounded-bl-md tracking-widest shadow-2xs`}>
              {badge.label}
            </span>
          );
        })()}
        <div className="flex items-center space-x-2">
          <h4 className="text-base font-black text-slate-700 dark:text-card-foreground">{fowl.name}</h4>
          <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800">📦 Archived</span>
          <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800">{fowl.breed}</span>
          <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-teal bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800">{cardGenInfo.short} · {generationPurity(cardGen)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground bg-slate-50 dark:bg-muted/50 p-3 rounded-lg border border-slate-100 dark:border-border">
          <div>Sire: <strong className="text-slate-800 dark:text-card-foreground">{fowl.sire || 'N/A'}</strong>{sireBreed && <span className="font-semibold"> · {sireBreed}</span>}</div>
          <div>Dam: <strong className="text-slate-800 dark:text-card-foreground">{fowl.dam || 'N/A'}</strong>{damBreed && <span className="font-semibold"> · {damBreed}</span>}</div>
          <div>Color: <strong className="text-slate-800 dark:text-card-foreground">{fowl.color_category} ({fowl.color})</strong></div>
          <div>Trait: <strong className="text-emerald-700 dark:text-emerald-300">{fowl.behavior_trait}</strong></div>
          <div>Legs: <strong className="text-slate-800 dark:text-card-foreground">{fowl.leg_color || 'N/A'}</strong></div>
          <div className="col-span-2">Archive Reason: <strong className="text-amber-800 dark:text-amber-300">{archiveDisplay(fowl)}</strong>{fowl.retired_scope ? <> · {retiredScopeLabel(fowl.retired_scope)}</> : null}{fowl.return_date ? <> · Return expected {fowl.return_date}</> : null}</div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={() => onRestore(fowl.id)} className="inline-flex items-center gap-1.5 text-xs font-bold text-success dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
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
  const sireBreed = parentBreedOf(fowl.sire, allFowls);
  const damBreed = parentBreedOf(fowl.dam, allFowls);
  return (
    <div className="antigravity-card bg-white dark:bg-card p-5 rounded-lg border border-rose-200/80 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center" style={{ animationDelay: `${(index % 5) * 0.8}s` }}>
      <div className="antigravity-avatar w-24 h-24 bg-slate-50 dark:bg-muted/50 border border-slate-200/80 dark:border-border rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs font-mono shadow-inner relative grayscale">
        {fowl.image_url ? <img src={fowl.image_url} alt={fowl.name} className="w-full h-full object-cover" /> : 'NO PHOTO'}
      </div>
      <div className="flex-1 w-full space-y-3">
        <span className="antigravity-badge absolute top-0 right-0 text-xs font-black uppercase px-3.5 py-1 bg-rose-900 text-white rounded-bl-md tracking-widest shadow-2xs">● DECEASED</span>
        <div className="flex items-center space-x-2">
          <h4 className="text-base font-black text-slate-900 dark:text-card-foreground line-through opacity-75">{fowl.name}</h4>
          <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800">{fowl.breed}</span>
          <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-teal bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800">{cardGenInfo.short} · {generationPurity(cardGen)}%</span>
          <span className="antigravity-badge text-xs font-black border px-2.5 py-0.5 rounded-full uppercase text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800">💀 Cause of Death: {fowl.death_reason || 'Unspecified'}{fowl.death_date ? ` · ${fowl.death_date}` : ''}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground bg-slate-50/80 dark:bg-muted/50 p-3 rounded-lg border border-slate-100 dark:border-border">
          <div>Sire: <strong className="text-slate-800 dark:text-card-foreground">{fowl.sire || 'N/A'}</strong>{sireBreed && <span className="font-semibold"> · {sireBreed}</span>}</div>
          <div>Dam: <strong className="text-slate-800 dark:text-card-foreground">{fowl.dam || 'N/A'}</strong>{damBreed && <span className="font-semibold"> · {damBreed}</span>}</div>
          <div>Growth Stage: <strong className="text-slate-800 dark:text-card-foreground">{fowl.growth_stage || 'Chick'}</strong></div>
          <div>Color: <strong className="text-slate-800 dark:text-card-foreground">{fowl.color_category} ({fowl.color})</strong></div>
          <div>Legs: <strong className="text-slate-800 dark:text-card-foreground">{fowl.leg_color || 'N/A'}</strong></div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={() => onDelete(fowl)} className="inline-flex items-center gap-1.5 text-xs font-bold text-danger dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

const isMaleHelper = (gender?: string) => {
  const g = (gender || '').toLowerCase();
  return g === 'male' || g === 'rooster' || g === 'cock' || g === 'stag';
};

const isFemaleHelper = (gender?: string) => {
  const g = (gender || '').toLowerCase();
  return g === 'female' || g === 'hen' || g === 'pullet';
};

export default function FowlLists({
  tab,
  offspringFowls,
  fowls,
  maleActiveFowls,
  femaleActiveFowls,
  archivedFowls,
  deceasedFowls,
  sireMaterialFowls,
  matchHistory,
  setProfilingSubTab,
  setPendingPermanentDelete,
  handleRestoreFowlOnly,
  setSelectedFowlForArchive,
  setSelectedFowlForDeceased,
  handleOpenEditModal,
  handleSetActiveStatus,
  setSelectedFowlForDetails,
}: Props) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [filterSire, setFilterSire] = useState('all');
  const [filterDam, setFilterDam] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [filterBreed, setFilterBreed] = useState('all');
  const [filterFights, setFilterFights] = useState<'all' | 'with' | 'without'>('all');

  // Internal status segmented filter for roles: 'Active' | 'Archived' | 'Deceased'
  const isRoleTab = tab === 'males' || tab === 'females' || tab === 'offspring';
  const initialStatus: RoleStatusFilter = tab === 'archived' ? 'Archived' : tab === 'deceased' ? 'Deceased' : 'Active';
  const [roleStatus, setRoleStatus] = useState<RoleStatusFilter>(initialStatus);

  const prevTabRef = React.useRef(tab);
  React.useEffect(() => {
    if (prevTabRef.current !== tab) {
      prevTabRef.current = tab;
      setPage(1);
      setFilterReason('all');
      if (tab === 'archived') setRoleStatus('Archived');
      else if (tab === 'deceased') setRoleStatus('Deceased');
      else if (tab === 'males' || tab === 'females' || tab === 'offspring') setRoleStatus('Active');
    }
  }, [tab]);

  // Pool of birds for current role tab across all statuses
  const rolePool = useMemo(() => {
    if (tab === 'males') {
      return {
        active: maleActiveFowls,
        archived: archivedFowls.filter((f) => isMaleHelper(f.gender)),
        deceased: deceasedFowls.filter((f) => isMaleHelper(f.gender)),
      };
    }
    if (tab === 'females') {
      return {
        active: femaleActiveFowls,
        archived: archivedFowls.filter((f) => isFemaleHelper(f.gender)),
        deceased: deceasedFowls.filter((f) => isFemaleHelper(f.gender)),
      };
    }
    if (tab === 'offspring') {
      const parentNames = new Set([...maleActiveFowls, ...femaleActiveFowls, ...sireMaterialFowls].map((p) => p.name));
      const isChild = (f: FowlRecord) => (f.sire && parentNames.has(f.sire)) || (f.dam && parentNames.has(f.dam));
      const offActive = offspringFowls ?? fowls.filter((f) => (f.status === 'Active' || !f.status || f.status === 'active') && isChild(f));
      return {
        active: offActive,
        archived: archivedFowls.filter(isChild),
        deceased: deceasedFowls.filter(isChild),
      };
    }
    return null;
  }, [tab, maleActiveFowls, femaleActiveFowls, sireMaterialFowls, offspringFowls, fowls, archivedFowls, deceasedFowls]);

  const baseList = useMemo(() => {
    if (rolePool) {
      if (roleStatus === 'Archived') return rolePool.archived;
      if (roleStatus === 'Deceased') return rolePool.deceased;
      return rolePool.active;
    }
    if (tab === 'archived') return archivedFowls;
    if (tab === 'deceased') return deceasedFowls;
    if (tab === 'sireMaterial') return sireMaterialFowls;
    return maleActiveFowls;
  }, [rolePool, roleStatus, tab, archivedFowls, deceasedFowls, sireMaterialFowls, maleActiveFowls]);

  const effectiveStatus = rolePool ? roleStatus : tab === 'archived' ? 'Archived' : tab === 'deceased' ? 'Deceased' : 'Active';

  const reasonValue = React.useCallback(
    (f: FowlRecord) =>
      effectiveStatus === 'Deceased' ? (f.death_reason || 'Unspecified') : archiveDisplay(f),
    [effectiveStatus],
  );

  const filterOptions = useMemo(() => {
    const sires = new Set<string>();
    const dams = new Set<string>();
    const stages = new Set<string>();
    const reasons = new Set<string>();
    const breeds = new Set<string>();
    for (const f of baseList) {
      const s = (f.sire || '').trim();
      const d = (f.dam || '').trim();
      if (s) sires.add(s);
      if (d) dams.add(d);
      stages.add((f.growth_stage || 'Stag').trim() || 'Stag');
      if ((f.breed || '').trim()) breeds.add(f.breed.trim());
      if (effectiveStatus === 'Archived' || effectiveStatus === 'Deceased') reasons.add(reasonValue(f));
    }
    return {
      sires: Array.from(sires).sort((a, b) => a.localeCompare(b)),
      dams: Array.from(dams).sort((a, b) => a.localeCompare(b)),
      stages: Array.from(stages).sort((a, b) => a.localeCompare(b)),
      reasons: Array.from(reasons).sort((a, b) => a.localeCompare(b)),
      breeds: Array.from(breeds).sort((a, b) => a.localeCompare(b)),
    };
  }, [baseList, effectiveStatus, reasonValue]);

  const filtersActive =
    filterSire !== 'all' ||
    filterDam !== 'all' ||
    filterStage !== 'all' ||
    filterReason !== 'all' ||
    filterBreed !== 'all' ||
    filterFights !== 'all' ||
    query.trim() !== '';
  const clearFilters = () => { setFilterSire('all'); setFilterDam('all'); setFilterStage('all'); setFilterReason('all'); setFilterBreed('all'); setFilterFights('all'); setQuery(''); setPage(1); };
  const applyFilter = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => { setter(e.target.value); setPage(1); };

  const paginatedBirds = useMemo(() => {
    const foughtNames = new Set(matchHistory.map((m) => m.entry_name.trim().toLowerCase()));
    const list = baseList.filter((f) => {
      const searchOk = fowlMatchesQuery(f, query);
      const sireOk = filterSire === 'all' || (f.sire || '').trim().toLowerCase() === filterSire.toLowerCase();
      const damOk = filterDam === 'all' || (f.dam || '').trim().toLowerCase() === filterDam.toLowerCase();
      const stageOk = filterStage === 'all' || ((f.growth_stage || 'Stag').trim() || 'Stag').toLowerCase() === filterStage.toLowerCase();
      const reasonOk = filterReason === 'all' || reasonValue(f) === filterReason;
      const breedOk = filterBreed === 'all' || (f.breed || '').trim().toLowerCase() === filterBreed.toLowerCase();
      const hasFights = foughtNames.has(f.name.trim().toLowerCase());
      const fightsOk = filterFights === 'all' || (filterFights === 'with' ? hasFights : !hasFights);
      return searchOk && sireOk && damOk && stageOk && reasonOk && breedOk && fightsOk;
    });
    const start = (page - 1) * PAGE_SIZE;
    return { list, pagedList: list.slice(start, start + PAGE_SIZE), totalPages: Math.ceil(list.length / PAGE_SIZE) };
  }, [baseList, page, query, filterSire, filterDam, filterStage, filterReason, filterBreed, filterFights, reasonValue, matchHistory]);

  const filterBar = (
    <div className="bg-white dark:bg-card p-3.5 rounded-lg border border-slate-200/80 dark:border-border shadow-sm flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1" htmlFor="registry-search">Search Registry</label>
        <input
          id="registry-search"
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Name, wing band, chicken code, sire, dam…"
          className="w-full p-2.5 border border-input-border rounded-md text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground font-bold focus:border-emerald-500"
        />
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1" htmlFor="filter-by-sire">Filter by Sire</label>
        <select
          value={filterSire}
          onChange={applyFilter(setFilterSire)}
          className="w-full p-2.5 border border-input-border rounded-md text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground font-bold focus:border-emerald-500 cursor-pointer"
          id="filter-by-sire">
          <option value="all">All Sires</option>
          {filterOptions.sires.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1" htmlFor="filter-by-dam">Filter by Dam</label>
        <select
          value={filterDam}
          onChange={applyFilter(setFilterDam)}
          className="w-full p-2.5 border border-input-border rounded-md text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground font-bold focus:border-emerald-500 cursor-pointer"
          id="filter-by-dam">
          <option value="all">All Dams</option>
          {filterOptions.dams.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1" htmlFor="filter-by-growth-stage">Filter by Growth Stage</label>
        <select
          value={filterStage}
          onChange={applyFilter(setFilterStage)}
          className="w-full p-2.5 border border-input-border rounded-md text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground font-bold focus:border-emerald-500 cursor-pointer"
          id="filter-by-growth-stage">
          <option value="all">All Stages</option>
          {filterOptions.stages.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1" htmlFor="filter-by-breed">Filter by Breed</label>
        <select
          value={filterBreed}
          onChange={applyFilter(setFilterBreed)}
          className="w-full p-2.5 border border-input-border rounded-md text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground font-bold focus:border-emerald-500 cursor-pointer"
          id="filter-by-breed">
          <option value="all">All Breeds</option>
          {filterOptions.breeds.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1" htmlFor="filter-by-fights">Fight Record</label>
        <select
          value={filterFights}
          onChange={(e) => { setFilterFights(e.target.value as 'all' | 'with' | 'without'); setPage(1); }}
          className="w-full p-2.5 border border-input-border rounded-md text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground font-bold focus:border-emerald-500 cursor-pointer"
          id="filter-by-fights">
          <option value="all">All Chickens</option>
          <option value="with">With Fight Records</option>
          <option value="without">Without Fight Records</option>
        </select>
      </div>
      {(effectiveStatus === 'Archived' || effectiveStatus === 'Deceased') && (
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1" htmlFor="filter-by-reason">
            {effectiveStatus === 'Archived' ? 'Filter by Archive Reason' : 'Filter by Cause of Death'}
          </label>
          <select
            value={filterReason}
            onChange={applyFilter(setFilterReason)}
            className="w-full p-2.5 border border-input-border rounded-md text-xs bg-white dark:bg-input text-neutral-900 dark:text-foreground font-bold focus:border-emerald-500 cursor-pointer"
            id="filter-by-reason">
            <option value="all">{effectiveStatus === 'Archived' ? 'All Reasons' : 'All Causes'}</option>
            {filterOptions.reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}
      <div className="flex items-center gap-2 pb-0.5">
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="text-xs font-black text-danger dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 px-3 py-2 rounded-sm transition-all cursor-pointer">
            ✕ Reset
          </button>
        )}
        <span className="text-xs font-bold text-muted-foreground">
          {paginatedBirds.list.length} of {baseList.length}
        </span>
      </div>
    </div>
  );

  const filteredEmpty = (
    <div className="bg-white dark:bg-card p-12 text-center rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-3">
      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-success flex items-center justify-center text-3xl mx-auto">🔍</div>
      <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">No Matching Chickens</h3>
      <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">No registry entries match the selected filters.</p>
      <button type="button" onClick={clearFilters} className="mt-2 inline-block bg-slate-900 text-white font-bold px-5 py-2.5 rounded-md text-sm cursor-pointer hover:bg-emerald-700 transition-all">✕ Reset Filters</button>
    </div>
  );

  // Status segmented control for Breeding Male, Breeding Female, and Non-Breeding
  const statusSegmentedControl = rolePool ? (
    <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border w-fit max-w-full">
      <button
        type="button"
        role="button"
        aria-pressed={roleStatus === 'Active'}
        onClick={() => { setRoleStatus('Active'); setPage(1); setFilterReason('all'); }}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all cursor-pointer ${
          roleStatus === 'Active'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
        }`}
      >
        <span>Active</span>
        <span className={`text-xs px-1.5 py-0.2 rounded-full font-black ${roleStatus === 'Active' ? 'bg-white/20 text-white' : 'bg-border text-muted-foreground'}`}>
          {rolePool.active.length}
        </span>
      </button>
      <button
        type="button"
        role="button"
        aria-pressed={roleStatus === 'Archived'}
        onClick={() => { setRoleStatus('Archived'); setPage(1); setFilterReason('all'); }}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all cursor-pointer ${
          roleStatus === 'Archived'
            ? 'bg-amber-600 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
        }`}
      >
        <span>Archived</span>
        <span className={`text-xs px-1.5 py-0.2 rounded-full font-black ${roleStatus === 'Archived' ? 'bg-white/20 text-white' : 'bg-border text-muted-foreground'}`}>
          {rolePool.archived.length}
        </span>
      </button>
      <button
        type="button"
        role="button"
        aria-pressed={roleStatus === 'Deceased'}
        onClick={() => { setRoleStatus('Deceased'); setPage(1); setFilterReason('all'); }}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all cursor-pointer ${
          roleStatus === 'Deceased'
            ? 'bg-rose-600 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
        }`}
      >
        <span>Deceased</span>
        <span className={`text-xs px-1.5 py-0.2 rounded-full font-black ${roleStatus === 'Deceased' ? 'bg-white/20 text-white' : 'bg-border text-muted-foreground'}`}>
          {rolePool.deceased.length}
        </span>
      </button>
    </div>
  ) : null;

  const renderCard = (fowl: FowlRecord, index: number, defaultGender: 'Male' | 'Female') => {
    if (effectiveStatus === 'Deceased') {
      return (
        <DeceasedCard
          key={fowl.id}
          fowl={fowl}
          index={index}
          onDelete={setPendingPermanentDelete}
          allFowls={fowls}
        />
      );
    }
    if (effectiveStatus === 'Archived') {
      return (
        <ArchivedCard
          key={fowl.id}
          fowl={fowl}
          index={index}
          onRestore={handleRestoreFowlOnly}
          allFowls={fowls}
        />
      );
    }
    return (
      <FowlCard
        key={fowl.id}
        fowl={fowl}
        index={index}
        gender={defaultGender}
        onEdit={handleOpenEditModal}
        onArchive={setSelectedFowlForArchive}
        onDeceased={setSelectedFowlForDeceased}
        onOpenDetails={setSelectedFowlForDetails}
        onSetActive={tab === 'sireMaterial' ? handleSetActiveStatus : undefined}
        allFowls={fowls}
      />
    );
  };

  // BREEDING MALE OR BREEDING FEMALE
  if (tab === 'males' || tab === 'females') {
    const isMaleTab = tab === 'males';
    const birds = paginatedBirds.list;
    const pagedList = paginatedBirds.pagedList;
    const totalPages = paginatedBirds.totalPages;
    const tabIcon = isMaleTab ? '🐓' : '🐔';
    const tabLabel = isMaleTab ? 'Breeding Male Registry' : 'Breeding Female Registry';
    const tabSub = isMaleTab ? 'Active breeding males (sires) — every registered male in the program' : 'Active breeding females (dams) — every registered female in the program';
    const accentBg = isMaleTab ? 'bg-sky-600' : 'bg-pink-600';
    const accentSoft = isMaleTab ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800' : 'bg-pink-50 dark:bg-pink-950/50 border-pink-200 dark:border-pink-800';
    const accentText = isMaleTab ? 'text-info' : 'text-pink';
    const emptyTitle = isMaleTab ? 'No Breeding Males' : 'No Breeding Females';
    const emptyHint = isMaleTab ? 'No breeding males found under this status.' : 'No breeding females found under this status.';

    return (
      <div className="space-y-4 animate-fadeIn">
        <div className={`bg-white dark:bg-card p-5 rounded-lg border border-slate-200/80 dark:border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isMaleTab ? 'border-l-4 border-l-sky-500' : 'border-l-4 border-l-pink-500'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-md border flex items-center justify-center text-xl shrink-0 ${accentSoft}`}>{tabIcon}</div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-card-foreground tracking-tight">{tabLabel}</h2>
              <p className="text-xs text-muted-foreground font-semibold">{tabSub}</p>
            </div>
          </div>
          <span className={`shrink-0 self-start sm:self-center text-xs font-black text-white px-3 py-1.5 rounded-full ${accentBg}`}>{baseList.length} Total</span>
        </div>

        {statusSegmentedControl}

        {filterBar}

        {filtersActive && birds.length === 0 ? (
          filteredEmpty
        ) : birds.length === 0 ? (
          <div className="bg-white dark:bg-card p-12 text-center rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto ${isMaleTab ? 'bg-sky-50 dark:bg-sky-500/10' : 'bg-pink-50 dark:bg-pink-500/10'} ${accentText}`}>{tabIcon}</div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">{emptyTitle}</h3>
            <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">{emptyHint}</p>
            {effectiveStatus === 'Active' && (
              <button type="button" onClick={() => setProfilingSubTab('form')} className="mt-2 inline-block bg-slate-900 text-white font-bold px-5 py-2.5 rounded-md text-sm cursor-pointer hover:bg-emerald-700 transition-all">
                ➕ Encode First {isMaleTab ? 'Breeding Male' : 'Breeding Female'}
              </button>
            )}
          </div>
        ) : (
          <>
            {pagedList.map((fowl, index) => renderCard(fowl, index, isMaleTab ? 'Male' : 'Female'))}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    );
  }

  // NON-BREEDING (OFFSPRING)
  if (tab === 'offspring') {
    const { pagedList, totalPages } = paginatedBirds;
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="bg-white dark:bg-card p-5 rounded-lg border border-slate-200/80 dark:border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-teal-500">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md border flex items-center justify-center text-xl shrink-0 bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-800 text-teal">🥚</div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-card-foreground tracking-tight">Non-Breeding Registry</h2>
              <p className="text-xs text-muted-foreground font-semibold">Every child of a registered breeding pair — one entry per non-breeding chicken</p>
            </div>
          </div>
          <span className="shrink-0 self-start sm:self-center text-xs font-black text-white px-3 py-1.5 rounded-full bg-teal-600">{baseList.length} Total</span>
        </div>

        {statusSegmentedControl}

        {filterBar}

        {filtersActive && paginatedBirds.list.length === 0 ? (
          filteredEmpty
        ) : paginatedBirds.list.length === 0 ? (
          <div className="bg-white dark:bg-card p-12 text-center rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-3">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-500/10 text-teal rounded-full flex items-center justify-center text-3xl mx-auto">🥚</div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">No Non-Breeding Chickens</h3>
            <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">No chicken found under this status for non-breeding registry.</p>
            {effectiveStatus === 'Active' && (
              <button type="button" onClick={() => setProfilingSubTab('form')} className="mt-2 inline-block bg-slate-900 text-white font-bold px-5 py-2.5 rounded-md text-sm cursor-pointer hover:bg-emerald-700 transition-all">
                ➕ Encode First Non-Breeding Chicken
              </button>
            )}
          </div>
        ) : (
          <>
            {pagedList.map((child, index) => {
              const childGender: 'Male' | 'Female' = child.gender === 'Male' || child.gender === 'Rooster' ? 'Male' : 'Female';
              return renderCard(child, index, childGender);
            })}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    );
  }

  // SIRE MATERIAL
  if (tab === 'sireMaterial') {
    const { pagedList, totalPages } = paginatedBirds;
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="bg-white dark:bg-card p-5 rounded-lg border border-slate-200/80 dark:border-border shadow-sm flex items-center justify-between gap-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md border flex items-center justify-center text-xl shrink-0 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800 text-warning">🛡️</div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-card-foreground tracking-tight">Sire Material Registry</h2>
              <p className="text-xs text-muted-foreground font-semibold">Retired fighters promoted to breeding stock after critical injuries</p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-black text-white px-3 py-1.5 rounded-full bg-amber-600">{paginatedBirds.list.length} Registered</span>
        </div>
        {filterBar}
        {filtersActive && paginatedBirds.list.length === 0 ? (
          filteredEmpty
        ) : paginatedBirds.list.length === 0 ? (
          <div className="bg-white dark:bg-card p-12 text-center rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-3">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 text-warning rounded-full flex items-center justify-center text-3xl mx-auto">🛡️</div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">No Sire Material Yet</h3>
            <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">No chickens have been retired to breeding stock. Open a fighter&rsquo;s details and click <strong>Mark as Sire Material</strong> to move it here.</p>
          </div>
        ) : (
          <>
            {pagedList.map((fowl, index) => (
              <FowlCard key={fowl.id} fowl={fowl} index={index} gender="Male" onEdit={handleOpenEditModal} onArchive={setSelectedFowlForArchive} onDeceased={setSelectedFowlForDeceased} onSetActive={handleSetActiveStatus} onOpenDetails={setSelectedFowlForDetails} allFowls={fowls} />
            ))}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    );
  }

  // FALLBACK FOR LEGACY ARCHIVED TAB DIRECT ROUTING (SAFEGUARD)
  if (tab === 'archived') {
    const { pagedList, totalPages } = paginatedBirds;
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="bg-white dark:bg-card p-5 rounded-lg border border-slate-200/80 dark:border-border shadow-sm flex items-center justify-between gap-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md border flex items-center justify-center text-xl shrink-0 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800 text-warning">📦</div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-card-foreground tracking-tight">Archived Registry</h2>
              <p className="text-xs text-muted-foreground font-semibold">Chickens retired, sold, or transferred</p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-black text-white px-3 py-1.5 rounded-full bg-amber-600">{paginatedBirds.list.length} Archived</span>
        </div>
        {filterBar}
        {filtersActive && paginatedBirds.list.length === 0 ? (
          filteredEmpty
        ) : paginatedBirds.list.length === 0 ? (
          <div className="bg-white dark:bg-card p-12 text-center rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-3">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 text-warning rounded-full flex items-center justify-center text-3xl mx-auto">📦</div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">Archived Registry Empty</h3>
            <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">No chicken records have been archived.</p>
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

  // FALLBACK FOR LEGACY DECEASED TAB DIRECT ROUTING (SAFEGUARD)
  const { pagedList: deceasedPagedList, totalPages: deceasedTotalPages } = paginatedBirds;
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-white dark:bg-card p-5 rounded-lg border border-slate-200/80 dark:border-border shadow-sm flex items-center justify-between gap-4 border-l-4 border-l-rose-500">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md border flex items-center justify-center text-xl shrink-0 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800 text-danger">💀</div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-card-foreground tracking-tight">Mortality Logs</h2>
            <p className="text-xs text-muted-foreground font-semibold">Chickens recorded under mortality logs</p>
          </div>
        </div>
        <span className="shrink-0 text-xs font-black text-white px-3 py-1.5 rounded-full bg-rose-600">{paginatedBirds.list.length} Deceased</span>
      </div>
      {filterBar}
      {filtersActive && paginatedBirds.list.length === 0 ? (
        filteredEmpty
      ) : paginatedBirds.list.length === 0 ? (
        <div className="bg-white dark:bg-card p-12 text-center rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-3">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-danger rounded-full flex items-center justify-center text-3xl mx-auto">💀</div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-card-foreground">No Mortality Records</h3>
          <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">No chicken nodes recorded under mortality logs.</p>
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
