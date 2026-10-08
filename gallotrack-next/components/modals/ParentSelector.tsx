'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Eye, Award } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import { genderLabel, isMale, isFemale } from '@/lib/helpers';
import type { FowlRecord } from '@/lib/types';
import { buildRegistryContext, roleOf, isActiveStatus } from '@/lib/registry-roles';
import { buildCodeSet, nextFoundationCode } from '@/lib/bird-code';
import { useFowl } from '@/lib/contexts/fowl-context';
import PromoteToBreederModal from './PromoteToBreederModal';

export type ParentSelectorProps = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  onPick?: (fowl: FowlRecord) => void;
  fowls: FowlRecord[];
  preferredGender?: 'Male' | 'Female';
  placeholder?: string;
  accent?: 'emerald' | 'amber';
  compact?: boolean;
};

function getChildrenOf(parentName: string, fowls: FowlRecord[], gender: 'sire' | 'dam'): FowlRecord[] {
  const parentNameLower = parentName.trim().toLowerCase();
  return fowls.filter((f) => {
    if (gender === 'sire') return (f.sire || '').trim().toLowerCase() === parentNameLower;
    return (f.dam || '').trim().toLowerCase() === parentNameLower;
  });
}

function getSiblingType(child: FowlRecord, parentName: string, parentGender: 'sire' | 'dam', allFowls: FowlRecord[]): string {
  const parentNameLower = parentName.trim().toLowerCase();
  const siblings = allFowls.filter((f) => {
    if (parentGender === 'sire') return (f.sire || '').trim().toLowerCase() === parentNameLower;
    return (f.dam || '').trim().toLowerCase() === parentNameLower;
  });
  const otherParentField = parentGender === 'sire' ? 'dam' : 'sire';
  const sharedOtherParent = child[otherParentField as 'sire' | 'dam'];
  const fullSibs = siblings.filter((s) => (s[otherParentField as 'sire' | 'dam'] || '').trim().toLowerCase() === (sharedOtherParent || '').trim().toLowerCase());
  if (fullSibs.length > 1) return 'Full Sibling';
  return 'Half-Sibling';
}

function ChildItem({ child, parentName, parentGender, allFowls, onSelect }: { child: FowlRecord; parentName: string; parentGender: 'sire' | 'dam'; allFowls: FowlRecord[]; onSelect: () => void }) {
  const relType = getSiblingType(child, parentName, parentGender, allFowls);
  const isFull = relType === 'Full Sibling';
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-muted/50 text-left cursor-pointer border-b border-slate-50 dark:border-border last:border-b-0"
    >
      <span className="w-6 h-6 rounded-sm bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border flex items-center justify-center text-xs shrink-0">
        <ChickenIcon className="w-3 h-3" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-bold text-slate-800 dark:text-card-foreground truncate">{child.name}</span>
        <span className="block text-xs text-muted-foreground font-semibold">{child.breed} · {child.growth_stage || 'N/A'}</span>
      </span>
      <span className={`shrink-0 text-xs font-black px-1.5 py-0.5 rounded-full uppercase ${isFull ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'}`}>
        {relType}
      </span>
    </button>
  );
}

