'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  autoComputeGrowthStage,
  getAgeParts as getAgePartsHelper,
} from '@/lib/helpers';
import { STRAIN_LIST, LEG_COLOR_LIST } from '@/lib/helpers';
import { useDebounce } from '@/lib/use-debounce';
import type { DeclaredBreedShare } from '@/lib/types';
import {
  clearFowlDraft,
  loadFowlDraft,
  saveFowlDraft,
  type CreateDraftFields,
  type DraftRestoreResult,
  type EditDraftFields,
} from '@/lib/fowl-draft';

interface FowlFormStateContextValue {
  newName: string; setNewName: (v: string) => void;
  newBreed: string; setNewBreed: (v: string) => void;
  newGender: string; setNewGender: (v: string) => void;
  newColor: string; setNewColor: (v: string) => void;
  newFeatherColor: string; setNewFeatherColor: (v: string) => void;
  newColorCategory: string; setNewColorCategory: (v: string) => void;
  newGrowthStage: string; setNewGrowthStage: (v: string) => void;
  newBehaviorTrait: string; setNewBehaviorTrait: (v: string) => void;
  newTrait: string; setNewTrait: (v: string) => void;
  newEyeVariant: string; setNewEyeVariant: (v: string) => void;
  newBirthdate: string; setNewBirthdate: (v: string) => void;
  sireName: string; setSireName: (v: string) => void;
  damName: string; setDamName: (v: string) => void;
  sirePct: number | string; setSirePct: (v: number | string) => void;
  damPct: number | string; setDamPct: (v: number | string) => void;
  weight: string; setWeight: (v: string) => void;
  height: string; setHeight: (v: string) => void;
  newLegColor: string; setNewLegColor: (v: string) => void;
  age: string; setAge: (v: string) => void;
  birdCode: string; setBirdCode: (v: string) => void;
  wingBand: string; setWingBand: (v: string) => void;
  newDeclaredComposition: DeclaredBreedShare[] | null;
  setNewDeclaredComposition: (v: DeclaredBreedShare[] | null) => void;
  search: string; setSearch: (v: string) => void;
  debouncedSearch: string;
  selectedImage: File | null; setSelectedImage: (f: File | null) => void;
  selectedPhotoThumbnail: File | null; setSelectedPhotoThumbnail: (f: File | null) => void;
  uploadingImage: boolean; setUploadingImage: (v: boolean) => void;
  photoUploadProgress: number; setPhotoUploadProgress: (v: number) => void;
  beginPhotoUpload: () => AbortSignal;
  endPhotoUpload: () => void;
  cancelPhotoUpload: () => void;
  imagePreview: string; setImagePreview: (v: string) => void;


  editName: string; setEditName: (v: string) => void;
  editBreed: string; setEditBreed: (v: string) => void;
  editGender: string; setEditGender: (v: string) => void;
  editColorCategory: string; setEditColorCategory: (v: string) => void;
  editColor: string; setEditColor: (v: string) => void;
  editFeatherColor: string; setEditFeatherColor: (v: string) => void;
  editBehaviorTrait: string; setEditBehaviorTrait: (v: string) => void;
  editTrait: string; setEditTrait: (v: string) => void;
  editEyeVariant: string; setEditEyeVariant: (v: string) => void;
  editAge: string; setEditAge: (v: string) => void;
  editBirthdate: string; setEditBirthdate: (v: string) => void;
  editGrowthStage: string; setEditGrowthStage: (v: string) => void;
  editWeight: string; setEditWeight: (v: string) => void;
  editHeight: string; setEditHeight: (v: string) => void;
  editLegColor: string; setEditLegColor: (v: string) => void;
  editSire: string; setEditSire: (v: string) => void;
  editDam: string; setEditDam: (v: string) => void;
  editSirePct: number | string; setEditSirePct: (v: number | string) => void;
  editDamPct: number | string; setEditDamPct: (v: number | string) => void;
  editBirdCode: string; setEditBirdCode: (v: string) => void;
  editWingBand: string; setEditWingBand: (v: string) => void;
  editDeclaredComposition: DeclaredBreedShare[] | null;
  setEditDeclaredComposition: (v: DeclaredBreedShare[] | null) => void;
  editPhotoFile: File | null; setEditPhotoFile: (f: File | null) => void;
  editPhotoThumbnail: File | null; setEditPhotoThumbnail: (f: File | null) => void;
  editPhotoRemoved: boolean; setEditPhotoRemoved: (v: boolean) => void;
  editPhotoUploadError: string | null; setEditPhotoUploadError: (v: string | null) => void;

