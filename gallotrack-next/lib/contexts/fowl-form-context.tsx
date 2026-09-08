'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  autoComputeGrowthStage,
  getAgeParts as getAgePartsHelper,
} from '@/lib/helpers';
import { STRAIN_LIST, LEG_COLOR_LIST } from '@/lib/helpers';
import { useDebounce } from '@/lib/use-debounce';

interface FowlFormStateContextValue {
  newName: string; setNewName: (v: string) => void;
  newBreed: string; setNewBreed: (v: string) => void;
  newGender: string; setNewGender: (v: string) => void;
  newColor: string; setNewColor: (v: string) => void;
  newColorCategory: string; setNewColorCategory: (v: string) => void;
  newGrowthStage: string; setNewGrowthStage: (v: string) => void;
  newBehaviorTrait: string; setNewBehaviorTrait: (v: string) => void;
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
  search: string; setSearch: (v: string) => void;
  debouncedSearch: string;
  selectedImage: File | null; setSelectedImage: (f: File | null) => void;
  uploadingImage: boolean; setUploadingImage: (v: boolean) => void;
  imagePreview: string; setImagePreview: (v: string) => void;

  selectedFowlForMatch: string; setSelectedFowlForMatch: (v: string) => void;
  matchDate: string; setMatchDate: (v: string) => void;
  opponentName: string; setOpponentName: (v: string) => void;
  opponentBreed: string; setOpponentBreed: (v: string) => void;
  matchLocation: string; setMatchLocation: (v: string) => void;
  matchType: string; setMatchType: (v: string) => void;
  matchOutcome: string; setMatchOutcome: (v: string) => void;
  matchPostFight: string; setMatchPostFight: (v: string) => void;
  matchVideoFile: File | null; setMatchVideoFile: (f: File | null) => void;
  uploadingVideo: boolean; setUploadingVideo: (v: boolean) => void;

  editName: string; setEditName: (v: string) => void;
  editBreed: string; setEditBreed: (v: string) => void;
  editGender: string; setEditGender: (v: string) => void;
  editColorCategory: string; setEditColorCategory: (v: string) => void;
  editColor: string; setEditColor: (v: string) => void;
  editBehaviorTrait: string; setEditBehaviorTrait: (v: string) => void;
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
}

const FowlFormStateContext = createContext<FowlFormStateContextValue | null>(null);

export function useFowlFormState(): FowlFormStateContextValue {
  const ctx = useContext(FowlFormStateContext);
  if (!ctx) throw new Error('useFowlFormState must be used within FowlFormStateProvider');
  return ctx;
}

export function FowlFormStateProvider({ children }: { children: React.ReactNode }) {
  const [newName, setNewName] = useState('');
  const [newBreed, setNewBreed] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newColor, setNewColor] = useState('Bright Red');
  const [newColorCategory, setNewColorCategory] = useState('Red');
  const [newGrowthStage, setNewGrowthStage] = useState('');
  const [newBehaviorTrait, setNewBehaviorTrait] = useState('Wave-Motion Tracker');
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
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const [selectedFowlForMatch, setSelectedFowlForMatch] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [opponentBreed, setOpponentBreed] = useState('');
  const [matchLocation, setMatchLocation] = useState('');
  const [matchType, setMatchType] = useState('Derby Match');
  const [matchOutcome, setMatchOutcome] = useState('Win');
  const [matchPostFight, setMatchPostFight] = useState('Fit / Recovered');
  const [matchVideoFile, setMatchVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

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

  const value: FowlFormStateContextValue = {
    newName, setNewName, newBreed, setNewBreed, newGender, setNewGender,
    newColor, setNewColor, newColorCategory, setNewColorCategory,
    newGrowthStage, setNewGrowthStage, newBehaviorTrait, setNewBehaviorTrait,
    newEyeVariant, setNewEyeVariant, newBirthdate, setNewBirthdate,
    sireName, setSireName, damName, setDamName,
    sirePct, setSirePct, damPct, setDamPct,
    weight, setWeight, height, setHeight,
    newLegColor, setNewLegColor, age, setAge,
    search, setSearch, debouncedSearch,
    selectedImage, setSelectedImage, uploadingImage, setUploadingImage,
    imagePreview, setImagePreview,
    selectedFowlForMatch, setSelectedFowlForMatch,
    matchDate, setMatchDate,
    opponentName, setOpponentName, opponentBreed, setOpponentBreed,
    matchLocation, setMatchLocation, matchType, setMatchType,
    matchOutcome, setMatchOutcome, matchPostFight, setMatchPostFight,
    matchVideoFile, setMatchVideoFile, uploadingVideo, setUploadingVideo,
    editName, setEditName, editBreed, setEditBreed,
    editGender, setEditGender, editColorCategory, setEditColorCategory,
    editColor, setEditColor, editBehaviorTrait, setEditBehaviorTrait,
    editEyeVariant, setEditEyeVariant, editAge, setEditAge,
    editBirthdate, setEditBirthdate, editGrowthStage, setEditGrowthStage,
    editWeight, setEditWeight, editHeight, setEditHeight,
    editLegColor, setEditLegColor, editSire, setEditSire,
    editDam, setEditDam, editSirePct, setEditSirePct, editDamPct, setEditDamPct,
    availableStrains, setAvailableStrains, customStrainNames, setCustomStrainNames,
    strainQuery, setStrainQuery, strainOpen, setStrainOpen,
    selectedStrains, setSelectedStrains, addStrain, removeStrain,
    availableLegColors, setAvailableLegColors, customLegColorNames, setCustomLegColorNames,
    legColorQuery, setLegColorQuery, legColorOpen, setLegColorOpen,
    handleAgeChange, handleEditAgeChange, handleNewBirthdateChange, handleEditBirthdateChange,
  };

  return <FowlFormStateContext.Provider value={value}>{children}</FowlFormStateContext.Provider>;
}
