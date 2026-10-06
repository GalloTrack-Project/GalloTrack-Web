'use client';
import React from 'react';
import { Pencil, Tag, Ruler, Calendar, TreePine, Lock, Edit3 } from 'lucide-react';
import type { FowlRecord, AgeParts } from '@/lib/types';
import ParentSelector from './ParentSelector';
import { formatBirdCodeForDisplay, validateIdentifierFormat, normalizeBirdCode } from '@/lib/bird-code';
import { useUnitPrefs, weightUnitLabel, heightUnitLabel } from '@/lib/units';
import { Modal } from '@/components/ui';

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
  setEditSirePct: (v: number | string) => void;
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
  setEditSirePct,
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
  const [manualCodeOpen, setManualCodeOpen] = React.useState(false);
  if (!editingFowl) return null;

  const isFoundationStock = (name: string): boolean => (name || '').trim().toLowerCase() === 'foundation stock';
  const parentBloodlinePct = (f: FowlRecord) => generationPurity(generationOf(f));

  return (
    <Modal
      open
      onClose={() => setEditingFowl(null)}
      title="Edit Node Registry"
      description={`Update parameters for ${editingFowl.name}`}
      icon={<Pencil className="w-5 h-5" />}
      className="max-w-lg"
    >

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
                            <button type="button" onClick={() => deleteCustomStrain(s)} aria-label={`Delete ${s}`} className="w-6 h-6 mr-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-danger hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer" title={`Delete "${s}"`}>✕</button>
                        )}
                      </div>
                  ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1" htmlFor="gender-class">Gender Class</label>
                <select value={editGender} onChange={(e) => { const g = e.target.value; setEditGender(g); if (editAge.trim() !== '' && !isNaN(Number(editAge))) { setEditGrowthStage(autoComputeGrowthStage(Number(editAge), g)); } else { setEditGrowthStage(''); } }} className="w-full p-2.5 border border-slate-200 dark:border-border rounded-md text-sm bg-white dark:bg-input font-bold text-slate-700 dark:text-card-foreground" id="gender-class">
                  <option value="Rooster">Sire</option>
                  <option value="Hen">Dam</option>
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
                        <button type="button" onClick={() => deleteCustomLegColor(s)} aria-label={`Delete ${s}`} className="w-6 h-6 mr-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-danger hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer" title={`Delete "${s}"`}>✕</button>
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
            {(() => {
              const hasSire = !!editSire.trim() && editSire.trim().toLowerCase() !== 'foundation stock';
              const hasDam = !!editDam.trim() && editDam.trim().toLowerCase() !== 'foundation stock';
              const isOffspring = hasSire || hasDam;
              const role: 'sire' | 'dam' | 'offspring' = isOffspring ? 'offspring' : editGender === 'Hen' || editGender === 'Female' ? 'dam' : 'sire';
              const formatCheck = editBirdCode.trim() ? validateIdentifierFormat(editBirdCode.trim(), role) : null;
              const isDuplicate = fowls.some(f => f.id !== editingFowl?.id && normalizeBirdCode(f.bird_code).toLowerCase() === normalizeBirdCode(editBirdCode).toLowerCase());

              return (
                <div className="bg-slate-50/80 dark:bg-muted/40 p-3 rounded-lg border border-slate-200/80 dark:border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 dark:text-card-foreground uppercase tracking-wider" htmlFor="chicken-code">
                      Unique Chicken Identifier
                    </label>
                    <button
                      type="button"
                      onClick={() => setManualCodeOpen(!manualCodeOpen)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{manualCodeOpen ? 'Lock Identifier' : 'Edit identifier manually'}</span>
                    </button>
                  </div>
                  {!manualCodeOpen ? (
                    <div className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 dark:border-border bg-white dark:bg-card">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-mono text-sm font-extrabold text-slate-800 dark:text-card-foreground">
                          [{formatBirdCodeForDisplay(editBirdCode) || '—'}]
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold">Permanent Assigned Code</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={editBirdCode}
                        onChange={(e) => setEditBirdCode(e.target.value)}
                        className="w-full p-2.5 border border-emerald-500 rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground font-mono font-bold focus:border-emerald-500"
                        placeholder="e.g. 1, A, 1A1"
                        id="chicken-code"
                      />
                      <div className="flex items-center justify-between text-xs font-semibold">
                        {editBirdCode.trim() ? (
                          formatCheck && !formatCheck.valid ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">⚠️ {formatCheck.error}</span>
                          ) : isDuplicate ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">❌ Already taken by another chicken</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Valid format for {role}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">Code is required</span>
                        )}
                      </div>
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded p-1.5">
                        ⚠️ Changing this will update the official registry code and will be logged in the history audit.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
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
      </Modal>
  );
}