  autoCalcAge: boolean; getAutoCalcAge: () => boolean;

  availableStrains: string[];
  setAvailableStrains: React.Dispatch<React.SetStateAction<string[]>>;
  customStrainNames: Set<string>;
  setCustomStrainNames: React.Dispatch<React.SetStateAction<Set<string>>>;
  strainQuery: string; setStrainQuery: (v: string) => void;
  strainOpen: boolean; setStrainOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  selectedStrains: string[];
  setSelectedStrains: React.Dispatch<React.SetStateAction<string[]>>;
  addStrain: (strain: string) => void;
  removeStrain: (index: number) => void;

  availableLegColors: string[];
  setAvailableLegColors: React.Dispatch<React.SetStateAction<string[]>>;
  customLegColorNames: Set<string>;
  setCustomLegColorNames: React.Dispatch<React.SetStateAction<Set<string>>>;
  legColorQuery: string; setLegColorQuery: (v: string) => void;
  legColorOpen: boolean; setLegColorOpen: (v: boolean | ((o: boolean) => boolean)) => void;

  handleAgeChange: (val: string, genderVal?: string) => void;
  handleEditAgeChange: (val: string, genderVal?: string) => void;
  handleNewBirthdateChange: (val: string) => void;
  handleEditBirthdateChange: (val: string) => void;

  saveCreateDraft: () => boolean;
  restoreCreateDraft: () => DraftRestoreResult;
  clearCreateDraft: () => void;
  saveEditDraft: (fowlId: number | string) => boolean;
  restoreEditDraft: (fowlId: number | string) => DraftRestoreResult;
  clearEditDraft: (fowlId: number | string) => void;
  selectCreatedBreed: (
    target: { kind: 'create' } | { kind: 'edit'; fowlId: number | string },
    name: string,
  ) => void;
  resetCreateForm: () => void;
}

const FowlFormStateContext = createContext<FowlFormStateContextValue | null>(null);

export function useFowlFormState(): FowlFormStateContextValue {
  const ctx = useContext(FowlFormStateContext);
  if (!ctx) throw new Error('useFowlFormState must be used within FowlFormStateProvider');
  return ctx;
}

export function useFowlFormStateOptional(): FowlFormStateContextValue | null {
  return useContext(FowlFormStateContext);
}

