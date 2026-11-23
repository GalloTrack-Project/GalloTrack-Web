'use client';
import React from 'react';
import { createPortal } from 'react-dom';
import {
  Pencil,
  Tag,
  Ruler,
  Calendar,
  TreePine,
  Lock,
  Edit3,
  RotateCcw,
  CheckCircle2,
  Plus,
  X,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import type { FowlRecord, AgeParts, DeclaredBreedShare } from '@/lib/types';
import type { DraftRestoreResult } from '@/lib/fowl-draft';
import ParentSelector from './ParentSelector';
import ComboboxInput from '@/components/ui/ComboboxInput';
import DeclaredCompositionEditor from '@/components/profiling/DeclaredCompositionEditor';
import {
  getDescendantFowls,
  parseDeclaredComposition,
  validateDeclaredComposition,
  computePedigreeComposition,
  type BloodlineComposition,
  type DeclaredCompositionValidationResult,
} from '@/lib/bloodline-composition';
import { getCompositionSource } from '@/lib/breeding-classification';
import {
  formatBirdCodeForDisplay,
  validateIdentifierFormat,
  normalizeBirdCode,
  previewBirdCode,
} from '@/lib/bird-code';
import { bloodlineOf, isCustomOption, normalizeOptionValue, sexLabel } from '@/lib/helpers';
import { isValidWingBand } from '@/lib/wing-band';
import { validateParentRoles } from '@/lib/parent-sex';
import { findStrainName, normalizeStrainSearch, strainMatchesQuery } from '@/lib/strain-options';
import { createRegisteredBreed } from '@/lib/services/strain-service';
import { toastMessage } from '@/lib/toast-bus';
import { GENDER_CLASS_OPTIONS } from '@/lib/gender-class';
import { useT } from '@/lib/i18n';
import { useRegistryOptions } from '@/lib/hooks/use-registry-options';
import { mergeOptions } from '@/lib/lifecycle';
import { useUnitPrefs, weightUnitLabel, heightUnitLabel, weightFromStorage, heightFromStorage } from '@/lib/units';
import { validateOffspringBirthdate, type BirthdateValidationResult } from '@/lib/registry-roles';
import { Modal } from '@/components/ui';
import ChickenPhotoField from '@/components/ChickenPhotoField';
import { useFowlFormStateOptional } from '@/lib/contexts/fowl-form-context';

type EditFowlModalProps = {
  editingFowl: FowlRecord | null;
  setEditingFowl: (f: FowlRecord | null) => void;
  handleUpdateFowl: (e: React.FormEvent) => Promise<{ ok: boolean; error?: string } | void>;
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
  canEditPhoto?: boolean;
  /** Opens the Breed Registry without discarding the edit draft. */
  onAddBreeds?: () => void;
  /** Whether this account can create breeds in the shared registry. */
  canCreateBreed?: boolean;
  /** Refreshes the registered breed list after an inline create. */
  refreshStrains?: () => Promise<void>;
  /** Restores a saved edit draft for this chicken. */
  restoreDraft?: (fowlId: number | string) => DraftRestoreResult;
  /** Clears the saved edit draft when the user cancels. */
  clearDraft?: (fowlId: number | string) => void;
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
  canEditPhoto = true,
  onAddBreeds,
  canCreateBreed = true,
  refreshStrains,
  restoreDraft,
  clearDraft,
}: EditFowlModalProps) {
  const { t } = useT();
  const photoForm = useFowlFormStateOptional();
  const unitPrefs = useUnitPrefs();
  const [manualCodeOpen, setManualCodeOpen] = React.useState(false);
  const [photoProcessing, setPhotoProcessing] = React.useState(false);
  const [draftRestored, setDraftRestored] = React.useState(false);
  const [draftPhotoNotice, setDraftPhotoNotice] = React.useState(false);
  const [saveAttempted, setSaveAttempted] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const restoredDraftIdRef = React.useRef<number | string | null>(null);
  const [strainOpen, setStrainOpen] = React.useState(false);
  const [strainActiveIndex, setStrainActiveIndex] = React.useState(-1);
  const [strainError, setStrainError] = React.useState<string | null>(null);
  const [strainAnnouncement, setStrainAnnouncement] = React.useState('');
  const [creatingBreed, setCreatingBreed] = React.useState(false);
  const [strainDropdownPos, setStrainDropdownPos] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const strainBoxRef = React.useRef<HTMLDivElement>(null);
  const strainInputRef = React.useRef<HTMLInputElement>(null);

  const typedStrain = editBreed.trim();
  const registeredEditBreed = findStrainName(availableStrains, editBreed);
  const hasExactStrainMatch = Boolean(registeredEditBreed);
  const breedsLoading = loading && availableStrains.length === 0;
  const matchingStrains = availableStrains.filter((strain) =>
    strainMatchesQuery(strain, editBreed),
  );
  const isLegacyStrain =
    Boolean(editingFowl?.breed?.trim()) &&
    normalizeStrainSearch(typedStrain) ===
      normalizeStrainSearch(editingFowl?.breed || '') &&
    !registeredEditBreed &&
    !loading;
  const showStrainAddRow = Boolean(typedStrain) && !hasExactStrainMatch && !breedsLoading;

  React.useEffect(() => {
    if (!strainOpen) return;
    const update = () => {
      const box = strainBoxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      setStrainDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [strainOpen]);

  const selectRegisteredStrain = (name: string) => {
    setEditBreed(name);
    setStrainError(null);
    setStrainAnnouncement('');
    setStrainOpen(false);
    setStrainActiveIndex(-1);
  };

  const handleAddTypedBreed = async () => {
    const trimmed = editBreed.trim();
    if (!trimmed || creatingBreed) return;
    if (!canCreateBreed) {
      setStrainAnnouncement(t('registry.askOwnerToRegisterBreed'));
      return;
    }
    const existing = findStrainName(availableStrains, trimmed);
    if (existing) {
      selectRegisteredStrain(existing);
      return;
    }
    setCreatingBreed(true);
    const result = await createRegisteredBreed(trimmed);
    if (!result.ok || !result.name) {
      setStrainError(t('registry.breedCreateFailed'));
      setCreatingBreed(false);
      return;
    }
    await refreshStrains?.();
    setEditBreed(result.name);
    setStrainError(null);
    setStrainAnnouncement(t('registry.breedAddedSelected'));
    toastMessage(t('registry.breedAddedSelected'), 'success');
    setStrainOpen(false);
    setStrainActiveIndex(-1);
    setCreatingBreed(false);
  };

  const handleStrainInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!strainOpen) setStrainOpen(true);
      if (matchingStrains.length > 0) {
        setStrainActiveIndex((current) => (current + 1) % matchingStrains.length);
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!strainOpen) setStrainOpen(true);
      if (matchingStrains.length > 0) {
        setStrainActiveIndex((current) =>
          current <= 0 ? matchingStrains.length - 1 : current - 1,
        );
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (strainOpen && strainActiveIndex >= 0 && matchingStrains[strainActiveIndex]) {
        selectRegisteredStrain(matchingStrains[strainActiveIndex]);
      } else if (typedStrain && !hasExactStrainMatch) {
        void handleAddTypedBreed();
      } else if (registeredEditBreed) {
        selectRegisteredStrain(registeredEditBreed);
      }
      return;
    }
    if (event.key === 'Escape') {
      setStrainOpen(false);
      setStrainActiveIndex(-1);
      return;
    }
    if (event.key === 'Tab') {
      setStrainOpen(false);
      setStrainActiveIndex(-1);
    }
  };
  const clearPhotoFile = photoForm?.setEditPhotoFile;
  const clearPhotoThumbnail = photoForm?.setEditPhotoThumbnail;
  const clearPhotoRemoved = photoForm?.setEditPhotoRemoved;

  React.useEffect(() => {
    return () => {
      clearPhotoFile?.(null);
      clearPhotoThumbnail?.(null);
      clearPhotoRemoved?.(false);
    };
  }, [clearPhotoFile, clearPhotoThumbnail, clearPhotoRemoved]);

  React.useEffect(() => {
    if (!editingFowl) {
      restoredDraftIdRef.current = null;
      setDraftRestored(false);
      setDraftPhotoNotice(false);
      return;
    }
    if (restoredDraftIdRef.current === editingFowl.id) return;
    restoredDraftIdRef.current = editingFowl.id;
    const result = restoreDraft?.(editingFowl.id);
    setDraftRestored(Boolean(result?.restored));
    setDraftPhotoNotice(Boolean(result?.restored && result?.photoSelected));
  }, [editingFowl, restoreDraft]);

  const handleClose = () => {
    if (editingFowl) clearDraft?.(editingFowl.id);
    setSaveAttempted(false);
    setSaveError(null);
    setEditingFowl(null);
  };

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

  const declaredValidation = React.useMemo<DeclaredCompositionValidationResult>(() => {
    if (!editDeclaredComposition || editDeclaredComposition.length === 0) {
      return { valid: true, errors: [], warnings: [], parsed: [], total: 100 };
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

  React.useEffect(() => {
    setSaveAttempted(false);
    setSaveError(null);
  }, [editingFowl?.id]);

  if (!editingFowl) return null;

  const photoUploading = photoForm?.uploadingImage ?? false;
  const saveBusy = loading || photoUploading || photoProcessing;
  const normalizedText = (value: string | null | undefined) => (value ?? '').trim();
  const normalizedNumber = (value: string | number | null | undefined) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? String(parsed) : raw;
  };
  const originalBirdCode = normalizeBirdCode(editingFowl.bird_code);
  const effectiveBirdCode = normalizeBirdCode(editBirdCode || originalBirdCode);
  const originalDeclared = JSON.stringify(
    parseDeclaredComposition(editingFowl.declared_composition) ?? null,
  );
  const currentDeclared = JSON.stringify(editDeclaredComposition ?? null);
  const isDirty =
    normalizedText(editName) !== normalizedText(editingFowl.name) ||
    normalizeStrainSearch(editBreed) !== normalizeStrainSearch(editingFowl.breed) ||
    normalizedText(editGender) !== normalizedText(editingFowl.gender) ||
    normalizedText(editColor) !== normalizedText(editingFowl.feather_color || editingFowl.color) ||
    normalizedText(editColorCategory) !== normalizedText(editingFowl.color_category) ||
    normalizedText(editBehaviorTrait) !==
      normalizedText(editingFowl.trait || editingFowl.behavior_trait) ||
    normalizedText(editEyeVariant) !== normalizedText(editingFowl.eye_variant) ||
    normalizedText(editBirthdate) !== normalizedText(editingFowl.birthdate) ||
    normalizedText(editGrowthStage) !== normalizedText(editingFowl.growth_stage) ||
    normalizedNumber(editWeight) !==
      normalizedNumber(weightFromStorage(editingFowl.weight, unitPrefs.weightUnit)) ||
    normalizedNumber(editHeight) !==
      normalizedNumber(heightFromStorage(editingFowl.height, unitPrefs.heightUnit)) ||
    normalizedText(editLegColor) !== normalizedText(editingFowl.leg_color) ||
    normalizedText(editSire) !== normalizedText(editingFowl.sire) ||
    normalizedText(editDam) !== normalizedText(editingFowl.dam) ||
    effectiveBirdCode.toLowerCase() !== originalBirdCode.toLowerCase() ||
    normalizedText(editWingBand) !== normalizedText(editingFowl.wing_band) ||
    originalDeclared !== currentDeclared ||
    Boolean(photoForm?.editPhotoFile) ||
    Boolean(photoForm?.editPhotoRemoved);

  const originalBreed = normalizedText(editingFowl.breed);
  const strainChanged = normalizeStrainSearch(editBreed) !== normalizeStrainSearch(originalBreed);
  const editSireValue = normalizedText(editSire) || 'Foundation Stock';
  const editDamValue = normalizedText(editDam) || 'Foundation Stock';
  const birthdateTouched =
    normalizedText(editBirthdate) !== normalizedText(editingFowl.birthdate) ||
    normalizedText(editSire) !== normalizedText(editingFowl.sire) ||
    normalizedText(editDam) !== normalizedText(editingFowl.dam);
  const parentSexError = validateParentRoles(
    { sire: editSireValue, dam: editDamValue },
    fowls,
    {
      child: { id: editingFowl.id, user_id: editingFowl.user_id },
      previous: { sire: editingFowl.sire, dam: editingFowl.dam },
    },
  );

  const trimmedName = normalizedText(editName);
  const duplicateName =
    Boolean(trimmedName) &&
    fowls.some(
      (fowl) =>
        fowl.id !== editingFowl.id &&
        normalizedText(fowl.name).toLowerCase() === trimmedName.toLowerCase(),
    );
  const strainProblem = !normalizedText(editBreed)
    ? t('editFowl.strainRequired')
    : strainChanged && !registeredEditBreed
      ? t('registry.chooseRegisteredBreedOrAdd')
      : strainError;
  const blockingBirthdateErrors = birthdateTouched ? birthdateValidation.errors : [];
  const blockingDeclaredError = declaredChanged ? declaredValidation.error : null;
  const codeChanged =
    Boolean(normalizedText(editBirdCode)) &&
    effectiveBirdCode.toLowerCase() !== originalBirdCode.toLowerCase();
  const codeRole: 'sire' | 'dam' | 'offspring' = isOffspring
    ? 'offspring'
    : sexLabel({ gender: editGender }) === 'Hen'
      ? 'dam'
      : 'sire';
  const codeFormatCheck = codeChanged ? validateIdentifierFormat(effectiveBirdCode, codeRole) : null;
  const duplicateCode =
    codeChanged &&
    fowls.some(
      (fowl) =>
        fowl.id !== editingFowl.id &&
        normalizeBirdCode(fowl.bird_code).toLowerCase() === effectiveBirdCode.toLowerCase(),
    );
  const codeProblem = !codeChanged
    ? null
    : duplicateCode
      ? t('editFowl.codeDuplicate', { code: effectiveBirdCode })
      : codeFormatCheck && !codeFormatCheck.valid
        ? t('editFowl.codeInvalid', { error: codeFormatCheck.error ?? '' })
        : null;
  const trimmedBand = normalizedText(editWingBand);
  const originalBand = normalizedText(editingFowl.wing_band);
  const wingBandChanged = trimmedBand !== originalBand;
  const wingBandInvalid = Boolean(trimmedBand) && !isValidWingBand(trimmedBand);
  const wingBandDuplicate =
    Boolean(trimmedBand) &&
    fowls.some(
      (fowl) =>
        fowl.id !== editingFowl.id &&
        normalizedText(fowl.wing_band).toLowerCase() === trimmedBand.toLowerCase(),
    );
  const wingBandProblem = wingBandChanged
    ? wingBandInvalid
      ? t('editFowl.wingBandInvalid')
      : wingBandDuplicate
        ? t('editFowl.wingBandDuplicate', { band: trimmedBand })
        : null
    : null;
  const photoProcessingProblem =
    Boolean(photoForm?.editPhotoFile) !== Boolean(photoForm?.editPhotoThumbnail) && !photoProcessing
      ? t('editFowl.photoProcessing')
      : null;

  const saveProblems: Array<{ id: string; label: string; message: string }> = [];
  if (!trimmedName) {
    saveProblems.push({
      id: 'identifier-name',
      label: t('editFowl.fieldName'),
      message: t('editFowl.nameRequired'),
    });
  } else if (duplicateName) {
    saveProblems.push({
      id: 'identifier-name',
      label: t('editFowl.fieldName'),
      message: t('editFowl.nameDuplicate', { name: trimmedName }),
    });
  }
  if (strainProblem) {
    saveProblems.push({
      id: 'genetic-strain',
      label: t('editFowl.fieldStrain'),
      message: strainProblem,
    });
  }
  if (blockingBirthdateErrors.length > 0) {
    saveProblems.push({
      id: 'birth-date',
      label: t('editFowl.fieldBirthdate'),
      message: blockingBirthdateErrors.join(' '),
    });
  }
  if (blockingDeclaredError) {
    saveProblems.push({
      id: 'declared-percent-0',
      label: t('editFowl.fieldPurity'),
      message: blockingDeclaredError,
    });
  }
  if (wingBandProblem) {
    saveProblems.push({
      id: 'wing-band-id',
      label: t('editFowl.fieldWingBand'),
      message: wingBandProblem,
    });
  }
  if (codeProblem) {
    saveProblems.push({
      id: 'chicken-code',
      label: t('editFowl.fieldCode'),
      message: codeProblem,
    });
  }
  if (parentSexError) {
    saveProblems.push({
      id: /sire/i.test(parentSexError) ? 'edit-sire' : 'edit-dam',
      label: t('editFowl.fieldParents'),
      message: parentSexError,
    });
  }
  if (photoProcessingProblem) {
    saveProblems.push({
      id: 'chicken-photo-dropzone',
      label: t('editFowl.fieldPhoto'),
      message: photoProcessingProblem,
    });
  }

  const legacyWarnings: string[] = [];
  if (isLegacyStrain) legacyWarnings.push(t('editFowl.legacyStrain'));
  if (
    sexLabel(editingFowl) === 'Hen' &&
    Boolean(originalBand) &&
    !wingBandChanged
  ) {
    legacyWarnings.push(t('editFowl.legacyHenWingBand'));
  }
  if (!wingBandChanged && (wingBandInvalid || wingBandDuplicate)) {
    legacyWarnings.push(t('editFowl.legacyWingBand'));
  }
  if (!declaredChanged && declaredValidation.error) {
    legacyWarnings.push(t('editFowl.legacyComposition'));
  }
  if (!birthdateTouched && birthdateValidation.errors.length > 0) {
    legacyWarnings.push(t('editFowl.legacyBirthdate'));
  }

  const focusField = (id: string) => {
    if (id === 'chicken-code') setManualCodeOpen(true);
    if (id === 'genetic-strain') setStrainOpen(true);
    window.requestAnimationFrame(() => {
      const field = document.getElementById(id);
      if (field && typeof field.scrollIntoView === 'function') {
        field.scrollIntoView({ block: 'center' });
      }
      field?.focus();
    });
  };

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveAttempted(true);
    setSaveError(null);
    if (saveBusy || !isDirty) return;
    if (saveProblems.length > 0) {
      focusField(saveProblems[0].id);
      return;
    }
    const result = await handleUpdateFowl(event);
    if (result && !result.ok && result.error) {
      setSaveError(result.error);
    }
  };
  const editAgeParts = editBirthdate ? getAgeParts(editBirthdate) : null;
  const editAgeDisplay = editBirthdate
    ? editAgeParts
      ? String(editAgeParts.totalMonths)
      : '-'
    : editAge || '-';

  const isFoundationStock = (name: string): boolean =>
    (name || '').trim().toLowerCase() === 'foundation stock';
  const parentBloodlinePct = (f: FowlRecord) => bloodlineOf(f, fowls);

  return (
    <Modal
      open
      onClose={handleClose}
      title="Edit Node Registry"
      description={`Update parameters for ${editingFowl.name}`}
      icon={<Pencil className="h-5 w-5" />}
      iconClassName="hidden h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border bg-muted text-muted-foreground sm:flex"
      className="max-w-lg min-w-0 overflow-x-hidden p-3! sm:p-6!"
    >
      <form
        noValidate
        onSubmit={(event) => {
          void submitEdit(event);
        }}
        autoComplete="off"
        className="min-w-0 space-y-4 text-sm"
      >
        {saveError && (
          <div
            role="alert"
            className="border-loss/30 bg-loss-bg text-loss flex items-start gap-2.5 rounded-lg border p-3 text-xs font-bold"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">
              {t('editFowl.saveFailed')}: {saveError}
            </span>
          </div>
        )}

        {saveAttempted && saveProblems.length > 0 && (
          <div
            role="alert"
            className="border-loss/30 bg-loss-bg text-loss rounded-lg border p-3 text-xs font-bold"
          >
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {saveProblems.length === 1
                  ? t('editFowl.cannotSaveOne')
                  : t('editFowl.cannotSave', { count: saveProblems.length })}
              </span>
            </p>
            <p className="mt-1 pl-6 opacity-80">{t('editFowl.fixHighlighted')}</p>
            <ul className="mt-2 space-y-1 pl-6">
              {saveProblems.map((problem) => (
                <li key={`${problem.id}-${problem.label}`} className="min-w-0 break-words">
                  <button
                    type="button"
                    onClick={() => focusField(problem.id)}
                    className="text-left underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    {problem.label}: {problem.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {saveAttempted && !isDirty && (
          <div
            role="status"
            className="border-border bg-muted text-foreground rounded-lg border p-3 text-xs font-bold"
          >
            {t('editFowl.noChanges')}
          </div>
        )}

        {legacyWarnings.length > 0 && (
          <div
            role="status"
            className="border-low-sample/30 bg-low-sample-bg text-low-sample rounded-lg border p-3 text-xs font-semibold"
          >
            <p className="flex items-start gap-2 font-black">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t('editFowl.legacyTitle')}</span>
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-8">
              {legacyWarnings.map((warning) => (
                <li key={warning} className="break-words">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {draftRestored && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-200"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wider">
                {t('registry.draftRestored')}
              </p>
              {draftPhotoNotice && (
                <p className="mt-0.5 text-xs font-semibold">{t('registry.photoReaddNotice')}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setDraftRestored(false);
                setDraftPhotoNotice(false);
              }}
              aria-label={t('registry.dismissDraftNotice')}
              className="-m-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <ChickenPhotoField
          name={editName || editingFowl.name}
          code={editBirdCode || editingFowl.bird_code}
          imageUrl={editingFowl.image_url}
          photoPath={editingFowl.photo_path}
          photoThumbPath={editingFowl.photo_thumb_path}
          pendingFile={photoForm?.editPhotoFile ?? null}
          pendingThumbnail={photoForm?.editPhotoThumbnail ?? null}
          removed={photoForm?.editPhotoRemoved ?? false}
          uploading={photoForm?.uploadingImage ?? loading}
          uploadProgress={photoForm?.photoUploadProgress ?? 0}
          uploadError={photoForm?.editPhotoUploadError ?? null}
          canEdit={canEditPhoto}
          onPendingChange={(files) => {
            photoForm?.setEditPhotoFile(files?.full ?? null);
            photoForm?.setEditPhotoThumbnail(files?.thumbnail ?? null);
            photoForm?.setEditPhotoUploadError(null);
            if (files) photoForm?.setEditPhotoRemoved(false);
          }}
          onRemove={() => {
            photoForm?.setEditPhotoFile(null);
            photoForm?.setEditPhotoThumbnail(null);
            photoForm?.setEditPhotoUploadError(null);
            photoForm?.setEditPhotoRemoved(true);
          }}
          onCancelUpload={photoForm?.cancelPhotoUpload}
          onProcessingChange={setPhotoProcessing}
        />

        <div className="dark:bg-muted/50 dark:border-border min-w-0 space-y-3 rounded-lg border border-slate-200/40 bg-slate-50/50 p-2.5 sm:p-4">
          <h4 className="flex min-w-0 flex-wrap items-center gap-1.5 border-b pb-1 text-xs font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
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
              aria-invalid={Boolean(
                saveAttempted &&
                  saveProblems.some((problem) => problem.id === 'identifier-name'),
              )}
              aria-describedby={
                saveAttempted && saveProblems.some((problem) => problem.id === 'identifier-name')
                  ? 'identifier-name-error'
                  : undefined
              }
              className="border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 text-sm font-medium text-neutral-900 focus:border-emerald-500"
              required
              id="identifier-name"
            />
            {saveAttempted &&
              saveProblems
                .filter((problem) => problem.id === 'identifier-name')
                .map((problem) => (
                  <p
                    key={problem.message}
                    id="identifier-name-error"
                    role="alert"
                    className="text-danger mt-1 text-xs font-bold break-words"
                  >
                    {problem.message}
                  </p>
                ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative z-30">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <label
                  className="text-muted-foreground block text-xs font-bold uppercase"
                  htmlFor="genetic-strain"
                >
                  Genetic Strain
                </label>
                {onAddBreeds && (
                  <button
                    type="button"
                    onClick={onAddBreeds}
                    aria-label={t('registry.addBreed')}
                    className="inline-flex max-w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 max-sm:gap-1 max-sm:px-1.5 max-sm:text-[10px] dark:text-emerald-300"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-words">{t('registry.addBreed')}</span>
                  </button>
                )}
              </div>
              <div className="relative" ref={strainBoxRef}>
                <ComboboxInput
                  ref={strainInputRef}
                  id="genetic-strain"
                  value={editBreed}
                  onChange={(e) => {
                    setEditBreed(e.target.value);
                    setStrainError(null);
                    setStrainOpen(true);
                    setStrainActiveIndex(-1);
                    setStrainAnnouncement('');
                  }}
                  onFocus={() => {
                    setStrainOpen(true);
                    setStrainActiveIndex(-1);
                  }}
                  onBlur={() => setTimeout(() => setStrainOpen(false), 120)}
                  onKeyDown={handleStrainInputKeyDown}
                  aria-invalid={Boolean(
                    strainError ||
                      (saveAttempted &&
                        saveProblems.some((problem) => problem.id === 'genetic-strain')),
                  )}
                  aria-describedby={
                    strainError
                      ? 'genetic-strain-error'
                      : saveAttempted &&
                          saveProblems.some((problem) => problem.id === 'genetic-strain')
                        ? 'genetic-strain-save-error'
                        : undefined
                  }
                  expanded={strainOpen}
                  controls={strainOpen ? 'genetic-strain-listbox' : undefined}
                  activeOptionId={
                    strainOpen && strainActiveIndex >= 0
                      ? `genetic-strain-option-${strainActiveIndex}`
                      : undefined
                  }
                  className="border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 text-sm font-medium text-neutral-900 focus:border-emerald-500"
                  placeholder="Select or type strain"
                  required
                />
                <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                  {strainAnnouncement}
                </div>
                {isLegacyStrain && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      {t('registry.notRegistered')}
                    </span>
                    {canCreateBreed ? (
                      <button
                        type="button"
                        onClick={() => void handleAddTypedBreed()}
                        disabled={creatingBreed}
                        className="cursor-pointer text-xs font-bold text-emerald-700 hover:underline disabled:opacity-60 dark:text-emerald-400"
                      >
                        {t('registry.registerThisBreed')}
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        {t('registry.askOwnerToRegisterBreed')}
                      </span>
                    )}
                  </div>
                )}
                {strainError && (
                  <div
                    id="genetic-strain-error"
                    role="alert"
                    className="mt-1.5 space-y-1.5 rounded-sm border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
                  >
                    <p>{strainError}</p>
                    {canCreateBreed ? (
                      <button
                        type="button"
                        onClick={() => void handleAddTypedBreed()}
                        disabled={creatingBreed}
                        className="cursor-pointer text-left underline disabled:opacity-60"
                      >
                        {t('registry.addTypedBreed', { strain: typedStrain })}
                      </button>
                    ) : (
                      <p>{t('registry.askOwnerToRegisterBreed')}</p>
                    )}
                  </div>
                )}
                {saveAttempted &&
                  !strainError &&
                  saveProblems
                    .filter((problem) => problem.id === 'genetic-strain')
                    .map((problem) => (
                      <p
                        key={problem.message}
                        id="genetic-strain-save-error"
                        role="alert"
                        className="text-danger mt-1.5 text-xs font-bold break-words"
                      >
                        {problem.message}
                      </p>
                    ))}
                {strainOpen && strainDropdownPos && createPortal(
                  <div
                    className="fixed z-[10000] flex max-h-64 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card"
                    style={{
                      top: strainDropdownPos.top,
                      left: strainDropdownPos.left,
                      width: strainDropdownPos.width,
                    }}
                  >
                    {showStrainAddRow && (
                      <div className="border-b border-emerald-200 bg-emerald-50/70 p-1.5 dark:border-emerald-900/60 dark:bg-emerald-500/10">
                        {canCreateBreed ? (
                          <button
                            type="button"
                            disabled={creatingBreed}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => void handleAddTypedBreed()}
                            className="flex min-h-10 w-full cursor-pointer items-center px-3 text-left text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/10 disabled:cursor-wait disabled:opacity-60 dark:text-emerald-300"
                          >
                            {creatingBreed
                              ? t('registry.breedsLoading')
                              : t('registry.addTypedBreed', { strain: typedStrain })}
                          </button>
                        ) : (
                          <p className="px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                            {t('registry.askOwnerToRegisterBreed')}
                          </p>
                        )}
                      </div>
                    )}
                    <div
                      id="genetic-strain-listbox"
                      role="listbox"
                      aria-label={t('registry.registeredBreeds')}
                      className="min-h-0 flex-1 overflow-y-auto"
                    >
                      {breedsLoading ? (
                        <div role="status" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                          {t('registry.breedsLoading')}
                        </div>
                      ) : matchingStrains.length === 0 ? (
                        !typedStrain ? (
                          <div role="status" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                            {t('registry.noRegisteredBreeds')}
                          </div>
                        ) : null
                      ) : (
                        matchingStrains.map((strain, index) => (
                          <button
                            key={strain}
                            id={`genetic-strain-option-${index}`}
                            type="button"
                            role="option"
                            aria-selected={strain === registeredEditBreed}
                            tabIndex={-1}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setStrainActiveIndex(index)}
                            onClick={() => selectRegisteredStrain(strain)}
                            className={`flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-bold transition-colors hover:bg-slate-50 dark:hover:bg-muted/50 ${
                              index === strainActiveIndex ? 'bg-emerald-500/10' : ''
                            } ${
                              strain === registeredEditBreed
                                ? 'text-success dark:text-emerald-300'
                                : 'text-slate-600 dark:text-muted-foreground'
                            }`}
                          >
                            <span className="min-w-0 break-words">{strain}</span>
                            {strain === registeredEditBreed && (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
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
                nonBlockingError={!declaredChanged}
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
                name="gt-edit-feather-color"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
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
                name="gt-edit-behavior-trait"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
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

        <div className="dark:bg-muted/50 dark:border-border min-w-0 space-y-3 rounded-lg border border-slate-200/40 bg-slate-50/50 p-2.5 sm:p-4">
          <h4 className="flex min-w-0 flex-wrap items-center gap-1.5 border-b pb-1 text-xs font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
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
              aria-invalid={birthdateTouched && birthdateValidation.errors.length > 0}
              aria-describedby={
                birthdateTouched && birthdateValidation.errors.length > 0
                  ? 'edit-birthdate-error'
                  : !birthdateTouched && birthdateValidation.errors.length > 0
                    ? 'edit-birthdate-legacy-warning'
                    : undefined
              }
              className={`dark:bg-input dark:text-foreground w-full rounded-md border bg-white p-2.5 text-sm font-semibold text-neutral-900 ${
                birthdateTouched && birthdateValidation.errors.length > 0
                  ? 'border-rose-500 focus:border-rose-500'
                  : 'border-input-border focus:border-emerald-500'
              }`}
              id="birth-date"
            />
            {birthdateTouched &&
              birthdateValidation.errors.map((err, i) => (
                <p
                  key={`edit-bd-err-${i}`}
                  id={i === 0 ? 'edit-birthdate-error' : undefined}
                  role="alert"
                  className="mt-1 flex items-center gap-1.5 rounded-sm border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{err}</span>
                </p>
              ))}
            {!birthdateTouched && birthdateValidation.errors.length > 0 && (
              <p
                id="edit-birthdate-legacy-warning"
                className="border-low-sample/30 bg-low-sample-bg text-low-sample mt-1 flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs font-bold"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{birthdateValidation.errors.join(' ')}</span>
              </p>
            )}
            {birthdateValidation.warnings.map((warn, i) => (
              <p
                key={`edit-bd-warn-${i}`}
                className="mt-1 flex items-center gap-1.5 rounded-sm border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
                type="text"
                inputMode="numeric"
                value={editAgeDisplay}
                readOnly
                aria-readonly="true"
                aria-describedby="edit-age-mos-help"
                className="border-input-border dark:bg-muted/40 w-full cursor-default rounded-md border bg-muted/60 p-2.5 text-center text-sm font-bold text-neutral-900 focus:border-input-border focus:ring-0 focus-visible:outline-none dark:text-foreground"
                required
                id="age-mos"
              />
              <p
                id="edit-age-mos-help"
                className="text-muted-foreground mt-1 text-xs font-semibold"
              >
                {t('registry.calculatedFromBirthDate')}
              </p>
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
                inputMode="decimal"
                onWheel={(e) => e.currentTarget.blur()}
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
                inputMode="decimal"
                onWheel={(e) => e.currentTarget.blur()}
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
              name="gt-edit-leg-color"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
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
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="dark:bg-muted/50 dark:border-border min-w-0 space-y-3 rounded-lg border border-slate-200/40 bg-slate-50/50 p-2.5 sm:p-4">
          <h4 className="flex min-w-0 flex-wrap items-center gap-1.5 border-b pb-1 text-xs font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
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
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <label
                    className="dark:text-card-foreground block min-w-0 text-xs font-black tracking-wider text-slate-800 uppercase break-words"
                    htmlFor="chicken-code"
                  >
                    Permanent Assigned Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setManualCodeOpen(!manualCodeOpen)}
                    className="inline-flex max-w-full min-w-0 cursor-pointer items-center gap-1 text-left text-xs font-bold whitespace-normal text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    <Edit3 className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 break-words">{manualCodeOpen ? 'Lock Identifier' : 'Edit identifier manually'}</span>
                  </button>
                </div>
                {!manualCodeOpen ? (
                  <div className="dark:border-border dark:bg-card flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Lock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <span className="dark:text-card-foreground font-mono text-sm font-extrabold text-slate-800">
                        [{formatBirdCodeForDisplay(editBirdCode) || '—'}]
                      </span>
                    </div>
                    <span className="text-muted-foreground min-w-0 text-xs font-semibold break-words">
                      Permanent Assigned Code
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={editBirdCode}
                      onChange={(e) => setEditBirdCode(e.target.value)}
                      aria-invalid={Boolean(
                        codeProblem ||
                          (saveAttempted &&
                            saveProblems.some((problem) => problem.id === 'chicken-code')),
                      )}
                      aria-describedby={
                        codeProblem ? 'chicken-code-error' : undefined
                      }
                      className="dark:bg-input dark:text-foreground w-full rounded-md border border-emerald-500 bg-white p-2.5 font-mono text-sm font-bold text-neutral-900 focus:border-emerald-500"
                      placeholder="e.g. 1, A, 1A1"
                      id="chicken-code"
                    />
                    <div className="flex items-center justify-between text-xs font-semibold">
                      {editBirdCode.trim() ? (
                        formatCheck && !formatCheck.valid ? (
                          <span id="chicken-code-error" role="alert" className="font-bold text-rose-600 dark:text-rose-400">
                             {formatCheck.error}
                          </span>
                        ) : isDuplicate ? (
                          <span id="chicken-code-error" role="alert" className="font-bold text-rose-600 dark:text-rose-400">
                             Already taken by another chicken
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
                       Changing this will update the official registry code and will be logged in
                      the history audit.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          {(() => {
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
                  aria-invalid={Boolean(
                    (saveAttempted &&
                      saveProblems.some((problem) => problem.id === 'wing-band-id')) ||
                    (wingBandChanged && Boolean(wingBandProblem))
                  )}
                  aria-describedby={
                    (saveAttempted && saveProblems.some((problem) => problem.id === 'wing-band-id')) ||
                    (wingBandChanged && wingBandProblem)
                      ? 'wing-band-error'
                      : undefined
                  }
                  className="border-input-border dark:bg-input dark:text-foreground placeholder:text-muted-foreground w-full rounded-md border bg-white p-2.5 font-mono text-sm font-bold text-neutral-900 focus:border-emerald-500"
                  placeholder="e.g. W-001"
                  id="wing-band-id"
                />
                {saveAttempted &&
                  saveProblems
                    .filter((problem) => problem.id === 'wing-band-id')
                    .map((problem) => (
                      <p
                        key={problem.message}
                        id="wing-band-error"
                        role="alert"
                        className="text-danger mt-1 text-xs font-bold break-words"
                      >
                        {problem.message}
                      </p>
                    ))}
                {!saveAttempted && wingBandChanged && wingBandProblem && (
                  <p
                    id="wing-band-error"
                    role="alert"
                    className="text-danger mt-1 text-xs font-bold break-words"
                  >
                    {wingBandProblem}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                placeholder="External / Unregistered name..."
                compact
                invalid={Boolean(saveAttempted && parentSexError && /sire/i.test(parentSexError))}
                describedBy="edit-parent-error"
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
                placeholder="External / Unregistered name..."
                compact
                invalid={Boolean(saveAttempted && parentSexError && /dam/i.test(parentSexError))}
                describedBy="edit-parent-error"
              />
            </div>
          </div>

          {saveAttempted && parentSexError && (
            <p
              id="edit-parent-error"
              role="alert"
              className="text-danger text-xs font-bold break-words"
            >
              {parentSexError}
            </p>
          )}

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
                nonBlockingError={!declaredChanged}
              />
            </div>
          )}
        </div>

        {declaredChanged && descendants.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
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

        <div className="border-border bg-card sticky bottom-0 z-20 mt-2 flex min-w-0 flex-col-reverse gap-2 border-t py-3 sm:flex-row">
          <button
            type="button"
            onClick={handleClose}
            className="border-border bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground focus-visible:ring-focus-ring focus-visible:ring-offset-background min-h-11 min-w-0 cursor-pointer rounded-md border px-4 py-3 text-xs font-black tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-36"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saveBusy}
            className="bg-brand text-brand-foreground hover:bg-brand-strong focus-visible:ring-focus-ring focus-visible:ring-offset-background flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-extrabold tracking-wider uppercase shadow-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
          >
            {saveBusy && (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            <span className="min-w-0 break-words text-center">
              {photoProcessing
                ? t('editFowl.preparingPhoto')
                : saveBusy
                  ? t('editFowl.saving')
                  : !isDirty
                    ? t('editFowl.noChanges')
                    : t('editFowl.saveChanges')}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
