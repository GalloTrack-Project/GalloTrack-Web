'use client';
import React from 'react';
import type { FowlRecord, AgeParts } from '@/lib/types';
import ParentSelector from './ParentSelector';

type EditFowlModalProps = {
  editingFowl: FowlRecord | null;
  setEditingFowl: (f: FowlRecord | null) => void;
  handleUpdateFowl: (e: React.FormEvent) => void;
  loading: boolean;
  fowls: FowlRecord[];
  availableStrains: string[];
  customStrainNames: Set<string>;
  deleteCustomStrain: (name: string) => Promise<void>;
  editName: string;
  setEditName: (v: string) => void;
  editBreed: string;
  setEditBreed: (v: string) => void;
  editGender: string;
  setEditGender: (v: string) => void;
  editColorCategory: string;
  setEditColorCategory: (v: string) => void;
  editColor: string;
  setEditColor: (v: string) => void;
  editBehaviorTrait: string;
  setEditBehaviorTrait: (v: string) => void;
  editEyeVariant: string;
  setEditEyeVariant: (v: string) => void;
  editAge: string;
  setEditAge: (v: string) => void;
  editBirthdate: string;
  setEditBirthdate: (v: string) => void;
  editGrowthStage: string;
  setEditGrowthStage: (v: string) => void;
  editWeight: string;
  setEditWeight: (v: string) => void;
  editHeight: string;
  setEditHeight: (v: string) => void;
  editLegColor: string;
  setEditLegColor: (v: string) => void;
  availableLegColors: string[];
  customLegColorNames: Set<string>;
  deleteCustomLegColor: (name: string) => Promise<void>;
  editSire: string;
  setEditSire: (v: string) => void;
  editDam: string;
  setEditDam: (v: string) => void;
  editSirePct: number | string;
  setEditSirePct: (v: number | string) => void;
  editDamPct: number | string;
  setEditDamPct: (v: number | string) => void;
  handleEditBirthdateChange: (val: string) => void;
  handleEditAgeChange: (val: string) => void;
  autoComputeGrowthStage: (ageMonths: number, gender: string) => string;
  getAgeParts: (birthdate: string) => AgeParts | null;
  getAgeLabel: (parts: AgeParts) => string;
  getAgeMetrics: (parts: AgeParts) => string;
  generationOf: (f: FowlRecord) => number;
  generationPurity: (gen: number) => number;
};