export default function ParentSelector({ id, value, onChange, onPick, fowls, preferredGender, placeholder, accent = 'emerald', compact }: ParentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [expandedSire, setExpandedSire] = useState<string | null>(null);
  const [expandedDam, setExpandedDam] = useState<string | null>(null);
  const [promotingFowl, setPromotingFowl] = useState<FowlRecord | null>(null);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  let fowlContext: ReturnType<typeof useFowl> | null = null;
  try {
    fowlContext = useFowl();
  } catch {
    fowlContext = null;
  }

  if (prevValue !== value) {
    setPrevValue(value);
    setText(value);
  }

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const q = text.trim().toLowerCase();
  const matchedKey = value.trim().toLowerCase();
  const matchedParent =
    matchedKey && matchedKey !== 'foundation stock'
      ? fowls.find((f) => (f.name || '').trim().toLowerCase() === matchedKey)
      : undefined;

  const targetRole = preferredGender === 'Male' ? 'Breeding Male' : 'Breeding Female';
  const regCtx = buildRegistryContext(fowls);

  // 1. Primary Candidates: strictly Active chickens with role matching targetRole
  const breederCandidates = fowls
    .filter((f) => {
      if (!isActiveStatus(f)) return false;
      if (roleOf(f, regCtx) !== targetRole) return false;
      const name = (f.name || '').trim().toLowerCase();
      const code = (f.chicken_code || f.bird_code || '').trim().toLowerCase();
      if (!name || name === 'foundation stock') return false;
      if (q && !name.includes(q) && !code.includes(q)) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // 2. Offspring Candidates: Active chickens in Non-Breeding matching the gender
  const offspringCandidates = fowls
    .filter((f) => {
      if (!isActiveStatus(f)) return false;
      if (roleOf(f, regCtx) !== 'Non-Breeding') return false;
      if (preferredGender === 'Male' && !isMale(f.gender)) return false;
      if (preferredGender === 'Female' && !isFemale(f.gender)) return false;
      const name = (f.name || '').trim().toLowerCase();
      const code = (f.birth_code || f.chicken_code || f.bird_code || '').trim().toLowerCase();
      if (!name || name === 'foundation stock') return false;
      if (q && !name.includes(q) && !code.includes(q)) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const accentBg = accent === 'emerald' ? 'bg-emerald-600' : 'bg-amber-500';
  const genderIcon = <ChickenIcon className="w-3 h-3" />;
  const pad = compact ? 'p-2.5' : 'p-3';
  const parentGender = preferredGender === 'Male' ? 'sire' : 'dam';
  const expandedItem = parentGender === 'sire' ? expandedSire : expandedDam;
  const setExpandedItem = parentGender === 'sire' ? setExpandedSire : setExpandedDam;

  const takenCodes = buildCodeSet(
    fowls.map((f) => f.chicken_code || f.bird_code).filter(Boolean) as string[],
  );
  const suggestedCode = nextFoundationCode(preferredGender, takenCodes);

  const handleConfirmPromotion = async (assignedCode: string) => {
    if (!promotingFowl || !fowlContext) return;
    const res = await fowlContext.handlePromoteToBreeder(promotingFowl, targetRole, assignedCode);
    if (res.success) {
      setText(promotingFowl.name);
      onChange(promotingFowl.name);
      if (onPick) onPick(promotingFowl);
      setOpen(false);
      setPromoteModalOpen(false);
      setPromotingFowl(null);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id}
        type="text"
        value={text}
        onChange={(e) => { setText(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className={`w-full ${pad} border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground focus:border-emerald-500 font-semibold`}
        placeholder={placeholder || 'Type a name or pick from registry...'}
      />
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-popover border border-slate-200 dark:border-border rounded-lg shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {/* SECTION 1: Breeding Stock (Exclusive role) */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-muted/50 border-b border-slate-100 dark:border-border text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span>{preferredGender === 'Male' ? 'Breeding Males (Sires)' : 'Breeding Females (Dams)'}</span>
            <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">{breederCandidates.length}</span>
          </div>

          {breederCandidates.length > 0 ? (
            breederCandidates.map((f) => {
              const children = getChildrenOf(f.name, fowls, parentGender);
              const isExpanded = expandedItem === f.name;
              const displayCode = f.chicken_code || f.bird_code;
              const isPromotedChild = !!f.birth_code && f.birth_code !== displayCode;

              return (
                <div key={f.id} className="border-b border-slate-50 dark:border-border last:border-b-0">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-muted/50 text-left cursor-pointer group">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setText(f.name);
                        onChange(f.name);
                        if (onPick) onPick(f);
                        setOpen(false);
                      }}
                      className="flex-1 flex items-center gap-2.5 min-w-0"
                    >
                      <span className="w-7 h-7 rounded-sm bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border flex items-center justify-center shrink-0">
                        <ChickenIcon className="w-3 h-3 text-muted-foreground" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-black text-slate-800 dark:text-card-foreground truncate">
                          {displayCode ? (
                            <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 mr-1.5 align-middle">
                              [{displayCode}]
                            </span>
                          ) : null}
                          {f.name}
                          {isPromotedChild && (
                            <span className="ml-1.5 text-xs font-mono text-muted-foreground font-semibold">
                              (born as {f.birth_code})
                            </span>
                          )}
                        </span>
                        <span className="block text-xs font-semibold text-muted-foreground truncate">
                          {f.breed} · {f.growth_stage || 'Stag'} · {genderLabel(f.gender) || 'Unset'}
                        </span>
                      </span>
                    </button>
                    {children.length > 0 && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExpandedItem(isExpanded ? null : f.name);
                        }}
                        className={`shrink-0 w-7 h-7 rounded-sm flex items-center justify-center text-xs font-black transition-all cursor-pointer ${
                          isExpanded
                            ? 'bg-emerald-500 text-white border border-emerald-500'
                            : 'bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border text-muted-foreground hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-900/50 dark:hover:text-emerald-300 dark:hover:border-emerald-700'
                        }`}
                        title={`View ${children.length} children of ${f.name}`}
                      >
                         <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="shrink-0 text-xs font-mono font-black px-1.5 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 dark:text-emerald-300">
                      Active
                    </span>
                  </div>
                  {isExpanded && children.length > 0 && (
                    <div className="bg-slate-50 dark:bg-muted/50 border-t border-slate-100 dark:border-border pl-4 pr-2 py-1">
                      <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Offspring of {f.name}</span>
                        <span className="text-xs font-black bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">{children.length}</span>
                      </div>
                      {children.map((child) => (
                        <ChildItem
                          key={child.id}
                          child={child}
                          parentName={f.name}
                          parentGender={parentGender}
                          allFowls={fowls}
                          onSelect={() => {
                            setText(f.name);
                            onChange(f.name);
                            if (onPick) onPick(f);
                            setOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-3 py-2.5 text-xs text-muted-foreground italic">
              No active {preferredGender === 'Male' ? 'Breeding Males' : 'Breeding Females'} match your query.
            </div>
          )}

          {/* SECTION 2: Non-Breeding Offspring (Offer promotion) */}
          {offspringCandidates.length > 0 && (
            <div className="border-t-2 border-slate-200 dark:border-border bg-amber-50/30 dark:bg-amber-950/20">
              <div className="px-3 py-2 bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-900/50 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Non-Breeding Offspring ({offspringCandidates.length})
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  Promote to use as parent
                </span>
              </div>
              {offspringCandidates.map((f) => {
                const birth = f.birth_code || f.chicken_code || f.bird_code;
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-border last:border-b-0 hover:bg-amber-50/50 dark:hover:bg-amber-950/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {birth && (
                          <span className="font-mono text-xs font-bold text-muted-foreground px-1 py-0.5 rounded bg-slate-100 dark:bg-muted">
                            [{birth}]
                          </span>
                        )}
                        <span className="text-sm font-bold text-slate-800 dark:text-card-foreground truncate">
                          {f.name}
                        </span>
                      </div>
                      <span className="block text-xs text-muted-foreground truncate font-medium">
                        {f.breed} · {f.growth_stage || 'Offspring'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPromotingFowl(f);
                        setPromoteModalOpen(true);
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                      title={`Promote ${f.name} to ${targetRole}`}
                    >
                      <Award className="w-3 h-3" />
                      <span>Promote to breeder first</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION 3: Custom external / Foundation Stock name */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-muted/50 text-left cursor-pointer border-t border-slate-100 dark:border-border"
          >
            <span className={`w-7 h-7 rounded-sm ${accentBg} text-white flex items-center justify-center text-xs font-black shrink-0`}>{genderIcon}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-black text-slate-800 dark:text-card-foreground truncate">
                {text.trim() ? `Use "${text.trim()}" as custom ${preferredGender?.toLowerCase() || 'parent'}` : 'External / Foundation Stock name...'}
              </span>
            </span>
          </button>
        </div>
      )}

      {matchedParent?.breed && (
        <p className="mt-1 text-xs font-bold text-muted-foreground">
          Breed:{' '}
          <span className={`font-black ${accent === 'emerald' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {matchedParent.breed}
          </span>
        </p>
      )}

      {/* Promotion confirmation modal */}
      <PromoteToBreederModal
        isOpen={promoteModalOpen}
        onClose={() => {
          setPromoteModalOpen(false);
          setPromotingFowl(null);
        }}
        fowl={promotingFowl}
        targetRole={targetRole}
        suggestedCode={suggestedCode}
        onConfirm={handleConfirmPromotion}
      />
    </div>
  );
}
