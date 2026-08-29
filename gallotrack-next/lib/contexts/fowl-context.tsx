'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/registry';
import { useDebounce } from '@/lib/use-debounce';
import { useAuth } from './auth-context';
import { useUI } from './ui-context';
import {
  STRAIN_LIST,
  LEG_COLOR_LIST,
  isMale as isMaleHelper,
  isFemale as isFemaleHelper,
  isFoundationStock,
  generationOfName as generationOfNameHelper,
  generationOf as generationOfHelper,
  generationPurity,
  generationInfo,
  parentBloodlinePct as parentBloodlinePctHelper,
  bloodlineOf,
  formatShortDate,
  getAgeParts as getAgePartsHelper,
  getAgeLabel,
  getAgeExact,
  getAgeMetrics,
  autoComputeGrowthStage,
  getSiblingRelations as getSiblingRelationsHelper,
  getMilestoneInfo as getMilestoneInfoHelper,
  getArchiveBadgeStyle,
  matchSurvivability,
  calculatePairingStats,
  cleanPct as cleanPctHelper,
} from '@/lib/helpers';
import { generateBloodlineReport, generateFarmBloodlineSummary } from '@/lib/bloodlines';
import { generateColorReport } from '@/lib/color-genetics';
import { generateBreedCompliance } from '@/lib/breed-standards';
import type { BloodlineReport } from '@/lib/bloodlines';
import type {
  FowlRecord,
  MatchRecord,
  AgeParts,
  SiblingRelation,
  PairingAnalytics,
} from '@/lib/types';

interface FowlContextValue {
  fowls: FowlRecord[];
  setFowls: React.Dispatch<React.SetStateAction<FowlRecord[]>>;
  activeFowls: FowlRecord[];
  maleActiveFowls: FowlRecord[];
  femaleActiveFowls: FowlRecord[];
  archivedFowls: FowlRecord[];
  deceasedFowls: FowlRecord[];
  matchHistory: MatchRecord[];
  setMatchHistory: React.Dispatch<React.SetStateAction<MatchRecord[]>>;
  loading: boolean;
  setLoading: (v: boolean) => void;

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
  deleteCustomStrain: (name: string) => Promise<void>;
  strainQuery: string; setStrainQuery: (v: string) => void;
  strainOpen: boolean; setStrainOpen: (v: boolean | ((o: boolean) => boolean)) => void;

  availableLegColors: string[];
  setAvailableLegColors: React.Dispatch<React.SetStateAction<string[]>>;
  customLegColorNames: Set<string>;
  deleteCustomLegColor: (name: string) => Promise<void>;
  legColorQuery: string; setLegColorQuery: (v: string) => void;
  legColorOpen: boolean; setLegColorOpen: (v: boolean | ((o: boolean) => boolean)) => void;

  pairingAnalytics: PairingAnalytics;
  crossbreedChartData: { labels: string[]; data: number[]; hasData: boolean };
  winRatePct: number;
  winsCount: number;
  lossesCount: number;
  monthLabels: string[];
  matchesByMonth: number[];
  winsByMonth: number[];
  activeSpark: number[];
  trendWinRate: number[];
  upcomingMilestones: { fowl: FowlRecord; info: NonNullable<ReturnType<typeof getMilestoneInfoHelper>> }[];
  dateRangeLabel: string;
  nextNodeId: string;
  dataCompleteness: number;
  validationPassed: boolean;
  bloodlineVerified: boolean;
  computedBloodlinePct: number;
  offspringGenInfo: { short: string; label: string; desc: string; tone: string };
  sireGenInfo: { short: string; label: string; desc: string; tone: string };
  damGenInfo: { short: string; label: string; desc: string; tone: string };
  sireGen: number;
  damGen: number;

  handleAddFowl: (e: React.FormEvent) => Promise<void>;
  handleAddMatchRecord: (e: React.FormEvent) => Promise<void>;
  handleUpdateFowl: (e: React.FormEvent) => Promise<void>;
  handleOpenEditModal: (fowl: FowlRecord) => void;
  handleArchiveFowlOnly: (id: number) => Promise<void>;
  handleArchiveFowlWithReason: () => Promise<void>;
  handleRestoreFowlOnly: (id: number) => Promise<void>;
  handlePermanentDelete: () => Promise<void>;
  handleMarkFowlDeceased: () => Promise<void>;
  fetchDatabaseResources: () => Promise<void>;

  handleAgeChange: (val: string, genderVal?: string) => void;
  handleEditAgeChange: (val: string, genderVal?: string) => void;
  handleNewBirthdateChange: (val: string) => void;
  handleEditBirthdateChange: (val: string) => void;

