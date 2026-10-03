'use client';
import React from 'react';
import { Pencil, Tag, Ruler, Calendar, TreePine } from 'lucide-react';
import type { FowlRecord, AgeParts } from '@/lib/types';
import ParentSelector from './ParentSelector';
import { useUnitPrefs, weightUnitLabel, heightUnitLabel } from '@/lib/units';

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
  editBirdCode: string;
  setEditBirdCode: (v: string) => void;
  editWingBand: string;
  setEditWingBand: (v: string) => void;
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
  customStrainNames,
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
  editBehaviorTrait,
  setEditBehaviorTrait,
  editEyeVariant,
  setEditEyeVariant,
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
  editBirdCode,
  setEditBirdCode,
  editWingBand,
  setEditWingBand,
  handleEditBirthdateChange,
  handleEditAgeChange,
  autoComputeGrowthStage,
  getAgeParts,
  getAgeLabel,
  getAgeMetrics,
  generationOf,
  generationPurity,
}: EditFowlModalProps) {
  const unitPrefs = useUnitPrefs();
  if (!editingFowl) return null;

  const isFoundationStock = (name: string): boolean => (name || '').trim().toLowerCase() === 'foundation stock';
  const parentBloodlinePct = (f: FowlRecord) => generationPurity(generationOf(f));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-card rounded-lg w-full max-w-lg shadow-2xl border border-slate-200/80 dark:border-border overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-5 border-b border-slate-100 dark:border-border flex justify-between items-center bg-slate-50/50 dark:bg-muted/50">
          <div className="flex items-center space-x-2">
            <Pencil className="w-5 h-5 text-slate-600 dark:text-muted-foreground" />
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-card-foreground text-base">Edit Node Registry</h3>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Update parameters for {editingFowl.name}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setEditingFowl(null)}
            className="text-muted-foreground hover:text-slate-600 bg-slate-100 dark:bg-muted hover:bg-slate-200 p-2 rounded-md text-sm font-bold transition-all cursor-pointer"
          >
            ✕ Cancel
          </button>
        </div>

        <form onSubmit={handleUpdateFowl} className="overflow-y-auto p-6 space-y-4 text-sm">
          
          <div className="space-y-3 bg-slate-50/50 dark:bg-muted/50 p-4 rounded-lg border border-slate-200/40 dark:border-border">
            <h4 className="font-black text-emerald-700 dark:text-emerald-300 text-xs uppercase tracking-wider flex items-center space-x-1 border-b pb-1">
              <Tag className="w-3.5 h-3.5" /> <span>Core Identity</span>
            </h4>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="identifier-name">Identifier Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2.5 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground focus:border-emerald-500 font-medium" required id="identifier-name" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="behavior-trait">Behavior Trait</label>
              <input type="text" value={editBehaviorTrait} onChange={(e) => setEditBehaviorTrait(e.target.value)} className="w-full p-2.5 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground focus:border-emerald-500 font-medium" placeholder="e.g. aggressive, calm" id="behavior-trait" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative z-30">
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="genetic-strain">Genetic Strain</label>
                <input 
                  type="text"
                  value={editBreed}
                  onChange={(e) => setEditBreed(e.target.value)}
                  className="w-full p-2.5 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground focus:border-emerald-500 font-medium" 
                  placeholder="Select or type strain"
                  required 
                id="genetic-strain" />
                {availableStrains.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {availableStrains.filter((s) => s.toLowerCase().includes(editBreed.toLowerCase()) && s !== editBreed).slice(0, 5).map((s) => (
                      <div key={s} className="flex items-center bg-slate-100 dark:bg-muted rounded-full group">
                        <button type="button" onClick={() => setEditBreed(s)} className="text-xs font-bold px-2.5 py-1 text-slate-600 dark:text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer">{s}</button>
                        {customStrainNames.has(s) && (
                          <button type="button" onClick={() => deleteCustomStrain(s)} className="w-4 h-4 mr-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-danger hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-xs font-bold transition-all cursor-pointer" title={`Delete "${s}"`}>✕</button>
                        )}
                      </div>
                  ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="gender-class">Gender Class</label>
                <select value={editGender} onChange={(e) => { const g = e.target.value; setEditGender(g); if (editAge.trim() !== '' && !isNaN(Number(editAge))) { setEditGrowthStage(autoComputeGrowthStage(Number(editAge), g)); } else { setEditGrowthStage(''); } }} className="w-full p-2.5 border border-slate-200 dark:border-border rounded-md text-sm bg-white dark:bg-input font-bold text-slate-700 dark:text-card-foreground" id="gender-class">
                  <option value="Rooster">Sire (Rooster)</option>
                  <option value="Hen">Dam (Hen)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-slate-50/50 dark:bg-muted/50 p-4 rounded-lg border border-slate-200/40 dark:border-border">
            <h4 className="font-black text-emerald-700 dark:text-emerald-300 text-xs uppercase tracking-wider flex items-center space-x-1 border-b pb-1">
              <Ruler className="w-3.5 h-3.5" /> <span>Physical Parameters</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="color-group">Color Group</label>
                <select value={editColorCategory} onChange={(e) => { setEditColorCategory(e.target.value); setEditColor(e.target.value === 'Red' ? 'Bright Red' : 'Talisay / Grey'); }} className="w-full p-2.5 border border-slate-200 dark:border-border rounded-md text-sm bg-white dark:bg-input font-bold text-slate-700 dark:text-card-foreground" id="color-group">
                  <option value="Red">Red Class</option>
                  <option value="Light Color">Light Class</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="specific-tone">Specific Tone</label>
                <select value={editColor} onChange={(e) => setEditColor(e.target.value)} className="w-full p-2.5 border border-slate-200 dark:border-border rounded-md text-sm bg-white dark:bg-input text-slate-700 dark:text-card-foreground font-medium" id="specific-tone">
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
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="birth-date">Birth Date <span className="text-success dark:text-emerald-300 font-black">· auto age</span></label>
              <input type="date" value={editBirthdate} onChange={(e) => handleEditBirthdateChange(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full p-2.5 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground font-semibold focus:border-emerald-500" id="birth-date" />
              {(() => {
                const parts = getAgeParts(editBirthdate);
                return parts ? (
                  <p className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1"><Calendar className="w-3 h-3" /> Auto Age: {getAgeLabel(parts)} · <span className="font-mono">{getAgeMetrics(parts)}</span></p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground font-medium">Set a birth date for automatic age &amp; milestone tracking.</p>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="age-mos">Age (Mos) {editBirthdate && <span className="text-success dark:text-emerald-300 font-black">· auto</span>}</label>
                <input type="number" value={editBirthdate ? String((getAgeParts(editBirthdate)?.totalMonths ?? 0)) : editAge} onChange={(e) => handleEditAgeChange(e.target.value)} readOnly={!!editBirthdate} className="w-full p-2.5 border border-input-border rounded-md text-sm text-center font-bold bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground" required id="age-mos" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="growth">Growth</label>
                <input 
                  type="text" 
                  value={editGrowthStage} 
                  readOnly 
                  placeholder="Awaiting age..." 
                  className={`w-full p-2.5 border rounded-md text-sm text-center font-bold transition-all ${
                    editGrowthStage 
                      ? 'border-emerald-100 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300' 
                      : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/50 text-muted-foreground font-normal'
                  }`} 
                id="growth" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="height">Height ({heightUnitLabel(unitPrefs.heightUnit)})</label>
                <input type="number" step="0.1" min="0" value={editHeight} onChange={(e) => { const v = e.target.value; setEditHeight(v === '' ? '' : String(Math.round(Number(v) * 10) / 10)); }} className="no-spinner w-full p-2.5 border border-input-border rounded-md text-sm text-center font-bold bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground focus:border-emerald-500" placeholder="e.g. 45.0" id="height" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="weight">Weight ({weightUnitLabel(unitPrefs.weightUnit)})</label>
                <input type="number" step="0.1" min="0" value={editWeight} onChange={(e) => { const v = e.target.value; setEditWeight(v === '' ? '' : String(Math.round(Number(v) * 10) / 10)); }} className="no-spinner w-full p-2.5 border border-input-border rounded-md text-sm text-center font-bold bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground focus:border-emerald-500" placeholder="e.g. 2.0" id="weight" />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="leg-color">Leg Color</label>
              <input
                type="text"
                value={editLegColor}
                onChange={(e) => setEditLegColor(e.target.value)}
                className="w-full p-2.5 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground focus:border-emerald-500 font-medium"
                placeholder="Select or type a leg color..."
              id="leg-color" />
              {availableLegColors.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {availableLegColors.filter((s) => s.toLowerCase().includes(editLegColor.toLowerCase()) && s !== editLegColor).slice(0, 5).map((s) => (
                    <div key={s} className="flex items-center bg-slate-100 dark:bg-muted rounded-full group">
                      <button type="button" onClick={() => setEditLegColor(s)} className="text-xs font-bold px-2.5 py-1 text-slate-600 dark:text-muted-foreground hover:text-emerald-700 cursor-pointer">{s}</button>
                      <button type="button" onClick={() => deleteCustomLegColor(s)} className="w-4 h-4 mr-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-danger hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-xs font-bold transition-all cursor-pointer" title={`Delete "${s}"`}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 bg-slate-50/50 dark:bg-muted/50 p-4 rounded-lg border border-slate-200/40 dark:border-border">
            <h4 className="font-black text-emerald-700 dark:text-emerald-300 text-xs uppercase tracking-wider flex items-center space-x-1 border-b pb-1">
              <TreePine className="w-3.5 h-3.5" /> <span>Ancestry Heritage Roots</span>
            </h4>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="chicken-code">
                Chicken Code <span className="text-muted-foreground font-normal lowercase">(standardized tag — 1, 2, 3 = sire · A, B, C = dam · 1A1 = offspring)</span>
              </label>
              <input
                type="text"
                value={editBirdCode}
                onChange={(e) => setEditBirdCode(e.target.value)}
                className="w-full p-2.5 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground focus:border-emerald-500 font-mono font-bold"
                placeholder="e.g. 1, A, 1A1"
              id="chicken-code" />
              <p className="text-xs text-muted-foreground mt-1 font-semibold">Auto-generated kung walang ipinasok — dapat natatangi sa bawat ibon.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="wing-band-id">
                Wing Band ID <span className="text-muted-foreground font-normal lowercase">(numero sa metal wing band)</span>
              </label>
              <input
                type="text"
                value={editWingBand}
                onChange={(e) => setEditWingBand(e.target.value)}
                maxLength={24}
                className="w-full p-2.5 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground focus:border-emerald-500 font-mono font-bold"
                placeholder="e.g. W-001"
              id="wing-band-id" />
              <p className="text-xs text-muted-foreground mt-1 font-semibold">Physical ID sa pakpak — dapat natatangi sa buong farm.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                  <label htmlFor="edit-sire" className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Sire (Father) <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                  </label>
                  <ParentSelector id="edit-sire" value={editSire} onChange={(v) => { setEditSire(v); if (isFoundationStock(v)) setEditSirePct(100); }} onPick={(f) => setEditSirePct(parentBloodlinePct(f))} fowls={fowls} preferredGender="Male" placeholder="Foundation Stock" compact />
              </div>
              <div>
                  <label htmlFor="edit-dam" className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Dam (Mother) <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                  </label>
                  <ParentSelector id="edit-dam" value={editDam} onChange={(v) => { setEditDam(v); if (isFoundationStock(v)) setEditDamPct(100); }} onPick={(f) => setEditDamPct(parentBloodlinePct(f))} fowls={fowls} preferredGender="Female" accent="amber" placeholder="Foundation Stock" compact />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="sire-purity">
                  Sire Purity (%)
                </label>
                <input type="number" value={editSirePct} onChange={(e) => { if (e.target.value === '') { setEditSirePct(''); } else { setEditSirePct(Math.min(Number(e.target.value), 100)); } }} className="w-full p-2.5 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground font-bold placeholder:text-muted-foreground placeholder:font-normal" placeholder="e.g. 60" min="0" max="100" id="sire-purity" />
                <p className="text-xs text-muted-foreground mt-1 font-semibold">Dapat mag-total ng 100% kasama ang Dam</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="dam-purity">
                  Dam Purity (%)
                </label>
                <input type="number" value={editDamPct} onChange={(e) => { if (e.target.value === '') { setEditDamPct(''); } else { setEditDamPct(Math.min(Number(e.target.value), 100)); } }} className="w-full p-2.5 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground font-bold placeholder:text-muted-foreground placeholder:font-normal" placeholder="e.g. 40" min="0" max="100" id="dam-purity" />
                <p className="text-xs text-muted-foreground mt-1 font-semibold">Dapat mag-total ng 100% kasama ang Sire</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-md text-sm shadow-md uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center space-x-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              <span>{loading ? 'Updating Chicken Node...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
