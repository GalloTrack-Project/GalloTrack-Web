'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { FowlRecord } from '@/lib/types';
import ParentSelector from '@/components/modals/ParentSelector';

function StatusItem({ icon, label, value, tone }: { icon?: string; label: string; value: string; tone: 'green' | 'amber' | 'rose' }) {
  const toneCls = tone === 'green'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-rose-50 text-rose-800 border-rose-200';
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200/70 p-3 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-tight">{icon && <span className="mr-1">{icon}</span>}{label}</span>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${toneCls}`}>{value}</span>
      </div>
    </div>
  );
}

type Props = {
  fowls: FowlRecord[];
  newName: string;
  setNewName: (v: string) => void;
  newBreed: string;
  setNewBreed: (v: string) => void;
  newGender: string;
  setNewGender: (v: string) => void;
  newBirthdate: string;
  handleNewBirthdateChange: (val: string) => void;
  age: string;
  handleAgeChange: (val: string) => void;
  newGrowthStage: string;
  setNewGrowthStage: (v: string) => void;
  height: string;
  setHeight: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  newLegColor: string;
  setNewLegColor: (v: string) => void;
  availableLegColors: string[];
  customLegColorNames: Set<string>;
  deleteCustomLegColor: (name: string) => Promise<void>;
  legColorQuery: string;
  setLegColorQuery: (v: string) => void;
  legColorOpen: boolean;
  setLegColorOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  sireName: string;
  setSireName: (v: string) => void;
  damName: string;
  setDamName: (v: string) => void;
  sirePct: number | string;
  setSirePct: (v: number | string) => void;
  damPct: number | string;
  setDamPct: (v: number | string) => void;
  selectedImage: File | null;
  setSelectedImage: (f: File | null) => void;
  imagePreview: string;
  setImagePreview: (v: string) => void;
  strainQuery: string;
  setStrainQuery: (v: string) => void;
  strainOpen: boolean;
  setStrainOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  availableStrains: string[];
  customStrainNames: Set<string>;
  deleteCustomStrain: (name: string) => Promise<void>;
  selectedStrains: string[];
  addStrain: (strain: string) => void;
  removeStrain: (index: number) => void;
  loading: boolean;
  uploadingImage: boolean;
  nextNodeId: string;
  dataCompleteness: number;
  validationPassed: boolean;
  bloodlineVerified: boolean;
  computedBloodlinePct: number;
  offspringGenInfo: { short: string; label: string };
  sireGenInfo: { short: string; label: string };
  damGenInfo: { short: string; label: string };
  sireGen: number;
  damGen: number;
  generationPurity: (gen: number) => number;
  handleAddFowl: (e: React.FormEvent) => void;
};