  generationOf: (f: FowlRecord) => number;
  parentBloodlinePct: (f: FowlRecord) => number;
  getSiblingRelations: (f: FowlRecord) => SiblingRelation[];
  getAgeParts: (bd?: string | null) => AgeParts | null;
  getAgeLabel: (parts: AgeParts) => string;
  getAgeExact: (parts: AgeParts) => string;
  getAgeMetrics: (parts: AgeParts) => string;
  generationPurity: (gen: number) => number;
  generationInfo: (gen: number) => { short: string; label: string; desc: string; tone: string };
  bloodlineOf: (f: FowlRecord) => number;
  cleanPct: (v: unknown) => number;
  getMilestoneInfo: (birthdate?: string | null, gender?: string) => ReturnType<typeof getMilestoneInfoHelper>;
  getArchiveBadgeStyle: (reason: string) => { label: string; bg: string };
  autoComputeGrowthStage: (ageMonths: number, gender: string) => string;
  matchSurvivability: (m: { post_fight_condition?: string; outcome?: string }) => number | null;
  isMale: (g?: string) => boolean;
  isFemale: (g?: string) => boolean;
  isFoundationStock: (name: string) => boolean;

  generateBloodlineReport: (fowl: FowlRecord) => BloodlineReport;
  getFarmBloodlineSummary: () => {
    strainDistribution: Record<string, number>;
    crossPatterns: { pattern: string; count: number; avgVigor: number; tier: string }[];
    avgPurity: number;
    avgHybridVigor: number;
    inbreedingRisk: number;
    totalFowls: number;
    strainRankings: { strain: string; count: number; avgWinRate: number }[];
    topCrosses: { pattern: string; tier: string; vigor: number }[];
  };

  deathReasonInput: string; setDeathReasonInput: (v: string) => void;
  archiveReasonInput: string; setArchiveReasonInput: (v: string) => void;
  breakdownTab: 'individual' | 'strain' | 'pairing';
  setBreakdownTab: (v: 'individual' | 'strain' | 'pairing') => void;
  dateRangePreset: '7d' | '30d' | 'month' | '3m' | 'all';
  setDateRangePreset: (v: '7d' | '30d' | 'month' | '3m' | 'all') => void;
  dateRangeOpen: boolean;
  setDateRangeOpen: (v: boolean | ((o: boolean) => boolean)) => void;
}

const FowlContext = createContext<FowlContextValue | null>(null);

export function useFowl(): FowlContextValue {
  const ctx = useContext(FowlContext);
  if (!ctx) throw new Error('useFowl must be used within FowlProvider');
  return ctx;
}

