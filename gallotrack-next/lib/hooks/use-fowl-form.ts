'use client';
import { useState, useCallback } from 'react';
import {
  autoComputeGrowthStage,
  getAgeParts as getAgePartsHelper,
} from '@/lib/helpers';
import type { FowlRecord } from '@/lib/types';

export interface FowlFormState {
  newName: string;
  newBreed: string;
  newGender: string;
  newColor: string;
  newColorCategory: string;
  newGrowthStage: string;
  newBehaviorTrait: string;
  newEyeVariant: string;
  newBirthdate: string;
  sireName: string;
  damName: string;
  sirePct: number | string;
  damPct: number | string;
  weight: string;
  height: string;
  newLegColor: string;
  age: string;
  search: string;
  selectedImage: File | null;
  uploadingImage: boolean;
  imagePreview: string;
}

export interface MatchFormState {
  selectedFowlForMatch: string;
  matchDate: string;
  opponentName: string;
  opponentBreed: string;
  matchLocation: string;
  matchType: string;
  matchOutcome: string;
  matchPostFight: string;
  matchVideoFile: File | null;
  uploadingVideo: boolean;
}

export interface EditFormState {
  editName: string;
  editBreed: string;
  editGender: string;
  editColorCategory: string;
  editColor: string;
  editBehaviorTrait: string;
  editEyeVariant: string;
  editAge: string;
  editBirthdate: string;
  editGrowthStage: string;
  editWeight: string;
  editHeight: string;
  editLegColor: string;
  editSire: string;
  editDam: string;
  editSirePct: number | string;
  editDamPct: number | string;
}

export function useFowlForm() {
  const [form, setForm] = useState<FowlFormState>({
    newName: '',
    newBreed: '',
    newGender: '',
    newColor: 'Bright Red',
    newColorCategory: 'Red',
    newGrowthStage: '',
    newBehaviorTrait: 'Wave-Motion Tracker',
    newEyeVariant: 'Standard Eye',
    newBirthdate: '',
    sireName: '',
    damName: '',
    sirePct: '',
    damPct: '',
    weight: '',
    height: '',
    newLegColor: '',
    age: '',
    search: '',
    selectedImage: null,
    uploadingImage: false,
    imagePreview: '',
  });

  const setField = useCallback(<K extends keyof FowlFormState>(key: K, value: FowlFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      newName: '',
      newBreed: '',
      newGender: '',
      newColor: 'Bright Red',
      newColorCategory: 'Red',
      newGrowthStage: '',
      newBehaviorTrait: 'Wave-Motion Tracker',
      newEyeVariant: 'Standard Eye',
      newBirthdate: '',
      sireName: '',
      damName: '',
      sirePct: '',
      damPct: '',
      weight: '',
      height: '',
      newLegColor: '',
      age: '',
      search: '',
      selectedImage: null,
      uploadingImage: false,
      imagePreview: '',
    });
  }, []);

  const handleAgeChange = useCallback((val: string, genderVal: string = '') => {
    setForm((prev) => ({
      ...prev,
      age: val,
      newGrowthStage: val.trim() === '' || isNaN(Number(val))
        ? ''
        : autoComputeGrowthStage(Number(val), genderVal || prev.newGender),
    }));
  }, []);

  const handleBirthdateChange = useCallback((val: string) => {
    setForm((prev) => {
      const parts = getAgePartsHelper(val);
      return {
        ...prev,
        newBirthdate: val,
        age: parts ? String(parts.totalMonths) : '',
        newGrowthStage: parts
          ? autoComputeGrowthStage(parts.totalMonths, prev.newGender || 'Rooster')
          : '',
      };
    });
  }, []);

  return {
    form,
    setField,
    resetForm,
    handleAgeChange,
    handleBirthdateChange,
  };
}

export function useMatchForm() {
  const [form, setForm] = useState<MatchFormState>({
    selectedFowlForMatch: '',
    matchDate: '',
    opponentName: '',
    opponentBreed: '',
    matchLocation: '',
    matchType: 'Derby Match',
    matchOutcome: 'Win',
    matchPostFight: 'Fit / Recovered',
    matchVideoFile: null,
    uploadingVideo: false,
  });

  const setField = useCallback(<K extends keyof MatchFormState>(key: K, value: MatchFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      selectedFowlForMatch: '',
      matchDate: '',
      opponentName: '',
      opponentBreed: '',
      matchLocation: '',
      matchType: 'Derby Match',
      matchOutcome: 'Win',
      matchPostFight: 'Fit / Recovered',
      matchVideoFile: null,
      uploadingVideo: false,
    });
  }, []);

  return { form, setField, resetForm };
}

export function useEditForm() {
  const [form, setForm] = useState<EditFormState>({
    editName: '',
    editBreed: '',
    editGender: '',
    editColorCategory: '',
    editColor: '',
    editBehaviorTrait: '',
    editEyeVariant: '',
    editAge: '',
    editBirthdate: '',
    editGrowthStage: '',
    editWeight: '',
    editHeight: '',
    editLegColor: '',
    editSire: '',
    editDam: '',
    editSirePct: 100,
    editDamPct: 100,
  });

  const setField = useCallback(<K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const populateFromFowl = useCallback((fowl: FowlRecord) => {
    const parsedAge = fowl.age ? Number(fowl.age.replace(/[^0-9.]/g, '')) : 0;
    setForm({
      editName: fowl.name,
      editBreed: fowl.breed,
      editGender: fowl.gender,
      editColorCategory: fowl.color_category || 'Red',
      editColor: fowl.color || 'Bright Red',
      editBehaviorTrait: fowl.behavior_trait || 'Wave-Motion Tracker',
      editEyeVariant: fowl.eye_variant || 'Standard Eye',
      editAge: fowl.age ? fowl.age.replace(' Months', '') : '',
      editBirthdate: fowl.birthdate || '',
      editGrowthStage: fowl.growth_stage || autoComputeGrowthStage(isNaN(parsedAge) ? 0 : parsedAge, fowl.gender),
      editWeight: fowl.weight ? fowl.weight.replace(' kg', '') : '',
      editHeight: fowl.height ? fowl.height.replace(' cm', '') : '',
      editLegColor: fowl.leg_color || 'N/A',
      editSire: fowl.sire || '',
      editDam: fowl.dam || '',
      editSirePct: fowl.sire === 'Foundation Stock' ? 100 : (fowl.sire_pct ?? 0),
      editDamPct: fowl.dam === 'Foundation Stock' ? 100 : (fowl.dam_pct ?? 0),
    });
  }, []);

  const handleAgeChange = useCallback((val: string, genderVal: string = '') => {
    setForm((prev) => ({
      ...prev,
      editAge: val,
      editGrowthStage: val.trim() === '' || isNaN(Number(val))
        ? ''
        : autoComputeGrowthStage(Number(val), genderVal || prev.editGender),
    }));
  }, []);

  const handleBirthdateChange = useCallback((val: string) => {
    setForm((prev) => {
      const parts = getAgePartsHelper(val);
      return {
        ...prev,
        editBirthdate: val,
        editAge: parts ? String(parts.totalMonths) : '',
        editGrowthStage: parts
          ? autoComputeGrowthStage(parts.totalMonths, prev.editGender || 'Rooster')
          : '',
      };
    });
  }, []);

  return { form, setField, populateFromFowl, handleAgeChange, handleBirthdateChange };
}