export default function EncodeForm({
  fowls,
  newName, setNewName,
  setNewBreed,
  newGender, setNewGender,
  newBirthdate, handleNewBirthdateChange,
  age, handleAgeChange,
  newGrowthStage, setNewGrowthStage,
  height, setHeight,
  weight, setWeight,
  setNewLegColor,
  availableLegColors,
  deleteCustomLegColor,
  legColorQuery, setLegColorQuery,
  legColorOpen, setLegColorOpen,
  sireName, setSireName,
  damName, setDamName,
  sirePct, setSirePct,
  damPct, setDamPct,
  selectedImage, setSelectedImage,
  imagePreview, setImagePreview,
  strainQuery, setStrainQuery,
  strainOpen, setStrainOpen,
  availableStrains,
  deleteCustomStrain,
  selectedStrains, addStrain, removeStrain,
  loading, uploadingImage,
  nextNodeId, dataCompleteness,
  validationPassed, bloodlineVerified,
  computedBloodlinePct, offspringGenInfo,
  sireGenInfo, damGenInfo,
  sireGen, damGen,
  generationPurity,
  handleAddFowl,
}: Props) {
  const strainInputRef = useRef<HTMLDivElement>(null);
  const legColorInputRef = useRef<HTMLDivElement>(null);
  const [strainDropdownPos, setStrainDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [legColorDropdownPos, setLegColorDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (strainOpen && strainInputRef.current) {
      const r = strainInputRef.current.getBoundingClientRect();
      setStrainDropdownPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
  }, [strainOpen]);

  useEffect(() => {
    if (legColorOpen && legColorInputRef.current) {
      const r = legColorInputRef.current.getBoundingClientRect();
      setLegColorDropdownPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
  }, [legColorOpen]);

  return (
    <form onSubmit={handleAddFowl} className="space-y-5 animate-fadeIn">
      <div className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 relative z-30 overflow-visible">
        <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-slate-100">
          <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center space-x-2">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">1</span>
            <span>Step 1: Core Identifiers</span>
          </h3>
          <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-black shrink-0">ID: {nextNodeId}</span>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Identifier Name</label>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold" placeholder="e.g., Roundhead Storm" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Genetic Strain</label>
            <div className="relative" ref={strainInputRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">🧬</span>
                  <input
                    type="text"
                    value={strainQuery}
                    onChange={(e) => { setStrainQuery(e.target.value); setNewBreed(e.target.value); setStrainOpen(true); }}
                    onFocus={() => setStrainOpen(true)}
                    onBlur={() => setTimeout(() => setStrainOpen(false), 150)}
                    placeholder="Select or type a strain (e.g. Kelso, Hatch, or custom)..."
                    className={`w-full pl-9 pr-9 p-3 border border-input rounded-xl text-xs bg-muted outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold ${strainQuery ? 'text-foreground' : 'text-muted-foreground font-normal'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setStrainOpen((o) => !o)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg border border-slate-200 bg-white text-slate-400 text-[10px] focus:border-emerald-500 cursor-pointer hover:text-emerald-500 transition-colors"
                    aria-label="Toggle strain list"
                  >
                    ▾
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = strainQuery.trim();
                    if (trimmed) {
                      addStrain(trimmed);
                      setStrainOpen(false);
                    }
                  }}
                  disabled={!strainQuery.trim()}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <span>+</span>
                  <span>Add</span>
                </button>
              </div>
              {selectedStrains.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedStrains.map((s, i) => (
                    <span key={`${s}-${i}`} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
                      🧬 {s}
                      <button type="button" onClick={() => removeStrain(i)} className="ml-0.5 w-4 h-4 rounded-full bg-emerald-200 hover:bg-rose-500 hover:text-white text-emerald-700 flex items-center justify-center text-[8px] font-black transition-all cursor-pointer">✕</button>
                    </span>
                  ))}
                </div>
              )}
              {strainOpen && strainDropdownPos && createPortal(
                <div className="fixed z-[9999] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden max-h-56 flex flex-col" style={{ top: strainDropdownPos.top, left: strainDropdownPos.left, width: strainDropdownPos.width }}>
                  <div className="overflow-y-auto">
                    {(() => {
                      const q = strainQuery.trim().toLowerCase();
                      const matching = q
                        ? availableStrains.filter((s) => s.toLowerCase().includes(q)).slice(0, 8)
                        : availableStrains.slice(0, 8);
                      if (q && !availableStrains.some((s) => s.toLowerCase() === q)) {
                        return (
                          <>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); addStrain(strainQuery.trim()); setStrainOpen(false); }}
                              className="w-full text-left px-4 py-3 bg-emerald-500/10 border-b border-border flex items-center justify-between gap-2 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                            >
                              <span className="text-xs font-black text-emerald-600">➕ Add &quot;{strainQuery.trim()}&quot; as new genetic strain</span>
                              <span className="text-[9px] font-mono text-emerald-500 uppercase shrink-0">Auto-saved</span>
                            </button>
                            {matching.length > 0 && <div className="px-4 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Matching strains</div>}
                            {matching.map((s) => (
                                <div key={s} className="flex items-center w-full group">
                                  <button type="button" onMouseDown={(e) => { e.preventDefault(); addStrain(s); setStrainOpen(false); }} className="flex-1 text-left px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
                                    {s}
                                  </button>
                                  <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deleteCustomStrain(s); }} className="shrink-0 w-6 h-6 mr-2 rounded-full bg-rose-50 border border-rose-200 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-[9px] font-bold transition-all cursor-pointer" title={`Delete "${s}"`}>✕</button>
                                </div>
                            ))}
                          </>
                        );
                      }
                      return matching.map((s) => (
                          <div key={s} className="flex items-center w-full group">
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); addStrain(s); setStrainOpen(false); }} className={`flex-1 text-left px-4 py-2.5 text-xs font-bold hover:bg-muted transition-colors cursor-pointer ${s.toLowerCase() === strainQuery.trim().toLowerCase() ? 'bg-emerald-500/10 text-emerald-600' : 'text-muted-foreground'}`}>
                              {s}
                            </button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deleteCustomStrain(s); }} className="shrink-0 w-6 h-6 mr-2 rounded-full bg-rose-50 border border-rose-200 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-[9px] font-bold transition-all cursor-pointer" title={`Delete "${s}"`}>✕</button>
                          </div>
                      ));
                    })()}
                    {strainQuery.trim() === '' && availableStrains.length === 0 && (
                      <div className="px-4 py-3 text-[10px] text-muted-foreground font-semibold">No strains saved yet — type a name to create one.</div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
            <p className="mt-1.5 text-[9px] text-slate-400 font-semibold">Choose an existing strain or type a new one, then click <strong>Add</strong> — you can add multiple genetic strains.</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Gender Class</label>
            <select value={newGender} onChange={(e) => { const g = e.target.value; setNewGender(g); if (age.trim() !== '' && !isNaN(Number(age))) { setNewGrowthStage(autoComputeGrowthStageLocal(Number(age), g)); } else { setNewGrowthStage(''); } }} className={`w-full p-3 border border-input rounded-xl text-xs bg-muted font-extrabold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer ${newGender ? 'text-foreground' : 'text-muted-foreground font-normal'}`} required>
              <option value="" disabled className="bg-popover text-muted-foreground">Select Gender Class</option>
              <option value="Rooster" className="bg-popover text-popover-foreground">Rooster (Cock)</option>
              <option value="Hen" className="bg-popover text-popover-foreground">Hen (Pullet)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
        <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">2</span>
          <span>Step 2: Physical Parameters</span>
        </h3>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
            Birth Date <span className="text-emerald-600 font-black">· required — age is auto-calculated</span>
          </label>
          <input
            type="date"
            value={newBirthdate}
            onChange={(e) => handleNewBirthdateChange(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all"
            required
          />
          {(() => {
            const parts = getAgePartsLocal(newBirthdate);
            return parts ? (
              <p className="mt-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                📅 Auto Age: {getAgeLabelLocal(parts)} &nbsp;·&nbsp; <span className="font-mono font-semibold">Exact {getAgeExactLocal(parts)}</span>
              </p>
            ) : (
              <p className="mt-1.5 text-[10px] text-slate-400 font-semibold">Age, growth stage, and calendar milestones are derived automatically from this date.</p>
            );
          })()}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Age (Mos) {newBirthdate && <span className="text-emerald-600 font-black">· auto</span>}</label>
            <input type="number" value={newBirthdate ? String((getAgePartsLocal(newBirthdate)?.totalMonths ?? 0)) : age} onChange={(e) => handleAgeChange(e.target.value)} readOnly={!!newBirthdate} className="w-full p-3 border border-slate-300 rounded-xl text-xs text-center font-extrabold bg-white text-neutral-900 placeholder:text-neutral-400 outline-none" placeholder="0" required />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Growth Stage</label>
            <select
              value={newGrowthStage}
              onChange={(e) => setNewGrowthStage(e.target.value)}
              className={`w-full p-3 border border-input rounded-xl text-xs bg-muted font-extrabold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer text-center ${newGrowthStage ? 'text-emerald-600' : 'text-muted-foreground font-normal'}`}
            >
              <option value="" disabled className="bg-popover text-muted-foreground">Select stage...</option>
              <option value="Chick" className="bg-popover text-popover-foreground">Chick</option>
              <option value="Stag" className="bg-popover text-popover-foreground">Stag</option>
              <option value="Pullet" className="bg-popover text-popover-foreground">Pullet</option>
              <option value="Bull Stag" className="bg-popover text-popover-foreground">Bull Stag</option>
              <option value="Cock" className="bg-popover text-popover-foreground">Cock</option>
              <option value="Hen" className="bg-popover text-popover-foreground">Hen</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Height (cm)</label>
            <input type="number" step="0.1" min="0" value={height} onChange={(e) => { const v = e.target.value; setHeight(v === '' ? '' : String(Math.round(Number(v) * 10) / 10)); }} className="no-spinner w-full p-3 border border-slate-300 rounded-xl text-xs text-center font-extrabold bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500" placeholder="e.g. 45.0" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Weight (kg)</label>
            <input type="number" step="0.1" min="0" value={weight} onChange={(e) => { const v = e.target.value; setWeight(v === '' ? '' : String(Math.round(Number(v) * 10) / 10)); }} className="no-spinner w-full p-3 border border-slate-300 rounded-xl text-xs text-center font-extrabold bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500" placeholder="e.g. 2.0" />
          </div>
        </div>
        <div className="relative" ref={legColorInputRef}>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Leg Color</label>
          <div className="relative">
            <input
              type="text"
              value={legColorQuery}
              onChange={(e) => { setLegColorQuery(e.target.value); setNewLegColor(e.target.value); setLegColorOpen(true); }}
              onFocus={() => setLegColorOpen(true)}
              onBlur={() => setTimeout(() => setLegColorOpen(false), 150)}
              placeholder="Select or type a leg color..."
              className={`w-full pl-3 pr-9 p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-semibold transition-all ${legColorQuery ? 'text-neutral-900' : 'text-neutral-400 font-normal'}`}
            />
            <button
              type="button"
              onClick={() => setLegColorOpen((o) => !o)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg border border-slate-200 bg-white text-slate-400 text-[10px] focus:border-emerald-500 cursor-pointer hover:text-emerald-500 transition-colors"
              aria-label="Toggle leg color list"
            >
              ▾
            </button>
          </div>
          {legColorOpen && legColorDropdownPos && createPortal(
            <div className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-56 flex flex-col" style={{ top: legColorDropdownPos.top, left: legColorDropdownPos.left, width: legColorDropdownPos.width }}>
              <div className="overflow-y-auto">
                {(() => {
                  const q = legColorQuery.trim().toLowerCase();
                  const matching = q
                    ? availableLegColors.filter((s) => s.toLowerCase().includes(q)).slice(0, 8)
                    : availableLegColors.slice(0, 8);
                  if (q && !availableLegColors.some((s) => s.toLowerCase() === q)) {
                    return (
                      <>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setLegColorQuery(legColorQuery.trim()); setNewLegColor(legColorQuery.trim()); setLegColorOpen(false); }}
                          className="w-full text-left px-4 py-3 bg-emerald-500/10 border-b border-slate-200 flex items-center justify-between gap-2 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                        >
                          <span className="text-xs font-black text-emerald-600">➕ Save &quot;{legColorQuery.trim()}&quot; as new leg color</span>
                          <span className="text-[9px] font-mono text-emerald-500 uppercase shrink-0">Auto-saved</span>
                        </button>
                        {matching.length > 0 && <div className="px-4 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Matching colors</div>}
                        {matching.map((s) => (
                            <div key={s} className="flex items-center w-full group">
                              <button type="button" onMouseDown={(e) => { e.preventDefault(); setLegColorQuery(s); setNewLegColor(s); setLegColorOpen(false); }} className="flex-1 text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                                {s}
                              </button>
                              <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deleteCustomLegColor(s); }} className="shrink-0 w-6 h-6 mr-2 rounded-full bg-rose-50 border border-rose-200 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-[9px] font-bold transition-all cursor-pointer" title={`Delete "${s}"`}>✕</button>
                            </div>
                        ))}
                      </>
                    );
                  }
                  return matching.map((s) => (
                      <div key={s} className="flex items-center w-full group">
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setLegColorQuery(s); setNewLegColor(s); setLegColorOpen(false); }} className={`flex-1 text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer ${s.toLowerCase() === legColorQuery.trim().toLowerCase() ? 'bg-emerald-500/10 text-emerald-600' : 'text-slate-600'}`}>
                          {s}
                        </button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deleteCustomLegColor(s); }} className="shrink-0 w-6 h-6 mr-2 rounded-full bg-rose-50 border border-rose-200 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-[9px] font-bold transition-all cursor-pointer" title={`Delete "${s}"`}>✕</button>
                      </div>
                  ));
                })()}
                {legColorQuery.trim() === '' && availableLegColors.length === 0 && (
                  <div className="px-4 py-3 text-[10px] text-slate-400 font-semibold">No leg colors saved yet — type a name to create one.</div>
                )}
              </div>
            </div>,
            document.body
          )}
          <p className="mt-1.5 text-[9px] text-slate-400 font-semibold">Common choices: Yellow, White, Green / Slate, Willow, Black — or type a custom leg color.</p>
        </div>
      </div>

      <div className="antigravity-hover bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">3</span>
          <span>Step 3: Ancestry Roots &amp; Photo</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
              Sire (Father) <span className="text-slate-400 font-normal lowercase">(pick from registry or type custom)</span>
            </label>
            <ParentSelector value={sireName} onChange={(v) => setSireName(v)} onPick={() => {}} fowls={fowls} preferredGender="Male" placeholder="e.g. Foundation Stock or Sire Name" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
              Dam (Mother) <span className="text-slate-400 font-normal lowercase">(pick from registry or type custom)</span>
            </label>
            <ParentSelector value={damName} onChange={(v) => setDamName(v)} onPick={() => {}} fowls={fowls} preferredGender="Female" accent="amber" placeholder="e.g. Foundation Stock or Dam Name" />
          </div>
        </div>
        {(sireName.trim() || damName.trim()) && (() => {
          const sireChildren = sireName.trim() ? fowls.filter((f) => (f.sire || '').trim().toLowerCase() === sireName.trim().toLowerCase()) : [];
          const damChildren = damName.trim() ? fowls.filter((f) => (f.dam || '').trim().toLowerCase() === damName.trim().toLowerCase()) : [];
          const sireFullSibs = sireChildren.filter((c) => (c.dam || '').trim().toLowerCase() === (damName.trim().toLowerCase()));
          const hasData = sireChildren.length > 0 || damChildren.length > 0;
          if (!hasData) return null;
          return (
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 rounded-2xl p-4 space-y-2">
              <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest">👤 Existing Offspring &amp; Siblings</p>
              <div className="grid grid-cols-2 gap-3">
                {sireChildren.length > 0 && (
                  <div className="bg-white/70 border border-sky-100 rounded-xl p-3">
                    <p className="text-[9px] font-black text-sky-600 uppercase">🐓 {sireName.trim()} Offspring</p>
                    <p className="text-lg font-black text-slate-800">{sireChildren.length}</p>
                    <p className="text-[9px] text-slate-400 font-semibold">
                      {sireChildren.filter((c) => c.gender === 'Male').length} cock(s) · {sireChildren.filter((c) => c.gender === 'Female').length} hen(s)
                    </p>
                    {sireFullSibs.length > 0 && (
                      <p className="text-[9px] font-bold text-emerald-600 mt-1">✓ {sireFullSibs.length} full sibling(s) with current dam</p>
                    )}
                  </div>
                )}
                {damChildren.length > 0 && (
                  <div className="bg-white/70 border border-pink-100 rounded-xl p-3">
                    <p className="text-[9px] font-black text-pink-600 uppercase">🐔 {damName.trim()} Offspring</p>
                    <p className="text-lg font-black text-slate-800">{damChildren.length}</p>
                    <p className="text-[9px] text-slate-400 font-semibold">
                      {damChildren.filter((c) => c.gender === 'Male').length} cock(s) · {damChildren.filter((c) => c.gender === 'Female').length} hen(s)
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
              Sire Purity (%)
            </label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={sirePct === '' ? '' : String(sirePct)} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); if (v === '') { setSirePct(''); } else { setSirePct(Math.min(Number(v), 100)); } }} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none font-bold placeholder:font-normal" placeholder="e.g. 60" />
            <p className="text-[9px] text-slate-400 mt-1 font-semibold">Independent — set freely</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
              Dam Purity (%)
            </label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={damPct === '' ? '' : String(damPct)} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); if (v === '') { setDamPct(''); } else { setDamPct(Math.min(Number(v), 100)); } }} className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none font-bold placeholder:font-normal" placeholder="e.g. 40" />
            <p className="text-[9px] text-slate-400 mt-1 font-semibold">Independent — set freely</p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest">🧬 Generational Purity &amp; Backcrossing</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Auto-detected from the selected Sire &amp; Dam lineage history</p>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1.5 bg-teal-700 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">{offspringGenInfo.short} · {offspringGenInfo.label}</span>
              <p className="text-2xl font-black text-teal-700 mt-1.5">{computedBloodlinePct}%</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">{bloodlineVerified ? 'Verified' : 'Awaiting Parents'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/70 border border-sky-100 rounded-xl p-3">
              <p className="text-[9px] font-black text-sky-600 uppercase tracking-wider">🐓 Sire Lineage</p>
              <p className="text-sm font-black text-slate-800 truncate">{sireName.trim() ? sireName : '—'}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5">{sireGenInfo.label} · {generationPurity(sireGen)}% purity</p>
            </div>
            <div className="bg-white/70 border border-pink-100 rounded-xl p-3">
              <p className="text-[9px] font-black text-pink-600 uppercase tracking-wider">🐔 Dam Lineage</p>
              <p className="text-sm font-black text-slate-800 truncate">{damName.trim() ? damName : '—'}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5">{damGenInfo.label} · {generationPurity(damGen)}% purity</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-semibold">Purity ladder: F1 (First Cross) = 50% · F2 (1st Backcross) = 75% · F3 (2nd Backcross) = 87.5% · F4+ (Stabilized) = 93.75%–96%+. Purity = 100 × (1 − 2⁻ᵍᵉⁿ) with foundation/base stock = 100%.</p>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Fowl Attachment Photo</label>
          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/80 hover:bg-slate-100/70 transition-all overflow-hidden relative">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-slate-600 font-bold">📷 {selectedImage ? selectedImage.name : 'Choose fowl image file'}</span>
            )}
            <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) { const f = e.target.files[0]; setSelectedImage(f); setImagePreview(URL.createObjectURL(f)); } }} className="hidden" />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Validation &amp; Summary Panel</span>
          </div>
          <span className="text-[9px] font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">Node: {nextNodeId}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatusItem icon="🛡️" label="Data Integrity &amp; Lineage Accuracy" value={`${dataCompleteness}%`} tone={dataCompleteness === 100 ? 'green' : 'amber'} />
          <StatusItem icon="✅" label="Validation" value={validationPassed ? 'Passed' : 'Pending'} tone={validationPassed ? 'green' : 'amber'} />
          <StatusItem icon="🔗" label="Bloodline Consistency" value={bloodlineVerified ? `${computedBloodlinePct}%` : 'Awaiting'} tone={bloodlineVerified ? 'green' : 'amber'} />
          <StatusItem icon="📊" label="Data Completeness" value={`${dataCompleteness}%`} tone={dataCompleteness === 100 ? 'green' : 'amber'} />
        </div>
        <button type="submit" disabled={loading || uploadingImage} className="w-full bg-slate-900 hover:bg-emerald-700 active:scale-[0.99] text-white font-black py-4 rounded-2xl text-xs shadow-md uppercase tracking-widest cursor-pointer transition-all duration-200 flex items-center justify-center space-x-2">
          {(loading || uploadingImage) && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
          <span>{uploadingImage ? 'Uploading Attachment...' : loading ? 'Registering...' : 'REGISTER'}</span>
        </button>
        <p className="text-center text-[9px] text-slate-400 font-semibold mt-2.5 tracking-wide">🔒 Verify lineage accuracy before registering to the cluster registry.</p>
      </div>
    </form>
  );
}

function autoComputeGrowthStageLocal(ageMonths: number, gender: string): string {
  const g = gender.toLowerCase();
  if (ageMonths < 3) return 'Chick';
  if (g === 'male' || g === 'rooster') {
    if (ageMonths < 6) return 'Stag';
    if (ageMonths < 12) return 'Bull Stag';
    return 'Cock';
  }
  if (ageMonths < 6) return 'Pullet';
  return 'Hen';
}

type AgePartsLocal = { years: number; months: number; days: number; totalMonths: number };

function getAgePartsLocal(birthdate: string): AgePartsLocal | null {
  if (!birthdate) return null;
  const bd = new Date(birthdate);
  if (isNaN(bd.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - bd.getFullYear();
  let months = now.getMonth() - bd.getMonth();
  let days = now.getDate() - bd.getDate();
  if (days < 0) { months--; days += 30; }
  if (months < 0) { years--; months += 12; }
  return { years, months, days, totalMonths: years * 12 + months };
}

function getAgeLabelLocal(p: AgePartsLocal): string {
  if (p.years > 0) return `${p.years}y ${p.months}m`;
  if (p.months > 0) return `${p.months}m ${p.days}d`;
  return `${p.days}d`;
}

function getAgeExactLocal(p: AgePartsLocal): string {
  return `${p.years}y ${p.months}m ${p.days}d`;
}