export function FowlProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const ui = useUI();

  const [fowls, setFowls] = useState<FowlRecord[]>([]);
  const activeFowls = fowls.filter(f => f.status === 'Active' || !f.status || f.status === 'active');
  const archivedFowls = fowls.filter(f => f.status === 'Archived');
  const deceasedFowls = fowls.filter(f => f.status === 'Deceased');
  const maleActiveFowls = activeFowls.filter(f => isMaleHelper(f.gender));
  const femaleActiveFowls = activeFowls.filter(f => isFemaleHelper(f.gender));

  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(false);

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

  const [availableLegColors, setAvailableLegColors] = useState<string[]>(LEG_COLOR_LIST);
  const [customLegColorNames, setCustomLegColorNames] = useState<Set<string>>(new Set());
  const [legColorQuery, setLegColorQuery] = useState('');
  const [legColorOpen, setLegColorOpen] = useState(false);

  const [deathReasonInput, setDeathReasonInput] = useState('Illness');
  const [archiveReasonInput, setArchiveReasonInput] = useState('SOLD');
  const [breakdownTab, setBreakdownTab] = useState<'individual' | 'strain' | 'pairing'>('individual');
  const [dateRangePreset, setDateRangePreset] = useState<'7d' | '30d' | 'month' | '3m' | 'all'>('7d');
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const fetchStrains = useCallback(async (): Promise<string[]> => {
    let names: string[] = [];
    let allNames: string[] = [];
    try {
      const { data, error } = await supabase
        .from('strains')
        .select('name')
        .is('deleted_at', null)
        .order('name', { ascending: true });
      if (!error && data) {
        names = data.map((row: { name: string }) => row.name);
      }
      const { data: allData } = await supabase.from('strains').select('name');
      if (allData) allNames = allData.map((r: { name: string }) => r.name);
    } catch (err) {
      console.error('Failed to fetch strains:', err);
    }
    const missing = STRAIN_LIST.filter((d) => !allNames.some((n) => n.toLowerCase() === d.toLowerCase()));
    if (missing.length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('strains').insert(missing.map((name) => ({ name, is_custom: false, created_by: user?.id || null })));
        names = [...names, ...missing];
      } catch { /* non-critical */ }
    }
    const merged = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    setAvailableStrains(merged);
    setCustomStrainNames(new Set(merged));
    return merged;
  }, []);

  const saveCustomStrain = useCallback(async (name?: string): Promise<void> => {
    const cleaned = (name || '').trim();
    if (!cleaned) return;
    if (availableStrains.some((s) => s.toLowerCase() === cleaned.toLowerCase())) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('strains')
        .insert({ name: cleaned, is_custom: true, created_by: user?.id || null });
      if (error) {
        if ((error.message || '').toLowerCase().includes('duplicate') || error.code === '23505') {
          fetchStrains();
        }
        return;
      }
      setAvailableStrains((prev) =>
        Array.from(new Set([...prev, cleaned])).sort((a, b) => a.localeCompare(b))
      );
    } catch { /* non-critical, fowl still saves */ }
  }, [availableStrains, fetchStrains]);

  const deleteCustomStrain = useCallback(async (name: string): Promise<void> => {
    const cleaned = name.trim();
    if (!cleaned) return;
    try {
      const { error } = await supabase
        .from('strains')
        .update({ deleted_at: new Date().toISOString() })
        .eq('name', cleaned)
        .is('deleted_at', null);
      if (!error) {
        setAvailableStrains((prev) => prev.filter((s) => s !== cleaned));
        setCustomStrainNames((prev) => { const n = new Set(prev); n.delete(cleaned); return n; });
        ui.showToastMessage(`Strain "${cleaned}" deleted.`, 'success');
      }
    } catch { /* non-critical */ }
  }, [ui]);

  const fetchLegColors = useCallback(async (): Promise<string[]> => {
    let names: string[] = [];
    let allNames: string[] = [];
    try {
      const { data, error } = await supabase
        .from('leg_colors')
        .select('name')
        .is('deleted_at', null)
        .order('name', { ascending: true });
      if (!error && data) {
        names = data.map((row: { name: string }) => row.name);
      }
      const { data: allData } = await supabase.from('leg_colors').select('name');
      if (allData) allNames = allData.map((r: { name: string }) => r.name);
    } catch (err) {
      console.error('Failed to fetch leg colors:', err);
    }
    const missing = LEG_COLOR_LIST.filter((d) => !allNames.some((n) => n.toLowerCase() === d.toLowerCase()));
    if (missing.length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('leg_colors').insert(missing.map((name) => ({ name, is_custom: false, created_by: user?.id || null })));
        names = [...names, ...missing];
      } catch { /* non-critical */ }
    }
    const merged = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    setAvailableLegColors(merged);
    setCustomLegColorNames(new Set(merged));
    return merged;
  }, []);

  const saveCustomLegColor = useCallback(async (name?: string): Promise<void> => {
    const cleaned = (name || '').trim();
    if (!cleaned) return;
    if (availableLegColors.some((s) => s.toLowerCase() === cleaned.toLowerCase())) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('leg_colors')
        .insert({ name: cleaned, is_custom: true, created_by: user?.id || null });
      if (error) {
        if ((error.message || '').toLowerCase().includes('duplicate') || error.code === '23505') {
          fetchLegColors();
        }
        return;
      }
      setAvailableLegColors((prev) =>
        Array.from(new Set([...prev, cleaned])).sort((a, b) => a.localeCompare(b))
      );
    } catch { /* non-critical */ }
  }, [availableLegColors, fetchLegColors]);

  const deleteCustomLegColor = useCallback(async (name: string): Promise<void> => {
    const cleaned = name.trim();
    if (!cleaned) return;
    try {
      const { error } = await supabase
        .from('leg_colors')
        .update({ deleted_at: new Date().toISOString() })
        .eq('name', cleaned)
        .is('deleted_at', null);
      if (!error) {
        setAvailableLegColors((prev) => prev.filter((s) => s !== cleaned));
        setCustomLegColorNames((prev) => { const n = new Set(prev); n.delete(cleaned); return n; });
        ui.showToastMessage(`Leg color "${cleaned}" deleted.`, 'success');
      }
    } catch { /* non-critical */ }
  }, [ui]);

  const fetchDatabaseResources = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const activeUserId = user?.id;

      if (!activeUserId) {
        setFowls([]);
        setMatchHistory([]);
        return;
      }

      const { data: fowlData, error: fowlErr } = await supabase
        .from('fowl')
        .select('*')
        .eq('user_id', activeUserId)
        .order('id', { ascending: false });

      if (!fowlErr && fowlData) {
        setFowls(fowlData);
      } else {
        setFowls([]);
      }

      const { data: matchData, error: matchErr } = await supabase
        .from('match')
        .select('*')
        .eq('user_id', activeUserId)
        .order('id', { ascending: false });

      if (!matchErr && matchData) {
        setMatchHistory(matchData);
      } else {
        setMatchHistory([]);
      }
      fetchStrains();
      fetchLegColors();
    } catch (err) {
      console.error('Failed to fetch database resources:', err);
      setFowls([]);
      setMatchHistory([]);
    } finally {
      setLoading(false);
    }
  }, [fetchStrains, fetchLegColors]);

  useEffect(() => {
    if (ui.currentPage !== 'login') {
      fetchDatabaseResources();
    }
  }, [ui.currentPage, fetchDatabaseResources]);

  const nextNodeId = `GT-${String(Math.max(0, ...fowls.map(f => f.id)) + 1).padStart(4, '0')}`;
  const completenessFields = [newName, newBreed, newGender, age, height, weight, sireName, damName];
  const dataCompleteness = Math.round((completenessFields.filter(v => v && String(v).trim() !== '').length / completenessFields.length) * 100);
  const validationPassed = newName.trim() !== '' && newBreed.trim() !== '' && newGender !== '' && age.trim() !== '';
  const bloodlineVerified = sirePct !== '' && damPct !== '' && !isNaN(Number(sirePct)) && !isNaN(Number(damPct)) && Number(sirePct) > 0 && Number(damPct) > 0;
  const sireGen = generationOfNameHelper(sireName, fowls, new Map<string, number>(), new Set<string>());
  const damGen = generationOfNameHelper(damName, fowls, new Map<string, number>(), new Set<string>());
  const hasAnyParent = sireName.trim() !== '' || damName.trim() !== '';
  const offspringGen = hasAnyParent ? Math.max(sireGen, damGen) + 1 : 0;
  const offspringGenInfo = generationInfo(offspringGen);
  const sireGenInfo = generationInfo(sireGen);
  const damGenInfo = generationInfo(damGen);
  const computedBloodlinePct = generationPurity(offspringGen);

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

  const sanitizeInput = useCallback((value: string): string => {
    return value.replace(/[<>&"'/]/g, '').trim();
  }, []);

  const handleAddFowl = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let publicImageUrl = '';

    try {
      if (selectedImage) {
        setUploadingImage(true);
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `fowl/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('fowl-images')
          .upload(filePath, selectedImage);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('fowl-images')
          .getPublicUrl(filePath);

        publicImageUrl = data.publicUrl;
      }

      const sPct = sirePct === '' || sirePct === null || isNaN(Number(sirePct)) ? 0 : Number(sirePct);
      const dPct = damPct === '' || damPct === null || isNaN(Number(damPct)) ? 0 : Number(damPct);
      const calculatedBloodline = computedBloodlinePct;

      const activeUserId = (await supabase.auth.getUser()).data.user?.id;

      if (!activeUserId) {
        ui.showToastMessage('Authentication Error: Active session user ID not detected.', 'error');
        return;
      }

      const autoParts = getAgePartsHelper(newBirthdate);

      const payload = {
        user_id: activeUserId,
        name: sanitizeInput(newName),
        breed: sanitizeInput(newBreed) || 'Unspecified Strain',
        gender: newGender || 'Rooster',
        color: newColor,
        color_category: newColorCategory,
        growth_stage: autoParts ? autoComputeGrowthStage(autoParts.totalMonths, newGender || 'Rooster') : newGrowthStage,
        behavior_trait: newBehaviorTrait,
        eye_variant: newEyeVariant,
        birthdate: newBirthdate || '',
        age: autoParts
          ? `${autoParts.totalMonths} Months`
          : age && !isNaN(Number(age))
          ? `${Number(age)} Months`
          : 'N/A',
        weight: weight ? `${weight.toString().replace(/[^0-9.]/g, '')} kg` : 'N/A',
        height: height ? `${height.toString().replace(/[^0-9.]/g, '')} cm` : 'N/A',
        leg_color: newLegColor.trim() ? newLegColor.trim() : 'N/A',
        sire: sireName.trim() ? sanitizeInput(sireName) : 'Foundation Stock',
        dam: damName.trim() ? sanitizeInput(damName) : 'Foundation Stock',
        sire_pct: sPct,
        dam_pct: dPct,
        bloodline_pct: calculatedBloodline,
        status: 'Active',
        image_url: publicImageUrl,
      };

      const { error: insertErr } = await supabase.from('fowl').insert([payload]);

      if (insertErr) {
        ui.showToastMessage(`Database Error: ${insertErr.message}`, 'error');
      } else {
        ui.showToastMessage('GalloTrack Registry Object saved successfully.', 'success');
        saveCustomStrain(newBreed);
        const createdGender = newGender || 'Rooster';
        setNewName(''); setNewBreed(''); setNewGender(''); setSireName(''); setDamName(''); setWeight(''); setHeight(''); setNewLegColor(''); setAge(''); setNewBirthdate(''); setNewGrowthStage(''); setSelectedImage(null); setStrainQuery(''); setStrainOpen(false); setImagePreview('');
        fetchDatabaseResources();
        ui.setProfilingSubTab(isMaleHelper(createdGender) ? 'males' : 'females');
      }
    } catch (err: unknown) {
      ui.showToastMessage(`Upload Cluster Failure: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  }, [newName, newBreed, newGender, newBirthdate, age, weight, height, newLegColor, sireName, damName, sirePct, damPct, newColor, newColorCategory, newGrowthStage, newBehaviorTrait, newEyeVariant, selectedImage, computedBloodlinePct, sanitizeInput, saveCustomStrain, fetchDatabaseResources, ui]);

  const handleAddMatchRecord = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFowlForMatch) {
      ui.showToastMessage("Roster Cluster Selection Error: Select a registered fowl node.", "warning");
      return;
    }
    setLoading(true);

    try {
      const matchedFowl = fowls.find(f => f.name === selectedFowlForMatch);
      const fowlBreed = matchedFowl ? matchedFowl.breed : 'Unknown';

      let videoUrl = '';
      if (matchVideoFile) {
        setUploadingVideo(true);
        const fileExt = matchVideoFile.name.split('.').pop();
        const fileName = `match-videos/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('match-videos')
          .upload(fileName, matchVideoFile);

        if (uploadError) throw uploadError;

        const { data } = await supabase.storage
          .from('match-videos')
          .getPublicUrl(fileName);

        videoUrl = data.publicUrl;
        setUploadingVideo(false);
      }

      const activeUserId = (await supabase.auth.getUser()).data.user?.id;

      if (!activeUserId) {
        ui.showToastMessage('Authentication Error: Active session user ID not detected.', 'error');
        return;
      }

      const payload = {
        user_id: activeUserId,
        date: matchDate || new Date().toISOString().split('T')[0],
        entry_name: selectedFowlForMatch,
        breed: fowlBreed,
        opponent: sanitizeInput(opponentName) || 'Anonymous Opponent',
        location: sanitizeInput(matchLocation) || 'Local Breeding Yard',
        type: matchType,
        outcome: matchOutcome,
        status: 'Verified',
        post_fight_condition: matchPostFight,
        video_url: videoUrl || null
      };

      const { error: insertErr } = await supabase.from('match').insert([payload]);

      if (insertErr) {
        throw insertErr;
      } else {
        ui.showToastMessage('Performance match vector successfully computed and logged.', 'success');
        setOpponentName(''); setMatchLocation(''); setMatchVideoFile(null); setMatchPostFight('Fit / Recovered');
        fetchDatabaseResources();
        ui.setProfilingSubTab('males');
      }
    } catch (err: unknown) {
      ui.showToastMessage(`Database Write Constraint Fault: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setLoading(false);
      setUploadingVideo(false);
    }
  }, [selectedFowlForMatch, fowls, matchDate, opponentName, matchLocation, matchType, matchOutcome, matchPostFight, matchVideoFile, sanitizeInput, fetchDatabaseResources, ui]);

  const handleArchiveFowlWithReason = useCallback(async () => {
    if (!ui.selectedFowlForArchive) return;
    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from('fowl')
        .update({ status: 'Archived', archive_reason: archiveReasonInput })
        .eq('id', ui.selectedFowlForArchive!.id);

      if (updateErr) {
        ui.showToastMessage(updateErr.message, 'error');
      } else {
        ui.showToastMessage(`Gamefowl archived under ${archiveReasonInput} status log.`, 'warning');
        if (ui.selectedFowlForDetails?.id === ui.selectedFowlForArchive.id) ui.setSelectedFowlForDetails(null);
        ui.setSelectedFowlForArchive(null);
        fetchDatabaseResources();
      }
    } catch (err: unknown) {
      ui.showToastMessage(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [ui.selectedFowlForArchive, ui.selectedFowlForDetails, archiveReasonInput, fetchDatabaseResources, ui]);

  const handleArchiveFowlOnly = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from('fowl')
        .update({ status: 'Archived' })
        .eq('id', id);

      if (updateErr) {
        ui.showToastMessage(updateErr.message, 'error');
      } else {
        ui.showToastMessage('Gamefowl archived successfully.', 'warning');
        if (ui.selectedFowlForDetails?.id === id) ui.setSelectedFowlForDetails(null);
        fetchDatabaseResources();
      }
    } catch (err: unknown) {
      ui.showToastMessage(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [ui.selectedFowlForDetails, fetchDatabaseResources, ui]);

  const handleRestoreFowlOnly = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from('fowl')
        .update({ status: 'Active' })
        .eq('id', id);

      if (updateErr) {
        ui.showToastMessage(updateErr.message, 'error');
      } else {
        ui.showToastMessage('Node successfully restored to active family registry.', 'success');
        if (ui.selectedFowlForDetails?.id === id) ui.setSelectedFowlForDetails(null);
        fetchDatabaseResources();
      }
    } catch (err: unknown) {
      ui.showToastMessage(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [ui.selectedFowlForDetails, fetchDatabaseResources, ui]);

  const handlePermanentDelete = useCallback(async () => {
    if (!ui.pendingPermanentDelete) return;
    ui.setPermanentDeleting(true);
    try {
      const { error: delErr } = await supabase
        .from('fowl')
        .delete()
        .eq('id', ui.pendingPermanentDelete.id);

      if (delErr) {
        ui.showToastMessage(delErr.message, 'error');
      } else {
        ui.showToastMessage(`${ui.pendingPermanentDelete.name} permanently removed from the database.`, 'error');
        if (ui.selectedFowlForDetails?.id === ui.pendingPermanentDelete.id) ui.setSelectedFowlForDetails(null);
        ui.setPendingPermanentDelete(null);
        fetchDatabaseResources();
      }
    } catch (err) {
      ui.showToastMessage(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      ui.setPermanentDeleting(false);
    }
  }, [ui.pendingPermanentDelete, ui.selectedFowlForDetails, fetchDatabaseResources, ui]);

  const handleMarkFowlDeceased = useCallback(async () => {
    if (!ui.selectedFowlForDeceased) return;
    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from('fowl')
        .update({ status: 'Deceased', death_reason: deathReasonInput, death_date: new Date().toISOString().split('T')[0] })
        .eq('id', ui.selectedFowlForDeceased.id);

      if (updateErr) {
        ui.showToastMessage(updateErr.message, 'error');
      } else {
        ui.showToastMessage('Gamefowl node recorded under mortality archive log.', 'error');
        if (ui.selectedFowlForDetails?.id === ui.selectedFowlForDeceased.id) ui.setSelectedFowlForDetails(null);
        ui.setSelectedFowlForDeceased(null);
        fetchDatabaseResources();
      }
    } catch (err: unknown) {
      ui.showToastMessage(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [ui.selectedFowlForDeceased, ui.selectedFowlForDetails, deathReasonInput, fetchDatabaseResources, ui]);

  const handleOpenEditModal = useCallback((fowl: FowlRecord) => {
    ui.setEditingFowl(fowl);
    setEditName(fowl.name);
    setEditBreed(fowl.breed);
    setEditGender(fowl.gender);
    setEditColorCategory(fowl.color_category || 'Red');
    setEditColor(fowl.color || 'Bright Red');
    setEditBehaviorTrait(fowl.behavior_trait || 'Wave-Motion Tracker');
    setEditEyeVariant(fowl.eye_variant || 'Standard Eye');
    const parsedAge = fowl.age ? Number(fowl.age.replace(/[^0-9.]/g, '')) : 0;
    setEditAge(fowl.age ? fowl.age.replace(' Months', '') : '');
    setEditBirthdate(fowl.birthdate || '');
    setEditGrowthStage(fowl.growth_stage || autoComputeGrowthStage(isNaN(parsedAge) ? 0 : parsedAge, fowl.gender));
    setEditWeight(fowl.weight ? fowl.weight.replace(' kg', '') : '');
    setEditHeight(fowl.height ? fowl.height.replace(' cm', '') : '');
    setEditLegColor(fowl.leg_color || 'N/A');
    setEditSire(fowl.sire || '');
    setEditDam(fowl.dam || '');
    setEditSirePct(isFoundationStock(fowl.sire || '') ? 100 : (fowl.sire_pct ?? 0));
    setEditDamPct(isFoundationStock(fowl.dam || '') ? 100 : (fowl.dam_pct ?? 0));
  }, [ui]);

  const handleUpdateFowl = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ui.editingFowl) return;
    setLoading(true);

    try {
      const sPct = editSirePct === '' || editSirePct === null || isNaN(Number(editSirePct)) ? 0 : Number(editSirePct);
      const dPct = editDamPct === '' || editDamPct === null || isNaN(Number(editDamPct)) ? 0 : Number(editDamPct);
      const editSireGen = generationOfNameHelper(editSire, fowls, new Map<string, number>(), new Set<string>());
      const editDamGen = generationOfNameHelper(editDam, fowls, new Map<string, number>(), new Set<string>());
      const editHasAnyParent = editSire.trim() !== '' || editDam.trim() !== '';
      const calculatedBloodline = generationPurity(editHasAnyParent ? Math.max(editSireGen, editDamGen) + 1 : 0);
      const editAutoParts = getAgePartsHelper(editBirthdate);
      const payload = {
        name: sanitizeInput(editName),
        breed: sanitizeInput(editBreed),
        gender: editGender,
        color: editColor,
        color_category: editColorCategory,
        growth_stage: editAutoParts ? autoComputeGrowthStage(editAutoParts.totalMonths, editGender || 'Rooster') : editGrowthStage,
        behavior_trait: editBehaviorTrait,
        eye_variant: editEyeVariant,
        birthdate: editBirthdate || '',
        age: editAutoParts
          ? `${editAutoParts.totalMonths} Months`
          : editAge && !isNaN(Number(editAge))
          ? `${Number(editAge)} Months`
          : 'N/A',
        weight: editWeight ? `${editWeight.toString().replace(/[^0-9.]/g, '')} kg` : 'N/A',
        height: editHeight ? `${editHeight.toString().replace(/[^0-9.]/g, '')} cm` : 'N/A',
        leg_color: editLegColor.trim() ? editLegColor.trim() : 'N/A',
        sire: editSire.trim() ? sanitizeInput(editSire) : 'Foundation Stock',
        dam: editDam.trim() ? sanitizeInput(editDam) : 'Foundation Stock',
        sire_pct: sPct,
        dam_pct: dPct,
        bloodline_pct: calculatedBloodline
      };

      const { error: updateErr } = await supabase
        .from('fowl')
        .update(payload)
        .eq('id', ui.editingFowl.id);

      if (updateErr) throw updateErr;

      ui.showToastMessage('GalloTrack Node object updated in cloud cluster.', 'success');
      saveCustomStrain(editBreed);
      ui.setEditingFowl(null);
      fetchDatabaseResources();
    } catch (err: unknown) {
      ui.showToastMessage(`Update Cluster Failure: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [ui.editingFowl, editName, editBreed, editGender, editColor, editColorCategory, editGrowthStage, editBehaviorTrait, editEyeVariant, editBirthdate, editAge, editWeight, editHeight, editLegColor, editSire, editDam, editSirePct, editDamPct, fowls, sanitizeInput, saveCustomStrain, fetchDatabaseResources, ui]);

  const calculateCrossbreedWinRatios = useCallback(() => {
    const breedStats: { [key: string]: { wins: number; total: number } } = {};

    matchHistory.forEach((match) => {
      const breedKey = `${match.breed || 'Unknown'} Cross`;
      if (!breedStats[breedKey]) {
        breedStats[breedKey] = { wins: 0, total: 0 };
      }
      breedStats[breedKey].total += 1;
      if (match.outcome && match.outcome.toLowerCase() === 'win') {
        breedStats[breedKey].wins += 1;
      }
    });

    const labels = Object.keys(breedStats);
    const data = labels.map(label => {
      const stats = breedStats[label];
      return stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
    });

    const hasData = labels.length > 0 && matchHistory.length > 0;

    return {
      labels: hasData ? labels : [],
      data: hasData ? data : [],
      hasData
    };
  }, [matchHistory]);

  const pairingAnalytics = calculatePairingStats(fowls, matchHistory);
  const crossbreedChartData = calculateCrossbreedWinRatios();

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const dateRangeLabel = (() => {
    const now = new Date(nowMs);
    if (dateRangePreset === '7d') return `${formatShortDate(nowMs - 7 * DAY_MS)} - ${formatShortDate(nowMs)}`;
    if (dateRangePreset === '30d') return `${formatShortDate(nowMs - 30 * DAY_MS)} - ${formatShortDate(nowMs)}`;
    if (dateRangePreset === 'month') return `${formatShortDate(new Date(now.getFullYear(), now.getMonth(), 1).getTime())} - ${formatShortDate(nowMs)}`;
    if (dateRangePreset === '3m') return `${formatShortDate(nowMs - 90 * DAY_MS)} - ${formatShortDate(nowMs)}`;
    return 'All Time';
  })();

  const winRatePct = matchHistory.length > 0
    ? Math.round((matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length / matchHistory.length) * 100)
    : 0;
  const winsCount = matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
  const lossesCount = matchHistory.filter(m => m.outcome && m.outcome.toLowerCase() === 'loss').length;

  const monthLabels = (() => {
    const now = new Date();
    const out: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(d.toLocaleString('en-US', { month: 'short' }));
    }
    return out;
  })();

  const monthIndex = (s?: string) => {
    if (!s) return -1;
    const d = new Date(s);
    if (isNaN(d.getTime())) return -1;
    const now = new Date();
    const diff = (now.getFullYear() * 12 + now.getMonth()) - (d.getFullYear() * 12 + d.getMonth());
    const idx = 5 - diff;
    return (idx >= 0 && idx < 6) ? idx : -1;
  };

  const matchesByMonth = (() => {
    const arr = new Array(6).fill(0);
    matchHistory.forEach(m => { const i = monthIndex(m.date); if (i >= 0) arr[i]++; });
    return arr;
  })();

  const winsByMonth = (() => {
    const arr = new Array(6).fill(0);
    matchHistory.forEach(m => { const i = monthIndex(m.date); if (i >= 0 && m.outcome && m.outcome.toLowerCase() === 'win') arr[i]++; });
    return arr;
  })();

  const activeSpark = (() => {
    const arr = new Array(6).fill(0);
    fowls.forEach(f => {
      if (f.status === 'Active' || !f.status || f.status === 'active') {
        const i = monthIndex(f.created_at);
        if (i >= 0) arr[i]++;
      }
    });
    for (let i = 1; i < 6; i++) arr[i] += arr[i - 1];
    return arr;
  })();

  const trendWinRate = monthLabels.map((_, i) => matchesByMonth[i] > 0 ? Math.round((winsByMonth[i] / matchesByMonth[i]) * 100) : 0);

  const upcomingMilestones = activeFowls
    .map((f) => ({ fowl: f, info: getMilestoneInfoHelper(f.birthdate, f.gender) }))
    .filter((x): x is { fowl: FowlRecord; info: NonNullable<ReturnType<typeof getMilestoneInfoHelper>> } => !!x.info)
    .sort((a, b) => (a.info.next?.daysUntil ?? 999999) - (b.info.next?.daysUntil ?? 999999));

  const generationOfLocal = useCallback((f: FowlRecord) => generationOfHelper(f, fowls), [fowls]);
  const parentBloodlinePctLocal = useCallback((f: FowlRecord) => parentBloodlinePctHelper(f, fowls), [fowls]);
  const getSiblingRelationsLocal = useCallback((f: FowlRecord) => getSiblingRelationsHelper(f, fowls), [fowls]);

  const value: FowlContextValue = {
    fowls, setFowls, activeFowls, maleActiveFowls, femaleActiveFowls, archivedFowls, deceasedFowls,
    matchHistory, setMatchHistory, loading, setLoading,
    newName, setNewName, newBreed, setNewBreed, newGender, setNewGender,
    newColor, setNewColor, newColorCategory, setNewColorCategory,
    newGrowthStage, setNewGrowthStage, newBehaviorTrait, setNewBehaviorTrait,
    newEyeVariant, setNewEyeVariant, newBirthdate, setNewBirthdate,
    sireName, setSireName, damName, setDamName,
    sirePct, setSirePct, damPct, setDamPct,
    weight, setWeight, height, setHeight,
    newLegColor, setNewLegColor, age, setAge, search, setSearch, debouncedSearch,
    selectedImage, setSelectedImage, uploadingImage, setUploadingImage,
    imagePreview, setImagePreview,
    selectedFowlForMatch, setSelectedFowlForMatch,
    matchDate, setMatchDate, opponentName, setOpponentName,
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
    editDam, setEditDam, editSirePct, setEditSirePct,
    editDamPct, setEditDamPct,
    availableStrains, setAvailableStrains, customStrainNames, deleteCustomStrain,
    strainQuery, setStrainQuery, strainOpen, setStrainOpen,
    availableLegColors, setAvailableLegColors, customLegColorNames, deleteCustomLegColor,
    legColorQuery, setLegColorQuery, legColorOpen, setLegColorOpen,
    pairingAnalytics, crossbreedChartData,
    winRatePct, winsCount, lossesCount,
    monthLabels, matchesByMonth, winsByMonth, activeSpark, trendWinRate,
    upcomingMilestones, dateRangeLabel, nextNodeId,
    dataCompleteness, validationPassed, bloodlineVerified, computedBloodlinePct,
    offspringGenInfo, sireGenInfo, damGenInfo, sireGen, damGen,
    handleAddFowl, handleAddMatchRecord, handleUpdateFowl,
    handleOpenEditModal, handleArchiveFowlOnly, handleArchiveFowlWithReason,
    handleRestoreFowlOnly, handlePermanentDelete, handleMarkFowlDeceased,
    fetchDatabaseResources,
    handleAgeChange, handleEditAgeChange, handleNewBirthdateChange, handleEditBirthdateChange,
    generationOf: generationOfLocal,
    parentBloodlinePct: parentBloodlinePctLocal,
    getSiblingRelations: getSiblingRelationsLocal,
    getAgeParts: getAgePartsHelper,
    getAgeLabel,
    getAgeExact,
    getAgeMetrics,
    generationPurity,
    generationInfo,
    bloodlineOf,
    cleanPct: cleanPctHelper,
    getMilestoneInfo: getMilestoneInfoHelper,
    getArchiveBadgeStyle,
    autoComputeGrowthStage,
    matchSurvivability,
    isMale: isMaleHelper,
    isFemale: isFemaleHelper,
    isFoundationStock,
    generateBloodlineReport: (fowl: FowlRecord) => {
      const report = generateBloodlineReport(fowl, fowls, matchHistory);
      const colorReport = generateColorReport(
        fowl.leg_color || '',
        fowl.color_category || '',
        fowls.find(f => f.name === fowl.sire)?.leg_color,
        fowls.find(f => f.name === fowl.dam)?.leg_color,
        fowls.find(f => f.name === fowl.sire)?.color_category,
        fowls.find(f => f.name === fowl.dam)?.color_category
      );
      const breedCompliance = generateBreedCompliance(
        fowl.breed || '',
        fowl.weight || '',
        fowl.height || '',
        fowl.leg_color || '',
        fowl.color_category || ''
      );
      return { ...report, colorReport, breedCompliance };
    },
    getFarmBloodlineSummary: () => generateFarmBloodlineSummary(fowls, matchHistory),
    deathReasonInput, setDeathReasonInput,
    archiveReasonInput, setArchiveReasonInput,
    breakdownTab, setBreakdownTab,
    dateRangePreset, setDateRangePreset,
    dateRangeOpen, setDateRangeOpen,
  };

  return <FowlContext.Provider value={value}>{children}</FowlContext.Provider>;
}