export default function EditFowlModal({
  editingFowl,
  setEditingFowl,
  handleUpdateFowl,
  loading,
  fowls,
  availableStrains,
  deleteCustomStrain,
  editName,
  setEditName,
  editBreed,
  setEditBreed,
  editGender,
  setEditGender,
  editColorCategory,
  setEditColorCategory,
  editColor,
  setEditColor,
  editAge,
  editBirthdate,
  editGrowthStage,
  setEditGrowthStage,
  editWeight,
  setEditWeight,
  editHeight,
  setEditHeight,
  editLegColor,
  setEditLegColor,
  availableLegColors,
  deleteCustomLegColor,
  editSire,
  setEditSire,
  editDam,
  setEditDam,
  editSirePct,
  setEditSirePct,
  editDamPct,
  setEditDamPct,
  handleEditBirthdateChange,
  handleEditAgeChange,
  autoComputeGrowthStage,
  getAgeParts,
  getAgeLabel,
  getAgeMetrics,
  generationOf,
  generationPurity,
}: EditFowlModalProps) {
  if (!editingFowl) return null;

  const isFoundationStock = (name: string): boolean => (name || '').trim().toLowerCase() === 'foundation stock';
  const parentBloodlinePct = (f: FowlRecord) => generationPurity(generationOf(f));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <span className="text-lg">✏️</span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Edit Node Registry</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Update parameters for {editingFowl.name}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setEditingFowl(null)}
            className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ✕ Cancel
          </button>
        </div>

        <form onSubmit={handleUpdateFowl} className="overflow-y-auto p-6 space-y-4 text-xs">
          
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/40">
            <h4 className="font-black text-emerald-700 text-[10px] uppercase tracking-wider flex items-center space-x-1 border-b pb-1">
              <span>🏷️</span> <span>Core Identity</span>
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Identifier Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-medium" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative z-30">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Genetic Strain</label>
                <input 
                  type="text"
                  value={editBreed}
                  onChange={(e) => setEditBreed(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-medium" 
                  placeholder="Select or type strain"
                  required 
                />
                {availableStrains.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {availableStrains.filter((s) => s.toLowerCase().includes(editBreed.toLowerCase()) && s !== editBreed).slice(0, 5).map((s) => (
                      <div key={s} className="flex items-center bg-slate-100 rounded-full group">
                        <button type="button" onClick={() => setEditBreed(s)} className="text-[9px] font-bold px-2.5 py-1 text-slate-600 hover:text-emerald-700 cursor-pointer">{s}</button>
                        <button type="button" onClick={() => deleteCustomStrain(s)} className="w-4 h-4 mr-1 rounded-full bg-rose-50 border border-rose-200 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-[7px] font-bold transition-all cursor-pointer" title={`Delete "${s}"`}>✕</button>
                      </div>
                  ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gender Class</label>
                <select value={editGender} onChange={(e) => { const g = e.target.value; setEditGender(g); if (editAge.trim() !== '' && !isNaN(Number(editAge))) { setEditGrowthStage(autoComputeGrowthStage(Number(editAge), g)); } else { setEditGrowthStage(''); } }} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-700 outline-none">
                  <option value="Rooster">Rooster (Cock)</option>
                  <option value="Hen">Hen (Pullet)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/40">
            <h4 className="font-black text-emerald-700 text-[10px] uppercase tracking-wider flex items-center space-x-1 border-b pb-1">
              <span>📐</span> <span>Physical Parameters</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Color Group</label>
                <select value={editColorCategory} onChange={(e) => { setEditColorCategory(e.target.value); setEditColor(e.target.value === 'Red' ? 'Bright Red' : 'Talisay / Grey'); }} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-700 outline-none">
                  <option value="Red">Red Class</option>
                  <option value="Light Color">Light Class</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specific Tone</label>
                <select value={editColor} onChange={(e) => setEditColor(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium">
                  {editColorCategory === 'Red' ? (
                    <>
                      <option value="Bright Red">Bright Red</option>
                      <option value="Dark Red">Dark Red</option>
                      <option value="Light Red">Light Red</option>
                    </>
                  ) : (
                    <>
                      <option value="Talisay / Grey">Talisay / Grey</option>
                      <option value="White Cup">White Cup</option>
                      <option value="Black">Black</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="mb-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Birth Date <span className="text-emerald-600 font-black">· auto age</span></label>
              <input type="date" value={editBirthdate} onChange={(e) => handleEditBirthdateChange(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 font-semibold outline-none focus:border-emerald-500" />
              {(() => {
                const parts = getAgeParts(editBirthdate);
                return parts ? (
                  <p className="mt-1 text-[10px] font-bold text-emerald-700">📅 Auto Age: {getAgeLabel(parts)} · <span className="font-mono">{getAgeMetrics(parts)}</span></p>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-400 font-medium">Set a birth date for automatic age &amp; milestone tracking.</p>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age (Mos) {editBirthdate && <span className="text-emerald-600 font-black">· auto</span>}</label>
                <input type="number" value={editBirthdate ? String((getAgeParts(editBirthdate)?.totalMonths ?? 0)) : editAge} onChange={(e) => handleEditAgeChange(e.target.value)} readOnly={!!editBirthdate} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-center font-bold bg-white text-neutral-900 placeholder:text-neutral-400" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Growth</label>
                <input 
                  type="text" 
                  value={editGrowthStage} 
                  readOnly 
                  placeholder="Awaiting age..." 
                  className={`w-full p-2.5 border rounded-xl text-xs text-center font-bold transition-all ${
                    editGrowthStage 
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-800' 
                      : 'border-slate-200 bg-slate-50 text-slate-400 font-normal'
                  }`} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Height (cm)</label>
                <input type="number" step="0.1" min="0" value={editHeight} onChange={(e) => { const v = e.target.value; setEditHeight(v === '' ? '' : String(Math.round(Number(v) * 10) / 10)); }} className="no-spinner w-full p-2.5 border border-slate-300 rounded-xl text-xs text-center font-bold bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500" placeholder="e.g. 45.0" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Weight (kg)</label>
                <input type="number" step="0.1" min="0" value={editWeight} onChange={(e) => { const v = e.target.value; setEditWeight(v === '' ? '' : String(Math.round(Number(v) * 10) / 10)); }} className="no-spinner w-full p-2.5 border border-slate-300 rounded-xl text-xs text-center font-bold bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500" placeholder="e.g. 2.0" />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Leg Color</label>
              <input
                type="text"
                value={editLegColor}
                onChange={(e) => setEditLegColor(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-emerald-500 font-medium"
                placeholder="Select or type a leg color..."
              />
              {availableLegColors.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {availableLegColors.filter((s) => s.toLowerCase().includes(editLegColor.toLowerCase()) && s !== editLegColor).slice(0, 5).map((s) => (
                    <div key={s} className="flex items-center bg-slate-100 rounded-full group">
                      <button type="button" onClick={() => setEditLegColor(s)} className="text-[9px] font-bold px-2.5 py-1 text-slate-600 hover:text-emerald-700 cursor-pointer">{s}</button>
                      <button type="button" onClick={() => deleteCustomLegColor(s)} className="w-4 h-4 mr-1 rounded-full bg-rose-50 border border-rose-200 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-[7px] font-bold transition-all cursor-pointer" title={`Delete "${s}"`}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/40">
            <h4 className="font-black text-emerald-700 text-[10px] uppercase tracking-wider flex items-center space-x-1 border-b pb-1">
              <span>🌳</span> <span>Ancestry Heritage Roots</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Sire (Father) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <ParentSelector value={editSire} onChange={(v) => { setEditSire(v); if (isFoundationStock(v)) setEditSirePct(100); }} onPick={(f) => setEditSirePct(parentBloodlinePct(f))} fowls={fowls} preferredGender="Male" placeholder="Foundation Stock" compact />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Dam (Mother) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <ParentSelector value={editDam} onChange={(v) => { setEditDam(v); if (isFoundationStock(v)) setEditDamPct(100); }} onPick={(f) => setEditDamPct(parentBloodlinePct(f))} fowls={fowls} preferredGender="Female" accent="amber" placeholder="Foundation Stock" compact />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Sire Purity (%) <span className="text-slate-400 font-normal lowercase">(parent&apos;s own bloodline)</span>
                </label>
                <input type="number" value={editSirePct} onChange={(e) => setEditSirePct(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 font-bold placeholder:text-neutral-400 placeholder:font-normal" placeholder="e.g. 100" min="0" max="100" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Dam Purity (%) <span className="text-slate-400 font-normal lowercase">(parent&apos;s own bloodline)</span>
                </label>
                <input type="number" value={editDamPct} onChange={(e) => setEditDamPct(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-neutral-900 font-bold placeholder:text-neutral-400 placeholder:font-normal" placeholder="e.g. 100" min="0" max="100" />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-xs shadow-md uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center space-x-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              <span>{loading ? 'Updating Fowl Node...' : 'Commit Node Updates'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
