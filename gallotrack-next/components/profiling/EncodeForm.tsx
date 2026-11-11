'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { FowlRecord, DeclaredBreedShare } from '@/lib/types';
import {
  validateDeclaredComposition,
  computePedigreeComposition,
  type BloodlineStats,
  type BloodlineComposition,
} from '@/lib/bloodline-composition';
import ParentSelector from '@/components/modals/ParentSelector';
import BloodlineBreakdown from '@/components/BloodlineBreakdown';
import DeclaredCompositionEditor from './DeclaredCompositionEditor';
import { useUnitPrefs, weightUnitLabel, heightUnitLabel } from '@/lib/units';
import {
  formatBirdCodeForDisplay,
  validateIdentifierFormat,
  checkParentageMatch,
  normalizeBirdCode,
} from '@/lib/bird-code';
import { isFoundationStock, isCustomOption, normalizeOptionValue } from '@/lib/helpers';
import { GENDER_CLASS_OPTIONS } from '@/lib/gender-class';
import { useRegistryOptions } from '@/lib/hooks/use-registry-options';
import { mergeOptions } from '@/lib/lifecycle';
import { validateOffspringBirthdate } from '@/lib/registry-roles';
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Edit3,
  Lock,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import ChickenPhotoField from '@/components/ChickenPhotoField';
import { useFowlFormStateOptional } from '@/lib/contexts/fowl-form-context';
import type { DraftRestoreResult } from '@/lib/fowl-draft';
import { ValidationSummaryPanel } from './validation/ValidationSummaryPanel';
import type { StatusTone, ValidationFieldItem } from './validation/types';

type Props = {
  fowls: FowlRecord[];
  newName: string;
  setNewName: (v: string) => void;
  newBreed: string;
  setNewBreed: (v: string) => void;
  newGender: string;
  setNewGender: (v: string) => void;
  newColor?: string;
  setNewColor?: (v: string) => void;
  newBehaviorTrait?: string;
  setNewBehaviorTrait?: (v: string) => void;
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
  birdCode: string;
  setBirdCode: (v: string) => void;
  wingBand: string;
  setWingBand: (v: string) => void;
  newDeclaredComposition?: DeclaredBreedShare[] | null;
  setNewDeclaredComposition?: (v: DeclaredBreedShare[] | null) => void;
  suggestedBirdCode: string;
  previewBloodlineStats: BloodlineStats | null;
  selectedImage: File | null;
  setSelectedImage: (f: File | null) => void;
  imagePreview: string;
  setImagePreview: (v: string) => void;
  strainQuery: string;
  setStrainQuery: (v: string) => void;
  strainOpen: boolean;
  setStrainOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  availableStrains: string[];
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
  autoCalcAge: boolean;
  getAutoCalcAge: () => boolean;
  canEditPhoto?: boolean;
  /** Opens the Breed Registry without leaving the registration form. */
  onAddBreeds?: () => void;
  /** Restores a saved registration draft on mount. */
  restoreDraft?: () => DraftRestoreResult;
  /** Clears the draft and leaves the registration form. */
  onCancel?: () => void;
};