export function FowlFormStateProvider({ children }: { children: React.ReactNode }) {
  const [autoCalcAge, setAutoCalcAge] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gallotrack_user_preferences');
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs.auto_calculate_age === false) setAutoCalcAge(false);
      }
    } catch { /* ignore */ }
  }, []);

  function getAutoCalcAge(): boolean {
    return autoCalcAge;
  }
  const [newName, setNewName] = useState('');
  const [newBreed, setNewBreed] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newColorCategory, setNewColorCategory] = useState('');
  const [newGrowthStage, setNewGrowthStage] = useState('');
  const [newBehaviorTrait, setNewBehaviorTrait] = useState('');
  const [newEyeVariant, setNewEyeVariant] = useState('Standard Eye');
  const [newBirthdate, setNewBirthdate] = useState('');
  const [sireName, setSireName] = useState('');
  const [damName, setDamName] = useState('');
  const [sirePct, setSirePct] = useState<number | string>('');
  const [damPct, setDamPct] = useState<number | string>('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [newLegColor, setNewLegColor] = useState('');
  const [age, setAge] = useState('');
  const [birdCode, setBirdCode] = useState('');
  const [wingBand, setWingBand] = useState('');
  const [newDeclaredComposition, setNewDeclaredComposition] = useState<DeclaredBreedShare[] | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedPhotoThumbnail, setSelectedPhotoThumbnail] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const photoUploadAbortRef = useRef<AbortController | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  const beginPhotoUpload = useCallback(() => {
    photoUploadAbortRef.current?.abort();
    const controller = new AbortController();
    photoUploadAbortRef.current = controller;
    return controller.signal;
  }, []);

  const endPhotoUpload = useCallback(() => {
    photoUploadAbortRef.current = null;
  }, []);

  const cancelPhotoUpload = useCallback(() => {
    photoUploadAbortRef.current?.abort();
  }, []);


  const [editName, setEditName] = useState('');
  const [editBreed, setEditBreed] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editColorCategory, setEditColorCategory] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editBehaviorTrait, setEditBehaviorTrait] = useState('');
  const [editEyeVariant, setEditEyeVariant] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [editGrowthStage, setEditGrowthStage] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editLegColor, setEditLegColor] = useState('');
  const [editSire, setEditSire] = useState('');
  const [editDam, setEditDam] = useState('');
  const [editSirePct, setEditSirePct] = useState<number | string>(100);
  const [editDamPct, setEditDamPct] = useState<number | string>(100);
  const [editBirdCode, setEditBirdCode] = useState('');
  const [editWingBand, setEditWingBand] = useState('');
  const [editDeclaredComposition, setEditDeclaredComposition] = useState<DeclaredBreedShare[] | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoThumbnail, setEditPhotoThumbnail] = useState<File | null>(null);
  const [editPhotoRemoved, setEditPhotoRemoved] = useState(false);
  const [editPhotoUploadError, setEditPhotoUploadError] = useState<string | null>(null);

  const [availableStrains, setAvailableStrains] = useState<string[]>(STRAIN_LIST);
  const [customStrainNames, setCustomStrainNames] = useState<Set<string>>(new Set());
  const [strainQuery, setStrainQuery] = useState('');
  const [strainOpen, setStrainOpen] = useState(false);
  const [selectedStrains, setSelectedStrains] = useState<string[]>([]);
  const [availableLegColors, setAvailableLegColors] = useState<string[]>(LEG_COLOR_LIST);
  const [customLegColorNames, setCustomLegColorNames] = useState<Set<string>>(new Set());
  const [legColorQuery, setLegColorQuery] = useState('');
  const [legColorOpen, setLegColorOpen] = useState(false);

  const handleAgeChange = useCallback((val: string, genderVal: string = '') => {
    setAge(val);
    if (val.trim() === '' || isNaN(Number(val))) {
      setNewGrowthStage('');
    } else {
      setNewGrowthStage(autoComputeGrowthStage(Number(val), genderVal || newGender));
    }
  }, [newGender]);

  const handleEditAgeChange = useCallback((val: string, genderVal: string = '') => {
    setEditAge(val);
    if (val.trim() === '' || isNaN(Number(val))) {
      setEditGrowthStage('');
    } else {
      setEditGrowthStage(autoComputeGrowthStage(Number(val), genderVal || editGender));
    }
  }, [editGender]);

  const handleNewBirthdateChange = useCallback((val: string) => {
    setNewBirthdate(val);
    if (!getAutoCalcAge()) {
      setAge('');
      return;
    }
    const parts = getAgePartsHelper(val);
    if (parts) {
      setAge(String(parts.totalMonths));
      setNewGrowthStage(autoComputeGrowthStage(parts.totalMonths, newGender || 'Rooster'));
    } else {
      setAge('');
      setNewGrowthStage('');
    }
  }, [newGender]);

  const handleEditBirthdateChange = useCallback((val: string) => {
    setEditBirthdate(val);
    if (!getAutoCalcAge()) {
      setEditAge('');
      return;
    }
    const parts = getAgePartsHelper(val);
    if (parts) {
      setEditAge(String(parts.totalMonths));
      setEditGrowthStage(autoComputeGrowthStage(parts.totalMonths, editGender || 'Rooster'));
    }
  }, [editGender]);

  const addStrain = useCallback((strain: string) => {
    const trimmed = strain.trim();
    if (!trimmed) return;
    if (!selectedStrains.includes(trimmed)) {
      setSelectedStrains((prev) => [...prev, trimmed]);
    }
    if (!availableStrains.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setAvailableStrains((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
      setCustomStrainNames((prev) => new Set([...prev, trimmed]));
    }
    setStrainQuery('');
    setNewBreed('');
  }, [selectedStrains, availableStrains, setNewBreed]);

  const removeStrain = useCallback((index: number) => {
    setSelectedStrains((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Form drafts (survive the Breed Registry round trip and refreshes) ──
  const getDraftUserId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('gallotrack_user_id');
    } catch {
      return null;
    }
  }, []);

  const buildCreateDraftFields = useCallback((): CreateDraftFields => ({
    newName,
    newBreed,
    newGender,
    newColor,
    newColorCategory,
    newGrowthStage,
    newBehaviorTrait,
    newEyeVariant,
    newBirthdate,
    sireName,
    damName,
    sirePct,
    damPct,
    weight,
    height,
    newLegColor,
    age,
    birdCode,
    wingBand,
    newDeclaredComposition,
    strainQuery,
    selectedStrains,
    legColorQuery,
  }), [
    newName, newBreed, newGender, newColor, newColorCategory, newGrowthStage,
    newBehaviorTrait, newEyeVariant, newBirthdate, sireName, damName, sirePct,
    damPct, weight, height, newLegColor, age, birdCode, wingBand,
    newDeclaredComposition, strainQuery, selectedStrains, legColorQuery,
  ]);

  const buildEditDraftFields = useCallback((): EditDraftFields => ({
    editName,
    editBreed,
    editGender,
    editColorCategory,
    editColor,
    editBehaviorTrait,
    editEyeVariant,
    editAge,
    editBirthdate,
    editGrowthStage,
    editWeight,
    editHeight,
    editLegColor,
    editSire,
    editDam,
    editSirePct,
    editDamPct,
    editBirdCode,
    editWingBand,
    editDeclaredComposition,
  }), [
    editName, editBreed, editGender, editColorCategory, editColor,
    editBehaviorTrait, editEyeVariant, editAge, editBirthdate, editGrowthStage,
    editWeight, editHeight, editLegColor, editSire, editDam, editSirePct,
    editDamPct, editBirdCode, editWingBand, editDeclaredComposition,
  ]);

  const persistCreateDraft = useCallback(
    (overrides?: Partial<CreateDraftFields>) => {
      const userId = getDraftUserId();
      if (!userId) return false;
      return saveFowlDraft({
        kind: 'create',
        userId,
        photoSelected: Boolean(selectedImage || selectedPhotoThumbnail),
        fields: { ...buildCreateDraftFields(), ...overrides },
      });
    },
    [getDraftUserId, buildCreateDraftFields, selectedImage, selectedPhotoThumbnail],
  );

  const persistEditDraft = useCallback(
    (fowlId: number | string, overrides?: Partial<EditDraftFields>) => {
      const userId = getDraftUserId();
      if (!userId) return false;
      return saveFowlDraft({
        kind: 'edit',
        userId,
        fowlId: String(fowlId),
        photoSelected: Boolean(editPhotoFile || editPhotoThumbnail),
        fields: { ...buildEditDraftFields(), ...overrides },
      });
    },
    [getDraftUserId, buildEditDraftFields, editPhotoFile, editPhotoThumbnail],
  );

  const saveCreateDraft = useCallback(() => {
    const hasContent = Boolean(
      newName.trim()
      || newBreed.trim()
      || selectedStrains.length > 0
      || selectedImage
      || selectedPhotoThumbnail
      || newBirthdate
      || sireName.trim()
      || damName.trim()
      || birdCode.trim()
      || wingBand.trim()
      || weight.trim()
      || height.trim()
      || age.trim()
      || newLegColor.trim()
      || newColor.trim()
      || newBehaviorTrait.trim()
      || (newDeclaredComposition && newDeclaredComposition.length > 0),
    );
    if (!hasContent) return false;
    return persistCreateDraft();
  }, [
    newName, newBreed, selectedStrains, selectedImage, selectedPhotoThumbnail, newBirthdate, sireName,
    damName, birdCode, wingBand, weight, height, age, newLegColor, newColor,
    newBehaviorTrait, newDeclaredComposition, persistCreateDraft,
  ]);

  const restoreCreateDraft = useCallback((): DraftRestoreResult => {
    const userId = getDraftUserId();
    if (!userId) return { restored: false, photoSelected: false };
    const draft = loadFowlDraft(userId, 'create');
    if (!draft || draft.kind !== 'create') {
      return { restored: false, photoSelected: false };
    }

    const f = draft.fields;
    setNewName(f.newName ?? '');
    setNewBreed(f.newBreed ?? '');
    setNewGender(f.newGender ?? '');
    setNewColor(f.newColor ?? '');
    setNewColorCategory(f.newColorCategory ?? '');
    setNewGrowthStage(f.newGrowthStage ?? '');
    setNewBehaviorTrait(f.newBehaviorTrait ?? '');
    setNewEyeVariant(f.newEyeVariant || 'Standard Eye');
    setNewBirthdate(f.newBirthdate ?? '');
    setSireName(f.sireName ?? '');
    setDamName(f.damName ?? '');
    setSirePct(f.sirePct ?? '');
    setDamPct(f.damPct ?? '');
    setWeight(f.weight ?? '');
    setHeight(f.height ?? '');
    setNewLegColor(f.newLegColor ?? '');
    setAge(f.age ?? '');
    setBirdCode(f.birdCode ?? '');
    setWingBand(f.wingBand ?? '');
    setNewDeclaredComposition(f.newDeclaredComposition ?? null);
    setStrainQuery(f.strainQuery ?? '');
    setSelectedStrains(Array.isArray(f.selectedStrains) ? f.selectedStrains : []);
    setLegColorQuery(f.legColorQuery ?? '');

    return { restored: true, photoSelected: draft.photoSelected };
  }, [getDraftUserId]);

  const clearCreateDraft = useCallback(() => {
    clearFowlDraft(getDraftUserId(), 'create');
  }, [getDraftUserId]);

  const saveEditDraft = useCallback(
    (fowlId: number | string) => persistEditDraft(fowlId),
    [persistEditDraft],
  );

  const restoreEditDraft = useCallback((fowlId: number | string): DraftRestoreResult => {
    const userId = getDraftUserId();
    if (!userId) return { restored: false, photoSelected: false };
    const draft = loadFowlDraft(userId, 'edit', fowlId);
    if (!draft || draft.kind !== 'edit') {
      return { restored: false, photoSelected: false };
    }

    const f = draft.fields;
    setEditName(f.editName ?? '');
    setEditBreed(f.editBreed ?? '');
    setEditGender(f.editGender ?? '');
    setEditColorCategory(f.editColorCategory ?? '');
    setEditColor(f.editColor ?? '');
    setEditBehaviorTrait(f.editBehaviorTrait ?? '');
    setEditEyeVariant(f.editEyeVariant ?? '');
    setEditAge(f.editAge ?? '');
    setEditBirthdate(f.editBirthdate ?? '');
    setEditGrowthStage(f.editGrowthStage ?? '');
    setEditWeight(f.editWeight ?? '');
    setEditHeight(f.editHeight ?? '');
    setEditLegColor(f.editLegColor ?? '');
    setEditSire(f.editSire ?? '');
    setEditDam(f.editDam ?? '');
    setEditSirePct(f.editSirePct ?? '');
    setEditDamPct(f.editDamPct ?? '');
    setEditBirdCode(f.editBirdCode ?? '');
    setEditWingBand(f.editWingBand ?? '');
    setEditDeclaredComposition(f.editDeclaredComposition ?? null);

    return { restored: true, photoSelected: draft.photoSelected };
  }, [getDraftUserId]);

  const clearEditDraft = useCallback((fowlId: number | string) => {
    clearFowlDraft(getDraftUserId(), 'edit', fowlId);
  }, [getDraftUserId]);

  const selectCreatedBreed = useCallback((
    target: { kind: 'create' } | { kind: 'edit'; fowlId: number | string },
    name: string,
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (target.kind === 'create') {
      const nextSelected = selectedStrains.includes(trimmed)
        ? selectedStrains
        : [...selectedStrains, trimmed];
      setSelectedStrains(nextSelected);
      setStrainQuery('');
      setNewBreed('');
      if (!availableStrains.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
        setAvailableStrains((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
        setCustomStrainNames((prev) => new Set([...prev, trimmed]));
      }
      persistCreateDraft({
        selectedStrains: nextSelected,
        strainQuery: '',
        newBreed: '',
      });
      return;
    }

    setEditBreed(trimmed);
    persistEditDraft(target.fowlId, { editBreed: trimmed });
  }, [selectedStrains, availableStrains, persistCreateDraft, persistEditDraft]);

  const resetCreateForm = useCallback(() => {
    setNewName('');
    setNewBreed('');
    setNewGender('');
    setNewColor('');
    setNewColorCategory('');
    setNewGrowthStage('');
    setNewBehaviorTrait('');
    setNewEyeVariant('Standard Eye');
    setNewBirthdate('');
    setSireName('');
    setDamName('');
    setSirePct('');
    setDamPct('');
    setWeight('');
    setHeight('');
    setNewLegColor('');
    setAge('');
    setBirdCode('');
    setWingBand('');
    setNewDeclaredComposition(null);
    setStrainQuery('');
    setStrainOpen(false);
    setSelectedStrains([]);
    setLegColorQuery('');
    setLegColorOpen(false);
    setSelectedImage(null);
    setSelectedPhotoThumbnail(null);
    setPhotoUploadProgress(0);
    cancelPhotoUpload();
    setImagePreview('');
    setUploadingImage(false);
  }, [cancelPhotoUpload]);

  // Keep the session draft in sync while the user types so a refresh never
  // loses the registration form.
  useEffect(() => {
    if (!getDraftUserId()) return;
    const hasContent = Boolean(
      newName.trim()
      || newBreed.trim()
      || selectedStrains.length > 0
      || selectedImage
      || selectedPhotoThumbnail
      || newBirthdate
      || sireName.trim()
      || damName.trim()
      || birdCode.trim()
      || wingBand.trim()
      || weight.trim()
      || height.trim()
      || age.trim()
      || newLegColor.trim()
      || newColor.trim()
      || newBehaviorTrait.trim()
      || (newDeclaredComposition && newDeclaredComposition.length > 0),
    );
    if (hasContent) persistCreateDraft();
  }, [
    getDraftUserId, persistCreateDraft, newName, newBreed, selectedStrains,
    selectedImage, selectedPhotoThumbnail, newBirthdate, sireName, damName, birdCode, wingBand, weight,
    height, age, newLegColor, newColor, newBehaviorTrait, newDeclaredComposition,
  ]);

  const value: FowlFormStateContextValue = {
    newName, setNewName, newBreed, setNewBreed, newGender, setNewGender,
    newColor, setNewColor, newFeatherColor: newColor, setNewFeatherColor: setNewColor,
    newColorCategory, setNewColorCategory,
    newGrowthStage, setNewGrowthStage, newBehaviorTrait, setNewBehaviorTrait,
    newTrait: newBehaviorTrait, setNewTrait: setNewBehaviorTrait,
    newEyeVariant, setNewEyeVariant, newBirthdate, setNewBirthdate,
    sireName, setSireName, damName, setDamName,
    sirePct, setSirePct, damPct, setDamPct,
    weight, setWeight, height, setHeight,
    newLegColor, setNewLegColor, age, setAge,
    birdCode, setBirdCode, wingBand, setWingBand,
    newDeclaredComposition, setNewDeclaredComposition,
    search, setSearch, debouncedSearch,
    selectedImage, setSelectedImage, selectedPhotoThumbnail, setSelectedPhotoThumbnail,
    uploadingImage, setUploadingImage, photoUploadProgress, setPhotoUploadProgress,
    beginPhotoUpload, endPhotoUpload, cancelPhotoUpload,
    imagePreview, setImagePreview,

    editName, setEditName, editBreed, setEditBreed,
    editGender, setEditGender, editColorCategory, setEditColorCategory,
    editColor, setEditColor, editFeatherColor: editColor, setEditFeatherColor: setEditColor,
    editBehaviorTrait, setEditBehaviorTrait, editTrait: editBehaviorTrait, setEditTrait: setEditBehaviorTrait,
    editEyeVariant, setEditEyeVariant, editAge, setEditAge,
    editBirthdate, setEditBirthdate, editGrowthStage, setEditGrowthStage,
    editWeight, setEditWeight, editHeight, setEditHeight,
    editLegColor, setEditLegColor, editSire, setEditSire,
    editDam, setEditDam, editSirePct, setEditSirePct, editDamPct, setEditDamPct,
    editBirdCode, setEditBirdCode, editWingBand, setEditWingBand,
    editDeclaredComposition, setEditDeclaredComposition,
    editPhotoFile, setEditPhotoFile, editPhotoThumbnail, setEditPhotoThumbnail,
    editPhotoRemoved, setEditPhotoRemoved, editPhotoUploadError, setEditPhotoUploadError,
    availableStrains, setAvailableStrains, customStrainNames, setCustomStrainNames,
    strainQuery, setStrainQuery, strainOpen, setStrainOpen,
    selectedStrains, setSelectedStrains, addStrain, removeStrain,
    availableLegColors, setAvailableLegColors, customLegColorNames, setCustomLegColorNames,
    legColorQuery, setLegColorQuery, legColorOpen, setLegColorOpen,
    handleAgeChange, handleEditAgeChange, handleNewBirthdateChange, handleEditBirthdateChange,
    autoCalcAge, getAutoCalcAge,
    saveCreateDraft, restoreCreateDraft, clearCreateDraft,
    saveEditDraft, restoreEditDraft, clearEditDraft,
    selectCreatedBreed, resetCreateForm,
  };

  return <FowlFormStateContext.Provider value={value}>{children}</FowlFormStateContext.Provider>;
}

