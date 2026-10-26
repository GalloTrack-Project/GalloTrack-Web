'use client';
import React from 'react';
import { Pencil, Tag, Ruler, Calendar, TreePine, Lock, Edit3, RotateCcw } from 'lucide-react';
import type { FowlRecord, AgeParts, DeclaredBreedShare } from '@/lib/types';
import ParentSelector from './ParentSelector';
import DeclaredCompositionEditor from '@/components/profiling/DeclaredCompositionEditor';
import {
  getDescendantFowls,
  validateDeclaredComposition,
  computePedigreeComposition,
  type BloodlineComposition,
} from '@/lib/bloodline-composition';
import { getCompositionSource } from '@/lib/breeding-classification';
import {
  formatBirdCodeForDisplay,
  validateIdentifierFormat,
  normalizeBirdCode,
  previewBirdCode,
} from '@/lib/bird-code';
import { bloodlineOf, isCustomOption, normalizeOptionValue } from '@/lib/helpers';
import { GENDER_CLASS_OPTIONS } from '@/lib/gender-class';
import { useT } from '@/lib/i18n';
import { useRegistryOptions } from '@/lib/hooks/use-registry-options';
import { mergeOptions } from '@/lib/lifecycle';
import { useUnitPrefs, weightUnitLabel, heightUnitLabel } from '@/lib/units';
import { validateOffspringBirthdate, type BirthdateValidationResult } from '@/lib/registry-roles';
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
  editDeclaredComposition?: DeclaredBreedShare[] | null;
  setEditDeclaredComposition?: (v: DeclaredBreedShare[] | null) => void;
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
  editDeclaredComposition,
  setEditDeclaredComposition,
  handleEditBirthdateChange,
  handleEditAgeChange,
  autoComputeGrowthStage,
  getAgeParts,
  getAgeLabel,
  getAgeMetrics,
  generationOf,
  generationPurity,
}: EditFowlModalProps) {
  const { t } = useT();
  const unitPrefs = useUnitPrefs();
  const [manualCodeOpen, setManualCodeOpen] = React.useState(false);

  const { rows: registryOptionRows } = useRegistryOptions();
  const baseColorOptions = React.useMemo(
    () => mergeOptions(registryOptionRows, 'feather_color'),
    [registryOptionRows],
  );
  const baseTraitOptions = React.useMemo(
    () => mergeOptions(registryOptionRows, 'trait'),
    [registryOptionRows],
  );
  const featherColorOptions = React.useMemo(
    () => mergeOptions(registryOptionRows, 'feather_color', editColor),
    [registryOptionRows, editColor],
  );
  const traitOptions = React.useMemo(
    () => mergeOptions(registryOptionRows, 'trait', editBehaviorTrait),
    [registryOptionRows, editBehaviorTrait],
  );
  const isCustomColor = isCustomOption(
    editColor,
    baseColorOptions.map((o) => o.value),
  );
  const isCustomTrait = isCustomOption(
    editBehaviorTrait,
    baseTraitOptions.map((o) => o.value),
  );

  const hasSire = !!editSire.trim() && editSire.trim().toLowerCase() !== 'foundation stock';
  const hasDam = !!editDam.trim() && editDam.trim().toLowerCase() !== 'foundation stock';
  const isOffspring = hasSire || hasDam;

  const descendants = React.useMemo(() => {
    if (!editingFowl) return [];
    return getDescendantFowls(editingFowl, fowls ?? []);
  }, [editingFowl, fowls]);

  const pedigreeComposition = React.useMemo<BloodlineComposition | null>(() => {
    if (!editingFowl) return null;
    const draft: FowlRecord = {
      ...editingFowl,
      breed: editBreed,
      sire: editSire,
      dam: editDam,
    };
    return computePedigreeComposition(draft, fowls ?? []);
  }, [editingFowl, editBreed, editSire, editDam, fowls]);

  const compositionSource = React.useMemo(() => {
    if (!editingFowl) return 'assumed';
    return getCompositionSource(editingFowl);
  }, [editingFowl]);

  const declaredChanged = React.useMemo(() => {
    if (!editingFowl) return false;
    const prev = JSON.stringify(editingFowl.declared_composition ?? null);
    const curr = JSON.stringify(
      editDeclaredComposition && editDeclaredComposition.length > 0
        ? editDeclaredComposition
        : null,
    );
    return prev !== curr;
  }, [editingFowl, editDeclaredComposition]);

  const declaredValidation = React.useMemo(() => {
    if (!editDeclaredComposition || editDeclaredComposition.length === 0) {
      return { valid: true };
    }
    return validateDeclaredComposition(editDeclaredComposition, editBreed, availableStrains ?? [], {
      isOffspring,
      pedigreeComposition,
    });
  }, [isOffspring, editDeclaredComposition, editBreed, availableStrains, pedigreeComposition]);

  const birthdateValidation = React.useMemo<BirthdateValidationResult>(
    () =>
      editingFowl
        ? validateOffspringBirthdate(editBirthdate, editSire, editDam, fowls ?? [])
        : { valid: true, errors: [], warnings: [] },
    [editingFowl, editBirthdate, editSire, editDam, fowls],
  );

  if (!editingFowl) return null;

  const isFoundationStock = (name: string): boolean =>
    (name || '').trim().toLowerCase() === 'foundation stock';
  const parentBloodlinePct = (f: FowlRecord) => bloodlineOf(f, fowls);

  return (
    <Modal
      open
      onClose={() => setEditingFowl(null)}
      title="Edit Node Registry"
      description={`Update parameters for ${editingFowl.name}`}
      icon={<Pencil className="h-5 w-5" />}
      className="max-w-lg"
    >
      <form
        onSubmit={(e) => {
          if (!birthdateValidation.valid) {
            e.preventDefault();
            return;
          }
          handleUpdateFowl(e);
        }}
        className="space-y-4 overflow-y-auto p-6 text-sm"
      >
        <div className="dark:bg-muted/50 dark:border-border space-y-3 rounded-lg border border-slate-200/40 bg-slate-50/50 p-4">
          <h4 className="flex items-center space-x-1 border-b pb-1 text-xs font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
            <Tag className="h-3.5 w-3.5" /> <span>Core Identity</span>
          </h4>
          <div>
            <label
              className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
              htmlFor="identifier-name"
            >
              Identifier Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 text-sm font-medium text-neutral-900 focus:border-emerald-500"
              required
              id="identifier-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative z-30">
              <label
                className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
                htmlFor="genetic-strain"
              >
                Genetic Strain
              </label>
              <input
                type="text"
                value={editBreed}
                onChange={(e) => setEditBreed(e.target.value)}
                className="border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 text-sm font-medium text-neutral-900 focus:border-emerald-500"
                placeholder="Select or type strain"
                required
                id="genetic-strain"
              />
              {availableStrains.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {availableStrains
                    .filter(
                      (s) => s.toLowerCase().includes(editBreed.toLowerCase()) && s !== editBreed,
                    )
                    .slice(0, 5)
                    .map((s) => (
                      <div
                        key={s}
                        className="dark:bg-muted group flex items-center rounded-full bg-slate-100"
                      >
                        <button
                          type="button"
                          onClick={() => setEditBreed(s)}
                          className="dark:text-muted-foreground cursor-pointer px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-emerald-700 dark:hover:text-emerald-300"
                        >
                          {s}
                        </button>
                        {customStrainNames.has(s) && (
                          <button
                            type="button"
                            onClick={() => deleteCustomStrain(s)}
                            aria-label={`Delete ${s}`}
                            className="text-danger mr-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-xs font-bold transition-colors hover:border-rose-600 hover:bg-rose-600 hover:text-white dark:border-rose-900/60 dark:bg-rose-950/50"
                            title={`Delete "${s}"`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div>
              <label
                className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
                htmlFor="gender-class"
              >
                {t('registry.genderClass')}
              </label>
              <select
                value={editGender}
                onChange={(e) => {
                  const g = e.target.value;
                  setEditGender(g);
                  if (editAge.trim() !== '' && !isNaN(Number(editAge))) {
                    setEditGrowthStage(autoComputeGrowthStage(Number(editAge), g));
                  } else {
                    setEditGrowthStage('');
                  }
                }}
                className="dark:border-border dark:bg-input dark:text-card-foreground w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm font-bold text-slate-700"
                id="gender-class"
              >
                {GENDER_CLASS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isOffspring && (
            <div className="mt-3">
              <DeclaredCompositionEditor
                registeredBreed={editBreed}
                availableBreeds={availableStrains ?? []}
                value={editDeclaredComposition ?? null}
                onChange={(val) => setEditDeclaredComposition?.(val)}
                hasParents={false}
                currentValue={editingFowl.declared_composition as any}
                source={compositionSource}
              />
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
                htmlFor="edit-feather-color"
              >
                Feather Color
                {isCustomColor && (
                  <span className="ml-2 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-bold tracking-normal text-amber-700 normal-case dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
                    custom
                  </span>
                )}
              </label>
              <input
                type="text"
                list="edit-feather-color-options"
                value={editColor}
                onChange={(e) => {
                  const c = e.target.value;
                  setEditColor(c);
                  setEditColorCategory(c.toLowerCase().includes('red') ? 'Red' : 'Light Color');
                }}
                onBlur={() => {
                  if (editColor) {
                    setEditColor(
                      normalizeOptionValue(
                        editColor,
                        featherColorOptions.map((o) => o.value),
                      ),
                    );
                  }
                }}
                placeholder="Select or enter feather color..."
                className="border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 text-sm font-medium text-neutral-900 focus:border-emerald-500"
                id="edit-feather-color"
              />
              <datalist id="edit-feather-color-options">
                {featherColorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label || opt.value}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label
                className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
                htmlFor="edit-behavior-trait"
              >
                Trait
                {isCustomTrait && (
                  <span className="ml-2 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-bold tracking-normal text-amber-700 normal-case dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
                    custom
                  </span>
                )}
              </label>
              <input
                type="text"
                list="edit-trait-options"
                value={editBehaviorTrait}
                onChange={(e) => setEditBehaviorTrait(e.target.value)}
                onBlur={() => {
                  if (editBehaviorTrait) {
                    setEditBehaviorTrait(
                      normalizeOptionValue(
                        editBehaviorTrait,
                        traitOptions.map((o) => o.value),
                      ),
                    );
                  }
                }}
                placeholder="Select or enter trait..."
                className="border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 text-sm font-medium text-neutral-900 focus:border-emerald-500"
                id="edit-behavior-trait"
              />
              <datalist id="edit-trait-options">
                {traitOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label || opt.value}
                  </option>
                ))}
              </datalist>
            </div>
          </div>
        </div>

        <div className="dark:bg-muted/50 dark:border-border space-y-3 rounded-lg border border-slate-200/40 bg-slate-50/50 p-4">
          <h4 className="flex items-center space-x-1 border-b pb-1 text-xs font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
            <Ruler className="h-3.5 w-3.5" /> <span>Physical Parameters</span>
          </h4>
          <div className="mb-2">
            <label
              className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
              htmlFor="birth-date"
            >
              Birth Date{' '}
              <span className="text-success font-black dark:text-emerald-300">· auto age</span>
            </label>
            <input
              type="date"
              value={editBirthdate}
              onChange={(e) => handleEditBirthdateChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={`dark:bg-input dark:text-foreground w-full rounded-md border bg-white p-2.5 text-sm font-semibold text-neutral-900 ${
                birthdateValidation.errors.length > 0
                  ? 'border-rose-500 focus:border-rose-500'
                  : 'border-input-border focus:border-emerald-500'
              }`}
              id="birth-date"
            />
            {birthdateValidation.errors.map((err, i) => (
              <p
                key={`edit-bd-err-${i}`}
                className="mt-1 flex items-center gap-1.5 rounded-sm border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
              >
                <span>⚠️</span>
                <span>{err}</span>
              </p>
            ))}
            {birthdateValidation.warnings.map((warn, i) => (
              <p
                key={`edit-bd-warn-${i}`}
                className="mt-1 flex items-center gap-1.5 rounded-sm border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300"
              >
                <span>⚠️</span>
                <span>{warn}</span>
              </p>
            ))}
            {(() => {
              const parts = getAgeParts(editBirthdate);
              return parts ? (
                <p className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <Calendar className="h-3 w-3" /> Auto Age: {getAgeLabel(parts)} ·{' '}
                  <span className="font-mono">{getAgeMetrics(parts)}</span>
                </p>
              ) : (
                <p className="text-muted-foreground mt-1 text-xs font-medium">
                  Set a birth date for automatic age &amp; milestone tracking.
                </p>
              );
            })()}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label
                className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
                htmlFor="age-mos"
              >
                Age (Mos){' '}
                {editBirthdate && (
                  <span className="text-success font-black dark:text-emerald-300">· auto</span>
                )}
              </label>
              <input
                type="number"
                value={
                  editBirthdate ? String(getAgeParts(editBirthdate)?.totalMonths ?? 0) : editAge
                }
                onChange={(e) => handleEditAgeChange(e.target.value)}
                readOnly={!!editBirthdate}
                className="border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 text-center text-sm font-bold text-neutral-900"
                required
                id="age-mos"
              />
            </div>
            <div>
              <label
                className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
                htmlFor="growth"
              >
                Growth
              </label>
              <input
                type="text"
                value={editGrowthStage}
                readOnly
                placeholder="Awaiting age..."
                className={`w-full rounded-md border p-2.5 text-center text-sm font-bold transition-all ${
                  editGrowthStage
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'dark:border-border dark:bg-muted/50 text-muted-foreground border-slate-200 bg-slate-50 font-normal'
                }`}
                id="growth"
              />
            </div>
            <div>
              <label
                className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
                htmlFor="height"
              >
                Height ({heightUnitLabel(unitPrefs.heightUnit)})
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={editHeight}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditHeight(v === '' ? '' : String(Math.round(Number(v) * 10) / 10));
                }}
                className="no-spinner border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 text-center text-sm font-bold text-neutral-900 focus:border-emerald-500"
                placeholder="e.g. 45.0"
                id="height"
              />
            </div>
            <div>
              <label
                className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
                htmlFor="weight"
              >
                Weight ({weightUnitLabel(unitPrefs.weightUnit)})
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={editWeight}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditWeight(v === '' ? '' : String(Math.round(Number(v) * 10) / 10));
                }}
                className="no-spinner border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 text-center text-sm font-bold text-neutral-900 focus:border-emerald-500"
                placeholder="e.g. 2.0"
                id="weight"
              />
            </div>
          </div>
          <div className="mt-2">
            <label
              className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
              htmlFor="leg-color"
            >
              Leg Color
            </label>
            <input
              type="text"
              value={editLegColor}
              onChange={(e) => setEditLegColor(e.target.value)}
              className="border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 text-sm font-medium text-neutral-900 focus:border-emerald-500"
              placeholder="Select or type a leg color..."
              id="leg-color"
            />
            {availableLegColors.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {availableLegColors
                  .filter(
                    (s) =>
                      s.toLowerCase().includes(editLegColor.toLowerCase()) && s !== editLegColor,
                  )
                  .slice(0, 5)
                  .map((s) => (
                    <div
                      key={s}
                      className="dark:bg-muted group flex items-center rounded-full bg-slate-100"
                    >
                      <button
                        type="button"
                        onClick={() => setEditLegColor(s)}
                        className="dark:text-muted-foreground cursor-pointer px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-emerald-700"
                      >
                        {s}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCustomLegColor(s)}
                        aria-label={`Delete ${s}`}
                        className="text-danger mr-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-xs font-bold transition-colors hover:border-rose-600 hover:bg-rose-600 hover:text-white dark:border-rose-900/60 dark:bg-rose-950/50"
                        title={`Delete "${s}"`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="dark:bg-muted/50 dark:border-border space-y-3 rounded-lg border border-slate-200/40 bg-slate-50/50 p-4">
          <h4 className="flex items-center space-x-1 border-b pb-1 text-xs font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
            <TreePine className="h-3.5 w-3.5" /> <span>Ancestry Heritage Roots</span>
          </h4>
          {(() => {
            const hasSire =
              !!editSire.trim() && editSire.trim().toLowerCase() !== 'foundation stock';
            const hasDam = !!editDam.trim() && editDam.trim().toLowerCase() !== 'foundation stock';
            const isOffspring = hasSire || hasDam;
            const role: 'sire' | 'dam' | 'offspring' = isOffspring
              ? 'offspring'
              : editGender === 'Hen' || editGender === 'Female'
                ? 'dam'
                : 'sire';
            const formatCheck = editBirdCode.trim()
              ? validateIdentifierFormat(editBirdCode.trim(), role)
              : null;
            const isDuplicate = fowls.some(
              (f) =>
                f.id !== editingFowl?.id &&
                normalizeBirdCode(f.bird_code).toLowerCase() ===
                  normalizeBirdCode(editBirdCode).toLowerCase(),
            );

            return (
              <div className="dark:bg-muted/40 dark:border-border space-y-2 rounded-lg border border-slate-200/80 bg-slate-50/80 p-3">
                <div className="flex items-center justify-between">
                  <label
                    className="dark:text-card-foreground block text-xs font-black tracking-wider text-slate-800 uppercase"
                    htmlFor="chicken-code"
                  >
                    Unique Chicken Identifier
                  </label>
                  <button
                    type="button"
                    onClick={() => setManualCodeOpen(!manualCodeOpen)}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>{manualCodeOpen ? 'Lock Identifier' : 'Edit identifier manually'}</span>
                  </button>
                </div>
                {!manualCodeOpen ? (
                  <div className="dark:border-border dark:bg-card flex items-center justify-between rounded-md border border-slate-200 bg-white p-2.5">
                    <div className="flex items-center gap-2">
                      <Lock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <span className="dark:text-card-foreground font-mono text-sm font-extrabold text-slate-800">
                        [{formatBirdCodeForDisplay(editBirdCode) || '—'}]
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs font-semibold">
                      Permanent Assigned Code
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={editBirdCode}
                      onChange={(e) => setEditBirdCode(e.target.value)}
                      className="dark:bg-input dark:text-foreground w-full rounded-md border border-emerald-500 bg-white p-2.5 font-mono text-sm font-bold text-neutral-900 focus:border-emerald-500"
                      placeholder="e.g. 1, A, 1A1"
                      id="chicken-code"
                    />
                    <div className="flex items-center justify-between text-xs font-semibold">
                      {editBirdCode.trim() ? (
                        formatCheck && !formatCheck.valid ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            ⚠️ {formatCheck.error}
                          </span>
                        ) : isDuplicate ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            ❌ Already taken by another chicken
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            ✓ Valid format for {role}
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground">Code is required</span>
                      )}
                    </div>
                    <p className="rounded border border-amber-200 bg-amber-50 p-1.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                      ⚠️ Changing this will update the official registry code and will be logged in
                      the history audit.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          {(() => {
            const trimmedBand = editWingBand.trim();
            const isBandDuplicate = trimmedBand
              ? fowls.some(
                  (f) =>
                    f.id !== editingFowl?.id &&
                    (f.wing_band || '').trim().toLowerCase() === trimmedBand.toLowerCase(),
                )
              : false;

            return (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label
                    className="text-muted-foreground block text-xs font-bold uppercase"
                    htmlFor="wing-band-id"
                  >
                    Wing Banding{' '}
                    <span className="text-muted-foreground font-normal lowercase">
                      (optional — number on metal wing band; must be unique if provided)
                    </span>
                  </label>
                </div>
                <input
                  type="text"
                  value={editWingBand}
                  onChange={(e) => setEditWingBand(e.target.value)}
                  maxLength={50}
                  className="border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 font-mono text-sm font-bold text-neutral-900 focus:border-emerald-500"
                  placeholder="e.g. W-001"
                  id="wing-band-id"
                />
                {isBandDuplicate && (
                  <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                    ❌ Wing Banding &quot;{trimmedBand}&quot; is already assigned to another
                    chicken.
                  </p>
                )}
                <p className="text-muted-foreground mt-1 text-xs font-semibold">
                  {trimmedBand
                    ? 'Optional — physical metal wing band number (must be unique if provided).'
                    : 'Optional — the number stamped on the physical metal wing band.'}
                </p>
              </div>
            );
          })()}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="edit-sire"
                className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
              >
                Sire (Father){' '}
                <span className="text-muted-foreground font-normal lowercase">(optional)</span>
              </label>
              <ParentSelector
                id="edit-sire"
                value={editSire}
                onChange={(v) => {
                  setEditSire(v);
                  if (isFoundationStock(v)) setEditSirePct(100);
                }}
                onPick={(f) => setEditSirePct(parentBloodlinePct(f))}
                fowls={fowls}
                preferredGender="Male"
                placeholder="Foundation Stock"
                compact
              />
            </div>
            <div>
              <label
                htmlFor="edit-dam"
                className="text-muted-foreground mb-1 block text-xs font-bold uppercase"
              >
                Dam (Mother){' '}
                <span className="text-muted-foreground font-normal lowercase">(optional)</span>
              </label>
              <ParentSelector
                id="edit-dam"
                value={editDam}
                onChange={(v) => {
                  setEditDam(v);
                  if (isFoundationStock(v)) setEditDamPct(100);
                }}
                onPick={(f) => setEditDamPct(parentBloodlinePct(f))}
                fowls={fowls}
                preferredGender="Female"
                accent="amber"
                placeholder="Foundation Stock"
                compact
              />
            </div>
          </div>

          {isOffspring && (
            <div className="pt-2">
              <DeclaredCompositionEditor
                registeredBreed={editBreed}
                availableBreeds={availableStrains ?? []}
                value={editDeclaredComposition ?? null}
                onChange={(val) => setEditDeclaredComposition?.(val)}
                hasParents={true}
                pedigreeComposition={pedigreeComposition}
                currentValue={editingFowl.declared_composition as any}
                calculatedValue={pedigreeComposition}
                source={compositionSource}
              />
            </div>
          )}
        </div>

        {declaredChanged && descendants.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <span className="shrink-0 text-base">⚠️</span>
            <div className="w-full">
              <p className="font-bold">
                Descendant Bloodline Recomputation ({descendants.length} chicken
                {descendants.length === 1 ? '' : 's'})
              </p>
              <p className="mt-0.5 leading-relaxed">
                Changing this bird&apos;s breed composition will automatically recompute the
                bloodline of its {descendants.length} descendant
                {descendants.length === 1 ? '' : 's'}.
              </p>
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-semibold text-amber-800 hover:underline dark:text-amber-300">
                  View affected descendants ({descendants.length})
                </summary>
                <p className="mt-1 max-h-28 overflow-y-auto rounded-md bg-amber-100/60 p-2 font-mono font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  {descendants.map((d) => d.name).join(', ')}
                </p>
              </details>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !birthdateValidation.valid || !declaredValidation.valid}
            className="flex w-full cursor-pointer items-center justify-center space-x-2 rounded-md bg-slate-900 py-3.5 text-sm font-extrabold tracking-wider text-white uppercase shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            )}
            <span>{loading ? 'Updating Chicken Node...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