export default function EncodeForm({
  fowls,
  newName, setNewName,
  newBreed, setNewBreed,
  newGender, setNewGender,
  newBirthdate, handleNewBirthdateChange,
  age, handleAgeChange,
  newGrowthStage, setNewGrowthStage,
  height, setHeight,
  weight, setWeight,
  setNewLegColor,
  availableLegColors,
  customLegColorNames,
  deleteCustomLegColor,
  legColorQuery, setLegColorQuery,
  legColorOpen, setLegColorOpen,
  sireName, setSireName,
  damName, setDamName,
  birdCode, setBirdCode,
  wingBand, setWingBand,
  newDeclaredComposition,
  setNewDeclaredComposition,
  suggestedBirdCode, previewBloodlineStats,
  selectedImage, setSelectedImage,
  setImagePreview,
  strainQuery, setStrainQuery,
  strainOpen, setStrainOpen,
  availableStrains,
  selectedStrains, addStrain, removeStrain,
  loading, uploadingImage,
  nextNodeId, dataCompleteness,
  validationPassed, bloodlineVerified,
  computedBloodlinePct, offspringGenInfo,
  sireGenInfo, damGenInfo,
  sireGen, damGen,
  generationPurity,
  handleAddFowl,
  autoCalcAge,
  getAutoCalcAge,
  canEditPhoto = true,
  onAddBreeds,
  restoreDraft,
  onCancel,
  newColor = '',
  setNewColor,
  newBehaviorTrait = '',
  setNewBehaviorTrait,
}: Props) {
  const { t } = useT();
  const unitPrefs = useUnitPrefs();
  const photoForm = useFowlFormStateOptional();
  const hasAnyParent = sireName.trim() !== '' || damName.trim() !== '';
  const strainInputRef = useRef<HTMLDivElement>(null);
  const strainInputElRef = useRef<HTMLInputElement>(null);
  const legColorInputRef = useRef<HTMLDivElement>(null);
  const [strainDropdownPos, setStrainDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [legColorDropdownPos, setLegColorDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [strainError, setStrainError] = useState<string | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [draftNotice, setDraftNotice] = useState<{ photoSelected: boolean } | null>(null);
  const draftRestoredRef = useRef(false);

  useEffect(() => {
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    const result = restoreDraft?.();
    if (result?.restored) {
      setDraftNotice({ photoSelected: result.photoSelected });
    }
  }, [restoreDraft]);

  const birthdateValidation = useMemo(
    () => validateOffspringBirthdate(newBirthdate, sireName, damName, fowls),
    [newBirthdate, sireName, damName, fowls],
  );

  const hasSire = !!sireName.trim() && sireName.trim().toLowerCase() !== 'foundation stock';
  const hasDam = !!damName.trim() && damName.trim().toLowerCase() !== 'foundation stock';
  const isOffspring = hasSire || hasDam;
  const currentRole: 'sire' | 'dam' | 'offspring' = isOffspring
    ? 'offspring'
    : newGender === 'Hen' || newGender === 'Female'
      ? 'dam'
      : 'sire';

  const effectiveBreed = selectedStrains.length > 0 ? selectedStrains.join(', ') : newBreed.trim();

  useEffect(() => {
    const trimmed = newBreed.trim();
    if (!trimmed) return;
    const match = availableStrains.find((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (match && match !== newBreed) setNewBreed(match);
  }, [availableStrains, newBreed, setNewBreed]);

  const focusStrainField = () => {
    const input = strainInputElRef.current;
    if (!input) return;
    input.focus();
    input.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  };

  const handleStrainChange = (value: string) => {
    setStrainQuery(value);
    const trimmed = value.trim();
    const registered = availableStrains.find((s) => s.toLowerCase() === trimmed.toLowerCase());
    setNewBreed(registered ?? value);
    setStrainOpen(true);
    if (trimmed) setStrainError(null);
  };

  const commitStrain = (options: { focusOnError?: boolean } = {}) => {
    const trimmed = strainQuery.trim();
    if (!trimmed) {
      if (selectedStrains.length === 0) {
        setStrainError(t('registry.strainRequired'));
        if (options.focusOnError) focusStrainField();
      }
      setNewBreed('');
      setStrainQuery('');
      setStrainOpen(false);
      return;
    }
    if (loading) {
      setNewBreed(trimmed);
      setStrainOpen(false);
      return;
    }
    const registered = availableStrains.find((s) => s.toLowerCase() === trimmed.toLowerCase());
    addStrain(registered ?? trimmed);
    setStrainError(null);
    setStrainOpen(false);
  };

  const selectStrainOption = (strain: string) => {
    addStrain(strain);
    setStrainError(null);
    setStrainOpen(false);
  };

  const handleStrainBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const next = event.relatedTarget as HTMLElement | null;
    commitStrain({ focusOnError: next?.tagName !== 'A' });
  };

  const handleAddBreed = () => {
    setStrainOpen(false);
    onAddBreeds?.();
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    if (photoProcessing || uploadingImage || loading) {
      event.preventDefault();
      return;
    }
    const breedValue = selectedStrains.length > 0 ? selectedStrains.join(', ') : newBreed.trim();
    if (!breedValue) {
      setStrainError(t('registry.strainRequired'));
      focusStrainField();
    } else {
      setStrainError(null);
    }
    if (!birthdateValidation.valid) {
      event.preventDefault();
      return;
    }
    handleAddFowl(event);
  };

  const pedigreeComposition = useMemo<BloodlineComposition | null>(() => {
    if (!hasAnyParent) return null;
    const draft = {
      id: -1,
      name: newName.trim() || '__preview__',
      breed: effectiveBreed,
      gender: newGender,
      sire: sireName,
      dam: damName,
    } as FowlRecord;
    return computePedigreeComposition(draft, fowls);
  }, [hasAnyParent, newName, effectiveBreed, newGender, sireName, damName, fowls]);

  const declaredValidation = useMemo(() => {
    if (!newDeclaredComposition || newDeclaredComposition.length === 0) {
      return { valid: true };
    }
    return validateDeclaredComposition(newDeclaredComposition, effectiveBreed, availableStrains, {
      isOffspring,
      pedigreeComposition,
    });
  }, [isOffspring, newDeclaredComposition, effectiveBreed, availableStrains, pedigreeComposition]);

  const requiredFields: ValidationFieldItem[] = [
    {
      key: 'name',
      label: t('registry.identifierName'),
      complete: newName.trim().length > 0,
      targetId: 'identifier-name',
    },
    {
      key: 'strain',
      label: t('registry.geneticStrain'),
      complete: effectiveBreed.length > 0,
      targetId: 'genetic-strain',
    },
    {
      key: 'gender',
      label: t('registry.genderClass'),
      complete: newGender.trim().length > 0,
      targetId: 'gender-class',
    },
    {
      key: 'birthdate',
      label: t('registry.birthDate'),
      complete: newBirthdate.trim().length > 0,
      targetId: 'birth-date',
    },
  ];

  const missingCount = requiredFields.filter((field) => !field.complete).length;
  const requiredComplete = missingCount === 0;
  const birthdateError = birthdateValidation.errors[0];
  const declaredError = !declaredValidation.valid
    ? ('error' in declaredValidation && declaredValidation.error) || t('registry.registerBlockedDetails')
    : undefined;

  const validationOk =
    requiredComplete
    && validationPassed
    && birthdateValidation.valid
    && declaredValidation.valid;

  const validationTone: StatusTone = validationOk
    ? 'success'
    : birthdateError || declaredError
      ? 'error'
      : requiredComplete
        ? 'pending'
        : 'warning';

  const validationLabel = validationOk
    ? t('registry.validationReady')
    : validationTone === 'error'
      ? t('registry.validationNeedsAttention')
      : validationTone === 'pending'
        ? t('registry.validationPending')
        : t('registry.requiredFieldsIncomplete');

  const validationHelper = validationOk
    ? t('registry.validationReadyHelper')
    : missingCount > 0
      ? missingCount === 1
        ? t('registry.registerBlockedOne')
        : t('registry.registerBlockedMissing', { count: String(missingCount) })
      : birthdateError || declaredError || t('registry.validationPendingHelper');

  const hasSireParent = sireName.trim().length > 0 && !isFoundationStock(sireName);
  const hasDamParent = damName.trim().length > 0 && !isFoundationStock(damName);
  const parentCount = Number(hasSireParent) + Number(hasDamParent);

  let lineageTone: StatusTone = 'neutral';
  let lineageLabel = t('registry.lineageNotRequired');
  let lineageHelper = t('registry.lineageFoundationHelper');

  if (parentCount === 1) {
    lineageTone = 'pending';
    lineageLabel = t('registry.lineagePartial');
    lineageHelper = t('registry.lineageWaitingFor', {
      parents: hasSireParent ? t('registry.damMother') : t('registry.sireFather'),
    });
  } else if (parentCount === 2) {
    lineageTone = bloodlineVerified ? 'success' : 'warning';
    lineageLabel = bloodlineVerified
      ? t('registry.lineageResolvedStatus')
      : t('registry.lineageUnresolved');
    lineageHelper = bloodlineVerified
      ? t('registry.lineageResolvedHelper')
      : t('registry.lineageUnresolvedHelper');
  }

  const registerBusy = loading || uploadingImage || photoProcessing;
  const registerDisabled = registerBusy || !validationOk;
  const registerLabel = uploadingImage
    ? t('registry.uploadingAttachment')
    : loading
      ? t('registry.registering')
      : photoProcessing
        ? t('registry.processingPhoto')
        : t('registry.registerBtn');

  const registerHelper = photoProcessing
    ? t('registry.registerBlockedProcessing')
    : registerBusy
      ? uploadingImage
        ? t('registry.registerBlockedUpload')
        : t('registry.registering')
      : missingCount > 0
        ? missingCount === 1
          ? t('registry.registerBlockedOne')
          : t('registry.registerBlockedMissing', { count: String(missingCount) })
        : birthdateError
          ? birthdateError
          : declaredError
            ? declaredError
            : !validationPassed
              ? t('registry.validationPendingHelper')
              : t('registry.verifyBeforeRegistering');

  const nextIdLabel = useMemo(() => {
    const rawCode = formatBirdCodeForDisplay(birdCode.trim() || suggestedBirdCode);
    if (!rawCode) return currentRole === 'offspring' ? '— (Select parents)' : '—';
    if (currentRole === 'sire') {
      return rawCode.toLowerCase().startsWith('sire') ? rawCode : `Sire ${rawCode}`;
    }
    if (currentRole === 'dam') {
      return rawCode.toLowerCase().startsWith('dam') ? rawCode : `Dam ${rawCode}`;
    }
    return rawCode;
  }, [birdCode, suggestedBirdCode, currentRole]);

  useEffect(() => {
    if (!strainOpen) return;
    const update = () => {
      if (strainInputRef.current) {
        const r = strainInputRef.current.getBoundingClientRect();
        setStrainDropdownPos({ top: r.bottom + 6, left: r.left, width: r.width });
      }
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const handleClickOutside = (e: MouseEvent) => {
      if (strainInputRef.current && !strainInputRef.current.contains(e.target as Node)) {
        setStrainOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); document.removeEventListener('mousedown', handleClickOutside); };
  }, [strainOpen]);

  useEffect(() => {
    if (!legColorOpen) return;
    const update = () => {
      if (legColorInputRef.current) {
        const r = legColorInputRef.current.getBoundingClientRect();
        setLegColorDropdownPos({ top: r.bottom + 6, left: r.left, width: r.width });
      }
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [legColorOpen]);

  const { rows: registryOptionRows } = useRegistryOptions();
  const baseColorOptions = useMemo(
    () => mergeOptions(registryOptionRows, 'feather_color'),
    [registryOptionRows]
  );
  const baseTraitOptions = useMemo(
    () => mergeOptions(registryOptionRows, 'trait'),
    [registryOptionRows]
  );
  const featherColorOptions = useMemo(
    () => mergeOptions(registryOptionRows, 'feather_color', newColor),
    [registryOptionRows, newColor]
  );
  const traitOptions = useMemo(
    () => mergeOptions(registryOptionRows, 'trait', newBehaviorTrait),
    [registryOptionRows, newBehaviorTrait]
  );
  const isCustomColor = isCustomOption(newColor, baseColorOptions.map((o) => o.value));
  const isCustomTrait = isCustomOption(newBehaviorTrait, baseTraitOptions.map((o) => o.value));

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5 animate-fadeIn">
      {draftNotice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-200"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wider">{t('registry.draftRestored')}</p>
            {draftNotice.photoSelected && (
              <p className="mt-0.5 text-xs font-semibold">{t('registry.photoReaddNotice')}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDraftNotice(null)}
            aria-label={t('registry.dismissDraftNotice')}
            className="-m-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="antigravity-hover bg-white dark:bg-card p-6 rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-4 relative z-30 overflow-visible">
        <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-slate-100 dark:border-border">
          <h3 className="font-black text-sm text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center space-x-2">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0">1</span>
            <span>{t('registry.step1Title')}</span>
          </h3>
          <span className="text-xs font-mono bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full font-black shrink-0">ID: {nextNodeId}</span>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider" htmlFor="identifier-name">{t('registry.identifierName')}</label>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-3 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold" placeholder={t('registry.identifierPlaceholder')} required id="identifier-name" />
        </div>
        {(() => {
          const sireBird = fowls.find((f) => f.name.trim().toLowerCase() === sireName.trim().toLowerCase());
          const damBird = fowls.find((f) => f.name.trim().toLowerCase() === damName.trim().toLowerCase());
          const sireBirdCode = sireBird ? (sireBird.bird_code || String(sireBird.id)) : (hasSire ? sireName.trim() : null);
          const damBirdCode = damBird ? (damBird.bird_code || String(damBird.id)) : (hasDam ? damName.trim() : null);

          const formatCheck = birdCode.trim() ? validateIdentifierFormat(birdCode.trim(), currentRole) : null;
          const isDuplicate = birdCode.trim()
            ? fowls.some((f) => normalizeBirdCode(f.bird_code).toLowerCase() === normalizeBirdCode(birdCode).toLowerCase())
            : false;
          const parentCheck = (currentRole === 'offspring' && birdCode.trim())
            ? checkParentageMatch(birdCode.trim(), sireBirdCode, damBirdCode)
            : { matches: true };

          return (
            <div className="bg-slate-50/80 dark:bg-muted/40 p-4 rounded-lg border border-slate-200/80 dark:border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-800 dark:text-card-foreground uppercase tracking-wider" htmlFor="chicken-code">
                  {t('registry.uniqueChickenId')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualOverride(!isManualOverride);
                    if (isManualOverride) setBirdCode('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {isManualOverride ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('registry.useAutoAssignedCode')}</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t('registry.editIdManually')}</span>
                    </>
                  )}
                </button>
              </div>

              {!isManualOverride ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center justify-between p-3 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('registry.identifierLabel')}</span>
                      <span className="font-mono text-base font-extrabold tracking-wide text-emerald-800 dark:text-emerald-300">
                        {suggestedBirdCode ? formatBirdCodeForDisplay(suggestedBirdCode) : currentRole === 'offspring' ? t('registry.selectSireAndDam') : t('registry.generating')}
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                      {suggestedBirdCode
                        ? currentRole === 'sire' ? t('registry.autoAssignedSire') : currentRole === 'dam' ? t('registry.autoAssignedDam') : t('registry.autoAssignedOffspring')
                        : currentRole === 'offspring'
                          ? t('registry.awaitingParents')
                          : t('registry.autoAssigned')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={birdCode}
                      onChange={(e) => setBirdCode(e.target.value)}
                      className="w-full p-3 border border-emerald-500 rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground font-mono font-bold focus:ring-4 focus:ring-emerald-100"
                      placeholder={formatBirdCodeForDisplay(suggestedBirdCode) || (currentRole === 'sire' ? 'e.g. 1' : currentRole === 'dam' ? 'e.g. A' : 'e.g. 1A1')}
                      id="chicken-code"
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-xs font-semibold">
                    {birdCode.trim() ? (
                      <>
                        {formatCheck && !formatCheck.valid ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">⚠️ {formatCheck.error}</span>
                        ) : isDuplicate ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">{t('registry.idAlreadyInUse', { code: birdCode.trim() })}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t('registry.validFormatForRole', { role: currentRole })}</span>
                        )}
                        {!parentCheck.matches && parentCheck.warning && (
                          <span className="text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded p-1">⚠️ {parentCheck.warning}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">{t('registry.formatHelpText')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider" htmlFor="wing-band-id">
              {t('registry.wingBandId')} <span className="text-muted-foreground font-normal lowercase">{t('registry.wingBandSub')}</span>
            </label>
          </div>
          <input
            type="text"
            value={wingBand}
            onChange={(e) => setWingBand(e.target.value)}
            maxLength={50}
            className="w-full p-3 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-mono font-bold"
            placeholder={t('registry.wingBandPlaceholder')}
            id="wing-band-id"
          />
          {(() => {
            const trimmedBand = wingBand.trim();
            const isBandDuplicate = trimmedBand
              ? fowls.some((f) => (f.wing_band || '').trim().toLowerCase() === trimmedBand.toLowerCase())
              : false;
            return (
              <div className="mt-1">
                {isBandDuplicate && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mb-1">
                    {t('registry.wingBandDuplicate', { band: trimmedBand })}
                  </p>
                )}
                <p className="text-xs text-muted-foreground font-semibold">
                  {trimmedBand ? t('registry.wingBandHelpWithVal') : t('registry.wingBandHelpOptional')}
                </p>
              </div>
            );
          })()}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider" htmlFor="genetic-strain">
              {t('registry.geneticStrain')}
            </label>
            {onAddBreeds && (
              <button
                type="button"
                onClick={handleAddBreed}
                aria-label={t('registry.addBreed')}
                className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-emerald-300"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('registry.addBreed')}</span>
              </button>
            )}
          </div>
          {selectedStrains.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5">
              {selectedStrains.map((s, i) => (
                <span key={`${s}-${i}`} className="inline-flex items-center gap-1.5 bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm text-slate-700 dark:text-card-foreground text-xs font-semibold px-3 py-1.5 rounded-sm group hover:border-emerald-300 transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  {s}
                    <button type="button" onClick={() => removeStrain(i)} aria-label={t('registry.removeStrainAria')} className="ml-0.5 w-6 h-6 rounded-sm bg-slate-100 dark:bg-muted hover:bg-rose-500 hover:text-white text-muted-foreground flex items-center justify-center text-xs font-bold transition-colors cursor-pointer opacity-60 group-hover:opacity-100">
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative" ref={strainInputRef}>
            <div className="relative">
              <input
                ref={strainInputElRef}
                type="text"
                role="combobox"
                aria-expanded={strainOpen}
                aria-controls={strainOpen ? 'genetic-strain-listbox' : undefined}
                aria-autocomplete="list"
                aria-haspopup="listbox"
                value={strainQuery}
                onChange={(e) => handleStrainChange(e.target.value)}
                onFocus={() => setStrainOpen(true)}
                onBlur={handleStrainBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitStrain({ focusOnError: true });
                  }
                  if (e.key === 'Tab') {
                    if (!strainQuery.trim() && selectedStrains.length === 0) {
                      e.preventDefault();
                      commitStrain({ focusOnError: true });
                    } else {
                      commitStrain();
                    }
                  }
                  if (e.key === 'Escape') setStrainOpen(false);
                }}
                aria-invalid={Boolean(strainError)}
                aria-describedby={strainError ? 'genetic-strain-error' : undefined}
                placeholder="Select or type a strain..."
                className={`w-full pl-3 pr-9 p-3 border rounded-md text-sm bg-white dark:bg-input placeholder:text-muted-foreground dark:placeholder:text-muted-foreground font-semibold transition-all focus:ring-4 ${strainQuery ? 'text-neutral-900 dark:text-foreground' : 'text-muted-foreground dark:text-muted-foreground dark:placeholder:text-muted-foreground font-normal'} ${strainError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-700 dark:focus:ring-rose-950/50' : 'border-input-border focus:border-emerald-500 focus:ring-emerald-100'}`}
              id="genetic-strain" />
              <button
                type="button"
                onClick={() => setStrainOpen((o) => !o)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-sm border border-slate-200 dark:border-border bg-white dark:bg-input text-muted-foreground text-xs focus:border-emerald-500 cursor-pointer hover:text-success transition-colors"
                aria-label={t('registry.toggleStrainList')}
                aria-expanded={strainOpen}
                aria-controls={strainOpen ? 'genetic-strain-listbox' : undefined}
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${strainOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </div>
            {strainOpen && strainDropdownPos && createPortal(
              <div
                className="fixed z-[10000] flex max-h-72 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card"
                style={{ top: strainDropdownPos.top, left: strainDropdownPos.left, width: strainDropdownPos.width }}
              >
                <div
                  id="genetic-strain-listbox"
                  role="listbox"
                  aria-label={t('registry.registeredBreeds')}
                  className="max-h-56 overflow-y-auto"
                >
                  {(() => {
                    if (loading && availableStrains.length === 0) {
                      return (
                        <div role="status" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                          {t('registry.breedsLoading')}
                        </div>
                      );
                    }
                    if (availableStrains.length === 0) {
                      return (
                        <div role="status" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                          {t('registry.noRegisteredBreeds')}
                        </div>
                      );
                    }
                    const q = strainQuery.trim().toLowerCase();
                    const matching = q
                      ? availableStrains.filter((s) => s.toLowerCase().includes(q))
                      : availableStrains;
                    if (matching.length === 0) {
                      return (
                        <div role="status" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                          {t('registry.noMatchingBreeds')}
                        </div>
                      );
                    }
                    return matching.map((s) => {
                      const selected = selectedStrains.some(
                        (value) => value.toLowerCase() === s.toLowerCase(),
                      );
                      return (
                        <button
                          key={s}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onMouseDown={(e) => { e.preventDefault(); selectStrainOption(s); }}
                          className={`w-full cursor-pointer px-4 py-2.5 text-left text-sm font-bold transition-colors hover:bg-slate-50 dark:hover:bg-muted/50 ${s.toLowerCase() === q ? 'bg-emerald-500/10 text-success dark:text-emerald-300' : selected ? 'text-success dark:text-emerald-300' : 'text-slate-600 dark:text-muted-foreground'}`}
                        >
                          {s} {selected && <span className="ml-1 text-xs text-success">Added</span>}
                        </button>
                      );
                    });
                  })()}
                </div>
                {availableStrains.length > 0 && (
                  <div className="border-t border-slate-200 bg-slate-50/80 p-1.5 dark:border-border dark:bg-muted/40">
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={handleAddBreed}
                      className="flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-sm px-3 text-left text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('registry.manageBreeds')}
                    </button>
                  </div>
                )}
              </div>,
              document.body
            )}
          </div>
          {strainError ? (
            <p id="genetic-strain-error" role="alert" className="mt-1.5 flex items-center gap-1.5 rounded-sm border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{strainError}</span>
            </p>
          ) : null}
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider" htmlFor="gender-class">{t('registry.genderClass')}</label>
            <select value={newGender} onChange={(e) => { const g = e.target.value; setNewGender(g); if (age.trim() !== '' && !isNaN(Number(age))) { setNewGrowthStage(autoComputeGrowthStageLocal(Number(age), g)); } else { setNewGrowthStage(''); } }} className={`w-full p-3 border border-input-border rounded-md text-sm bg-muted font-extrabold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer ${newGender ? 'text-foreground' : 'text-muted-foreground font-normal'}`} required id="gender-class">
              <option value="" disabled className="bg-popover text-muted-foreground">{t('registry.selectGenderClass')}</option>
              {GENDER_CLASS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-popover text-popover-foreground"
                >
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
          {!hasAnyParent && (
            <div className="sm:col-span-2 pt-1">
              <DeclaredCompositionEditor
                registeredBreed={effectiveBreed}
                availableBreeds={availableStrains}
                value={newDeclaredComposition ?? null}
                onChange={(val) => setNewDeclaredComposition?.(val)}
                hasParents={false}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider" htmlFor="feather-color">
              {t('registry.featherColor')}
              {isCustomColor && (
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded px-1.5 py-0.5 ml-2 normal-case tracking-normal">{t('registry.customBadge')}</span>
              )}
            </label>
            <input
              type="text"
              list="feather-color-options"
              value={newColor}
              onChange={(e) => setNewColor?.(e.target.value)}
              onBlur={() => {
                if (newColor) {
                  setNewColor?.(normalizeOptionValue(newColor, featherColorOptions.map((o) => o.value)));
                }
              }}
              placeholder={t('registry.featherColorPlaceholder')}
              className="w-full p-3 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:border-emerald-500 font-semibold transition-all"
              id="feather-color"
            />
            <datalist id="feather-color-options">
              {featherColorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label || opt.value}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider" htmlFor="behavior-trait">
              {t('registry.trait')}
              {isCustomTrait && (
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded px-1.5 py-0.5 ml-2 normal-case tracking-normal">{t('registry.customBadge')}</span>
              )}
            </label>
            <input
              type="text"
              list="trait-options"
              value={newBehaviorTrait}
              onChange={(e) => setNewBehaviorTrait?.(e.target.value)}
              onBlur={() => {
                if (newBehaviorTrait) {
                  setNewBehaviorTrait?.(normalizeOptionValue(newBehaviorTrait, traitOptions.map((o) => o.value)));
                }
              }}
              placeholder={t('registry.traitPlaceholder')}
              className="w-full p-3 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:border-emerald-500 font-semibold transition-all"
              id="behavior-trait"
            />
            <datalist id="trait-options">
              {traitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label || opt.value}
                </option>
              ))}
            </datalist>
          </div>
        </div>
      </div>

      <div className="antigravity-hover bg-white dark:bg-card p-6 rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-5">
        <h3 className="font-black text-sm text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100 dark:border-border">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0">2</span>
          <span>{t('registry.step2Title')}</span>
        </h3>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider" htmlFor="birth-date">
            {t('registry.birthDate')} <span className="text-success dark:text-emerald-300 font-black">{autoCalcAge ? t('registry.requiredAutoAge') : t('registry.requiredOnly')}</span>
          </label>
          <input
            type="date"
            value={newBirthdate}
            onChange={(e) => handleNewBirthdateChange(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full p-3 border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground font-semibold focus:ring-4 transition-all ${
              birthdateValidation.errors.length > 0
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-100 dark:focus:ring-rose-950/50'
                : 'border-input-border focus:border-emerald-500 focus:ring-emerald-100'
            }`}
            required
            id="birth-date"
          />
          {birthdateValidation.errors.map((err, i) => (
            <p key={`bd-err-${i}`} className="mt-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-sm px-2.5 py-1.5 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{err}</span>
            </p>
          ))}
          {birthdateValidation.warnings.map((warn, i) => (
            <p key={`bd-warn-${i}`} className="mt-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-sm px-2.5 py-1.5 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{warn}</span>
            </p>
          ))}
          {(() => {
            if (!autoCalcAge) return null;
            const parts = getAgePartsLocal(newBirthdate);
            return parts ? (
              <p className="mt-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 rounded-sm px-2.5 py-1.5">
                {t('registry.autoAgeLabel', { label: getAgeLabelLocal(parts), exact: getAgeExactLocal(parts) })}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground font-semibold">{t('registry.birthDateDerivedHelp')}</p>
            );
          })()}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider" htmlFor="age-mos">{t('registry.ageMos')} {newBirthdate && autoCalcAge && <span className="text-success dark:text-emerald-300 font-black">{t('registry.autoBadge')}</span>}</label>
            <input type="number" value={newBirthdate && autoCalcAge ? String((getAgePartsLocal(newBirthdate)?.totalMonths ?? 0)) : age} onChange={(e) => handleAgeChange(e.target.value)} readOnly={!!newBirthdate && autoCalcAge} className="w-full p-3 border border-input-border rounded-md text-sm text-center font-extrabold bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground" placeholder="0" required id="age-mos" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider" htmlFor="growth-stage">{t('registry.growthStage')}</label>
            <select
              value={newGrowthStage}
              onChange={(e) => setNewGrowthStage(e.target.value)}
              className={`w-full p-3 border border-input-border rounded-md text-sm bg-muted font-extrabold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer text-center ${newGrowthStage ? 'text-success dark:text-emerald-300' : 'text-muted-foreground font-normal'}`}
            id="growth-stage">
              <option value="" disabled className="bg-popover text-muted-foreground">{t('registry.selectStage')}</option>
              <option value="Chick" className="bg-popover text-popover-foreground">{t('registry.stageChick')}</option>
              <option value="Stag" className="bg-popover text-popover-foreground">{t('registry.stageStag')}</option>
              <option value="Pullet" className="bg-popover text-popover-foreground">{t('registry.stagePullet')}</option>
              <option value="Bull Stag" className="bg-popover text-popover-foreground">{t('registry.stageBullStag')}</option>
              <option value="Cock" className="bg-popover text-popover-foreground">{t('registry.stageCock')}</option>
              <option value="Hen" className="bg-popover text-popover-foreground">{t('registry.stageHen')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider" htmlFor="height">{t('registry.height')} ({heightUnitLabel(unitPrefs.heightUnit)})</label>
            <input type="number" step="0.1" min="0" value={height} onChange={(e) => { const v = e.target.value; setHeight(v === '' ? '' : String(Math.round(Number(v) * 10) / 10)); }} className="no-spinner w-full p-3 border border-input-border rounded-md text-sm text-center font-extrabold bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:border-emerald-500" placeholder="e.g. 45.0" id="height" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider" htmlFor="weight">{t('registry.weight')} ({weightUnitLabel(unitPrefs.weightUnit)})</label>
            <input type="number" step="0.1" min="0" value={weight} onChange={(e) => { const v = e.target.value; setWeight(v === '' ? '' : String(Math.round(Number(v) * 10) / 10)); }} className="no-spinner w-full p-3 border border-input-border rounded-md text-sm text-center font-extrabold bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:border-emerald-500" placeholder="e.g. 2.0" id="weight" />
          </div>
        </div>
        <div className="relative" ref={legColorInputRef}>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider" htmlFor="leg-color">{t('registry.legColor')}</label>
          <div className="relative">
            <input
              type="text"
              value={legColorQuery}
              onChange={(e) => { setLegColorQuery(e.target.value); setNewLegColor(e.target.value); setLegColorOpen(true); }}
              onFocus={() => setLegColorOpen(true)}
              onBlur={() => setTimeout(() => setLegColorOpen(false), 150)}
              placeholder={t('registry.legColorPlaceholder')}
              className={`w-full pl-3 pr-9 p-3 border border-input-border rounded-md text-sm bg-white dark:bg-input text-neutral-900 dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:border-emerald-500 font-semibold transition-all ${legColorQuery ? 'text-neutral-900 dark:text-foreground' : 'text-muted-foreground dark:text-muted-foreground dark:placeholder:text-muted-foreground font-normal'}`}
            id="leg-color" />
            <button
              type="button"
              onClick={() => setLegColorOpen((o) => !o)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-sm border border-slate-200 dark:border-border bg-white dark:bg-input text-muted-foreground text-xs focus:border-emerald-500 cursor-pointer hover:text-success transition-colors"
              aria-label={t('registry.toggleLegColorList')}
            >
              ▾
            </button>
          </div>
          {legColorOpen && legColorDropdownPos && createPortal(
            <div className="fixed z-[9999] bg-white dark:bg-card border border-slate-200 dark:border-border rounded-md shadow-2xl overflow-hidden max-h-56 flex flex-col" style={{ top: legColorDropdownPos.top, left: legColorDropdownPos.left, width: legColorDropdownPos.width }}>
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
                          className="w-full text-left px-4 py-3 bg-emerald-500/10 border-b border-slate-200 dark:border-border flex items-center justify-between gap-2 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                        >
                          <span className="text-sm font-black text-success dark:text-emerald-300">{t('registry.saveNewLegColor', { color: legColorQuery.trim() })}</span>
                          <span className="text-xs font-mono text-success uppercase shrink-0">{t('registry.autoSavedBadge')}</span>
                        </button>
                        {matching.length > 0 && <div className="px-4 pt-2.5 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('registry.matchingColors')}</div>}
                        {matching.map((s) => (
                            <div key={s} className="flex items-center w-full group">
                              <button type="button" onMouseDown={(e) => { e.preventDefault(); setLegColorQuery(s); setNewLegColor(s); setLegColorOpen(false); }} className="flex-1 text-left px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-muted/50 transition-colors cursor-pointer">
                                {s}
                              </button>
                              {customLegColorNames.has(s) && (
                                <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deleteCustomLegColor(s); }} className="shrink-0 w-6 h-6 mr-2 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-danger hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-xs font-bold transition-all cursor-pointer" title={t('registry.deleteColorTitle', { color: s })}>✕</button>
                              )}
                            </div>
                        ))}
                      </>
                    );
                  }
                  return matching.map((s) => (
                      <div key={s} className="flex items-center w-full group">
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setLegColorQuery(s); setNewLegColor(s); setLegColorOpen(false); }} className={`flex-1 text-left px-4 py-2.5 text-sm font-bold hover:bg-slate-50 dark:hover:bg-muted/50 transition-colors cursor-pointer ${s.toLowerCase() === legColorQuery.trim().toLowerCase() ? 'bg-emerald-500/10 text-success dark:text-emerald-300' : 'text-slate-600 dark:text-muted-foreground'}`}>
                          {s}
                        </button>
                        {customLegColorNames.has(s) && (
                          <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deleteCustomLegColor(s); }} className="shrink-0 w-6 h-6 mr-2 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-danger hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center text-xs font-bold transition-all cursor-pointer" title={t('registry.deleteColorTitle', { color: s })}>✕</button>
                        )}
                      </div>
                  ));
                })()}
                {legColorQuery.trim() === '' && availableLegColors.length === 0 && (
                  <div className="px-4 py-3 text-xs text-muted-foreground font-semibold">{t('registry.noLegColorsYet')}</div>
                )}
              </div>
            </div>,
            document.body
          )}
          <p className="mt-1.5 text-xs text-muted-foreground font-semibold">{t('registry.legColorHelp')}</p>
        </div>
      </div>

      <div className="antigravity-hover bg-white dark:bg-card p-6 rounded-lg border border-slate-200/80 dark:border-border shadow-sm space-y-4">
        <h3 className="font-black text-sm text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-100 dark:border-border">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0">3</span>
          <span>{t('registry.step3Title')}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
              <label htmlFor="encode-sire" className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider">
                {t('registry.sireFather')} <span className="text-muted-foreground font-normal lowercase">{t('registry.parentPickHelp')}</span>
              </label>
              <ParentSelector id="encode-sire" value={sireName} onChange={(v) => setSireName(v)} onPick={() => {}} fowls={fowls} preferredGender="Male" placeholder={t('registry.sirePlaceholder')} />
          </div>
          <div>
              <label htmlFor="encode-dam" className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 tracking-wider">
                {t('registry.damMother')} <span className="text-muted-foreground font-normal lowercase">{t('registry.parentPickHelp')}</span>
              </label>
              <ParentSelector id="encode-dam" value={damName} onChange={(v) => setDamName(v)} onPick={() => {}} fowls={fowls} preferredGender="Female" accent="amber" placeholder={t('registry.damPlaceholder')} />
          </div>
        </div>
        {(sireName.trim() || damName.trim()) && (() => {
          const sireChildren = sireName.trim() ? fowls.filter((f) => (f.sire || '').trim().toLowerCase() === sireName.trim().toLowerCase()) : [];
          const damChildren = damName.trim() ? fowls.filter((f) => (f.dam || '').trim().toLowerCase() === damName.trim().toLowerCase()) : [];
          const sireFullSibs = sireChildren.filter((c) => (c.dam || '').trim().toLowerCase() === (damName.trim().toLowerCase()));
          const hasData = sireChildren.length > 0 || damChildren.length > 0;
          if (!hasData) return null;
          return (
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-100 dark:border-sky-900/50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-black text-sky-700 dark:text-sky-300 uppercase tracking-widest">{t('registry.existingOffspringSiblings')}</p>
              <div className="grid grid-cols-2 gap-3">
                {sireChildren.length > 0 && (
                  <div className="bg-white/70 dark:bg-card/70 border border-sky-100 dark:border-sky-900/50 rounded-md p-3">
                    <p className="text-xs font-black text-info dark:text-sky-300 uppercase">{t('registry.sireOffspringHeader', { name: sireName.trim() })}</p>
                    <p className="text-lg font-black text-slate-800 dark:text-card-foreground">{sireChildren.length}</p>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {t('registry.sireDamCount', {
                        sires: String(sireChildren.filter((c) => c.gender === 'Male').length),
                        dams: String(sireChildren.filter((c) => c.gender === 'Female').length),
                      })}
                    </p>
                    {sireFullSibs.length > 0 && (
                      <p className="text-xs font-bold text-success dark:text-emerald-300 mt-1">{t('registry.fullSiblingsNotice', { count: String(sireFullSibs.length) })}</p>
                    )}
                  </div>
                )}
                {damChildren.length > 0 && (
                  <div className="bg-white/70 dark:bg-card/70 border border-pink-100 dark:border-pink-900/50 rounded-md p-3">
                    <p className="text-xs font-black text-pink uppercase">{t('registry.damOffspringHeader', { name: damName.trim() })}</p>
                    <p className="text-lg font-black text-slate-800 dark:text-card-foreground">{damChildren.length}</p>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {t('registry.sireDamCount', {
                        sires: String(damChildren.filter((c) => c.gender === 'Male').length),
                        dams: String(damChildren.filter((c) => c.gender === 'Female').length),
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {hasAnyParent && (
          <div className="pt-1">
            <DeclaredCompositionEditor
              registeredBreed={effectiveBreed}
              availableBreeds={availableStrains}
              value={newDeclaredComposition ?? null}
              onChange={(val) => setNewDeclaredComposition?.(val)}
              hasParents={true}
              pedigreeComposition={pedigreeComposition}
            />
          </div>
        )}
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/50 rounded-lg p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-teal uppercase tracking-widest">{t('registry.lineageGeneration')}</p>
              <p className="text-xs text-muted-foreground font-semibold mt-0.5">{t('registry.lineageGenerationHelp')}</p>
            </div>
            <div className="shrink-0 sm:text-right">
              {hasAnyParent ? (
                <>
                  <span className="inline-flex items-center gap-1.5 bg-teal-700 text-white text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">{offspringGenInfo.short} · {offspringGenInfo.label}</span>
                  <p className="text-2xl font-black text-teal mt-1.5">{computedBloodlinePct}%</p>
                </>
              ) : (
                <p className="text-2xl font-black text-muted-foreground mt-1.5">—</p>
              )}
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">{bloodlineVerified ? t('registry.lineageResolved') : t('registry.awaitingParentsStatus')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/70 dark:bg-card/70 border border-sky-100 dark:border-sky-900/50 rounded-md p-3">
              <p className="text-xs font-black text-info dark:text-sky-300 uppercase tracking-wider">{t('registry.sireLineage')}</p>
              <p className="text-sm font-black text-slate-800 dark:text-card-foreground truncate">{sireName.trim() ? sireName : '—'}</p>
              <p className="text-xs font-bold text-muted-foreground mt-0.5">{sireName.trim() ? sireGenInfo.label : '—'}</p>
            </div>
            <div className="bg-white/70 dark:bg-card/70 border border-pink-100 dark:border-pink-900/50 rounded-md p-3">
              <p className="text-xs font-black text-pink uppercase tracking-wider">{t('registry.damLineage')}</p>
              <p className="text-sm font-black text-slate-800 dark:text-card-foreground truncate">{damName.trim() ? damName : '—'}</p>
              <p className="text-xs font-bold text-muted-foreground mt-0.5">{damName.trim() ? damGenInfo.label : '—'}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-semibold">{t('registry.generationLadderHelp')}</p>
        </div>
        <BloodlineBreakdown
          stats={previewBloodlineStats && previewBloodlineStats.knownPct > 0 ? previewBloodlineStats : null}
          title={t('registry.bloodlineSplitTitle')}
          subtitle={t('registry.bloodlineSplitSub')}
        />
        {!previewBloodlineStats || previewBloodlineStats.knownPct === 0 ? (
          <div className="bg-slate-50 dark:bg-muted/50 border border-dashed border-slate-200 dark:border-border rounded-lg p-4">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
              {t('registry.bloodlineSplitEmptyTitle')}
            </p>
            <p className="text-xs text-muted-foreground font-semibold mt-1">
              {t('registry.bloodlineSplitEmptyHelp')}
            </p>
          </div>
        ) : null}
        <ChickenPhotoField
          name={newName || 'New chicken'}
          code={birdCode || suggestedBirdCode}
          pendingFile={photoForm?.selectedImage ?? selectedImage}
          pendingThumbnail={photoForm?.selectedPhotoThumbnail ?? null}
          uploading={photoForm?.uploadingImage ?? uploadingImage}
          uploadProgress={photoForm?.photoUploadProgress ?? 0}
          uploadError={photoForm?.photoUploadError ?? null}
          canEdit={canEditPhoto}
          onPendingChange={(files) => {
            const setFull = photoForm?.setSelectedImage ?? setSelectedImage;
            setFull(files?.full ?? null);
            photoForm?.setSelectedPhotoThumbnail(files?.thumbnail ?? null);
            photoForm?.setPhotoUploadError(null);
            setImagePreview('');
          }}
          onRemove={() => {
            (photoForm?.setSelectedImage ?? setSelectedImage)(null);
            photoForm?.setSelectedPhotoThumbnail(null);
            photoForm?.setPhotoUploadError(null);
            setImagePreview('');
          }}
          onCancelUpload={photoForm?.cancelPhotoUpload}
          onProcessingChange={setPhotoProcessing}
        />
      </div>

      <ValidationSummaryPanel
        nextIdLabel={nextIdLabel}
        requiredFields={requiredFields}
        dataCompleteness={dataCompleteness}
        validationTone={validationTone}
        validationLabel={validationLabel}
        validationHelper={validationHelper}
        lineageTone={lineageTone}
        lineageLabel={lineageLabel}
        lineageHelper={lineageHelper}
        registerDisabled={registerDisabled}
        registerBusy={registerBusy}
        registerLabel={registerLabel}
        registerHelper={registerHelper}
        footer={
          onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] w-full cursor-pointer rounded-lg border border-border bg-muted px-4 py-3 text-xs font-black tracking-widest uppercase text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              {t('registry.cancelRegistration')}
            </button>
          ) : undefined
        }
      />
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

