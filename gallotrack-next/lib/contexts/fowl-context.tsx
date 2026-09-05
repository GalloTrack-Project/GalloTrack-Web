'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/registry';
import { useDebounce } from '@/lib/use-debounce';
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
  cleanPct as cleanPctHelper,
} from '@/lib/helpers';
import { generateBloodlineReport, generateFarmBloodlineSummary } from '@/lib/bloodlines';
import { generateColorReport } from '@/lib/color-genetics';
import { generateBreedCompliance } from '@/lib/breed-standards';
import { useFowlAnalytics } from '@/lib/hooks/use-fowl-analytics';
import * as fowlService from '@/lib/services/fowl-service';
import * as matchService from '@/lib/services/match-service';
import * as strainService from '@/lib/services/strain-service';
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
  deleteCustomStrain: (name: string) => Promise<void>;
  strainQuery: string; setStrainQuery: (v: string) => void;
  strainOpen: boolean; setStrainOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  selectedStrains: string[];
  addStrain: (strain: string) => void;
  removeStrain: (index: number) => void;

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

function sanitizeInput(value: string): string {
  return value.replace(/[<>&"'/]/g, '').trim();
}

export function FowlProvider({ children }: { children: React.ReactNode }) {
  const ui = useUI();

  // ── Core data state ──
  const [fowls, setFowls] = useState<FowlRecord[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Derived lists ──
  const activeFowls = fowls.filter(f => f.status === 'Active' || !f.status || f.status === 'active');
  const archivedFowls = fowls.filter(f => f.status === 'Archived');
  const deceasedFowls = fowls.filter(f => f.status === 'Deceased');
  const maleActiveFowls = activeFowls.filter(f => isMaleHelper(f.gender));
  const femaleActiveFowls = activeFowls.filter(f => isFemaleHelper(f.gender));

  // ── New fowl form state ──
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

  // ── Match form state ──
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

  // ── Edit form state ──
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

  // ── Dynamic dropdowns ──
  const [availableStrains, setAvailableStrains] = useState<string[]>(STRAIN_LIST);
  const [customStrainNames, setCustomStrainNames] = useState<Set<string>>(new Set());
  const [strainQuery, setStrainQuery] = useState('');
  const [strainOpen, setStrainOpen] = useState(false);
  const [selectedStrains, setSelectedStrains] = useState<string[]>([]);
  const [availableLegColors, setAvailableLegColors] = useState<string[]>(LEG_COLOR_LIST);
  const [customLegColorNames, setCustomLegColorNames] = useState<Set<string>>(new Set());
  const [legColorQuery, setLegColorQuery] = useState('');
  const [legColorOpen, setLegColorOpen] = useState(false);

  // ── UI state ──
  const [deathReasonInput, setDeathReasonInput] = useState('Illness');
  const [archiveReasonInput, setArchiveReasonInput] = useState('SOLD');
  const [breakdownTab, setBreakdownTab] = useState<'individual' | 'strain' | 'pairing'>('individual');
  const [dateRangePreset, setDateRangePreset] = useState<'7d' | '30d' | 'month' | '3m' | 'all'>('7d');
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // ── Analytics (memoized) ──
  const analytics = useFowlAnalytics(fowls, matchHistory, dateRangePreset, nowMs, activeFowls);

  // ── Generation helpers for new fowl form ──
  const nextNodeId = `GT-${String(Math.max(0, ...fowls.map(f => f.id)) + 1).padStart(4, '0')}`;
  const completenessFields = [newName, newBreed, newGender, age, height, weight, sireName, damName];
  const dataCompleteness = Math.round((completenessFields.filter(v => v && String(v).trim() !== '').length / completenessFields.length) * 100);
  const validationPassed = newName.trim() !== '' && (selectedStrains.length > 0 || newBreed.trim() !== '') && newGender !== '' && age.trim() !== '';
  const sireGen = generationOfNameHelper(sireName, fowls, new Map<string, number>(), new Set<string>());
  const damGen = generationOfNameHelper(damName, fowls, new Map<string, number>(), new Set<string>());
  const hasAnyParent = sireName.trim() !== '' || damName.trim() !== '';
  const bloodlineVerified = hasAnyParent && sirePct !== '' && damPct !== '' && !isNaN(Number(sirePct)) && !isNaN(Number(damPct)) && Number(sirePct) > 0 && Number(damPct) > 0;
  const offspringGen = hasAnyParent ? Math.max(sireGen, damGen) + 1 : 0;
  const offspringGenInfo = generationInfo(offspringGen);
  const sireGenInfo = generationInfo(sireGen);
  const damGenInfo = generationInfo(damGen);
  const computedBloodlinePct = generationPurity(offspringGen);

  // ── Age/birthdate handlers ──
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

  // ── Data fetching ──
  const fetchDatabaseResources = useCallback(async () => {
    setLoading(true);
    try {
      const [fowlData, matchData, strainNames, legColorNames] = await Promise.all([
        fowlService.fetchFowls(),
        matchService.fetchMatches(),
        strainService.fetchStrains(),
        strainService.fetchLegColors(),
      ]);
      setFowls(fowlData);
      setMatchHistory(matchData);
      setAvailableStrains(strainNames);
      setCustomStrainNames(new Set(strainNames));
      setAvailableLegColors(legColorNames);
      setCustomLegColorNames(new Set(legColorNames));
    } catch (err) {
      console.error('Failed to fetch database resources:', err);
      setFowls([]);
      setMatchHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ui.currentPage !== 'login') {
      const controller = new AbortController();
      fetchDatabaseResources();
      return () => controller.abort();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.currentPage]);

  // ── Strain/leg-color CRUD ──
  const deleteCustomStrain = useCallback(async (name: string): Promise<void> => {
    const result = await strainService.deleteStrain(name);
    if (!result.error) {
      setAvailableStrains((prev) => prev.filter((s) => s !== name));
      setCustomStrainNames((prev) => { const n = new Set(prev); n.delete(name); return n; });
      ui.showToastMessage(`Strain "${name}" deleted.`, 'success');
    }
  }, [ui]);

  const deleteCustomLegColor = useCallback(async (name: string): Promise<void> => {
    const result = await strainService.deleteLegColor(name);
    if (!result.error) {
      setAvailableLegColors((prev) => prev.filter((s) => s !== name));
      setCustomLegColorNames((prev) => { const n = new Set(prev); n.delete(name); return n; });
      ui.showToastMessage(`Leg color "${name}" deleted.`, 'success');
    }
  }, [ui]);

  const addStrain = useCallback(async (strain: string) => {
    const trimmed = strain.trim();
    if (!trimmed) return;
    if (!selectedStrains.includes(trimmed)) {
      setSelectedStrains((prev) => [...prev, trimmed]);
    }
    if (!availableStrains.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      const saved = await strainService.saveCustomStrain(trimmed, availableStrains);
      if (saved) {
        setAvailableStrains((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
        setCustomStrainNames((prev) => new Set([...prev, trimmed]));
      }
    }
    setStrainQuery('');
    setNewBreed('');
  }, [selectedStrains, availableStrains, setNewBreed]);

  const removeStrain = useCallback((index: number) => {
    setSelectedStrains((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Fowl CRUD ──
  const handleAddFowl = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let publicImageUrl = '';

    try {
      if (selectedImage) {
        setUploadingImage(true);
        const result = await fowlService.uploadFowlImage(selectedImage);
        if (result.error) throw new Error(result.error);
        publicImageUrl = result.url || '';
      }

      const sPct = sirePct === '' || sirePct === null || isNaN(Number(sirePct)) ? 0 : Number(sirePct);
      const dPct = damPct === '' || damPct === null || isNaN(Number(damPct)) ? 0 : Number(damPct);

      const activeUserId = (await supabase.auth.getUser()).data.user?.id;
      if (!activeUserId) {
        ui.showToastMessage('Authentication Error: Active session user ID not detected.', 'error');
        return;
      }

      const autoParts = getAgePartsHelper(newBirthdate);

      const payload = {
        user_id: activeUserId,
        name: sanitizeInput(newName),
        breed: selectedStrains.length > 0 ? selectedStrains.join(', ') : sanitizeInput(newBreed) || 'Unspecified Strain',
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
        weight: weight ? `${Math.round(Number(weight.toString().replace(/[^0-9.]/g, '')) * 10) / 10} kg` : 'N/A',
        height: height ? `${Math.round(Number(height.toString().replace(/[^0-9.]/g, '')) * 10) / 10} cm` : 'N/A',
        leg_color: newLegColor.trim() ? newLegColor.trim() : 'N/A',
        sire: sireName.trim() ? sanitizeInput(sireName) : 'Foundation Stock',
        dam: damName.trim() ? sanitizeInput(damName) : 'Foundation Stock',
        sire_pct: sPct,
        dam_pct: dPct,
        bloodline_pct: computedBloodlinePct,
        status: 'Active',
        image_url: publicImageUrl,
      };

      const result = await fowlService.insertFowl(payload);
      if (result.error) {
        ui.showToastMessage(`Database Error: ${result.error}`, 'error');
      } else {
        ui.showToastMessage('GalloTrack Registry Object saved successfully.', 'success');
        for (const s of selectedStrains) {
          await strainService.saveCustomStrain(s, availableStrains);
        }
        const createdGender = newGender || 'Rooster';
        setNewName(''); setNewBreed(''); setNewGender(''); setSireName(''); setDamName(''); setWeight(''); setHeight(''); setNewLegColor(''); setLegColorQuery(''); setAge(''); setNewBirthdate(''); setNewGrowthStage(''); setSelectedImage(null); setStrainQuery(''); setStrainOpen(false); setSelectedStrains([]); setImagePreview('');
        fetchDatabaseResources();
        ui.setProfilingSubTab(isMaleHelper(createdGender) ? 'males' : 'females');
      }
    } catch (err: unknown) {
      ui.showToastMessage(`Upload Cluster Failure: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  }, [newName, newBreed, newGender, newBirthdate, age, weight, height, newLegColor, sireName, damName, sirePct, damPct, newColor, newColorCategory, newGrowthStage, newBehaviorTrait, newEyeVariant, selectedImage, computedBloodlinePct, availableStrains, fetchDatabaseResources, ui]);

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
        const result = await matchService.uploadMatchVideo(matchVideoFile);
        if (result.error) throw new Error(result.error);
        videoUrl = result.url || '';
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
        opponent_breed: sanitizeInput(opponentBreed) || '',
        location: sanitizeInput(matchLocation) || 'Local Breeding Yard',
        type: matchType,
        outcome: matchOutcome,
        status: 'Verified',
        post_fight_condition: matchPostFight,
        video_url: videoUrl || null
      };

      const result = await matchService.insertMatch(payload);
      if (result.error) {
        throw new Error(result.error);
      } else {
        ui.showToastMessage('Performance match vector successfully computed and logged.', 'success');
        setOpponentName(''); setOpponentBreed(''); setMatchLocation(''); setMatchVideoFile(null); setMatchPostFight('Fit / Recovered');
        fetchDatabaseResources();
        ui.setProfilingSubTab('males');
      }
    } catch (err: unknown) {
      ui.showToastMessage(`Database Write Constraint Fault: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setLoading(false);
      setUploadingVideo(false);
    }
  }, [selectedFowlForMatch, fowls, matchDate, opponentName, opponentBreed, matchLocation, matchType, matchOutcome, matchPostFight, matchVideoFile, fetchDatabaseResources, ui]);

  const handleArchiveFowlWithReason = useCallback(async () => {
    if (!ui.selectedFowlForArchive) return;
    setLoading(true);
    const result = await fowlService.archiveFowl(ui.selectedFowlForArchive.id, archiveReasonInput);
    if (result.error) {
      ui.showToastMessage(result.error, 'error');
    } else {
      ui.showToastMessage(`Gamefowl archived under ${archiveReasonInput} status log.`, 'warning');
      if (ui.selectedFowlForDetails?.id === ui.selectedFowlForArchive.id) ui.setSelectedFowlForDetails(null);
      ui.setSelectedFowlForArchive(null);
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [archiveReasonInput, fetchDatabaseResources, ui]);

  const handleArchiveFowlOnly = useCallback(async (id: number) => {
    setLoading(true);
    const result = await fowlService.archiveFowl(id);
    if (result.error) {
      ui.showToastMessage(result.error, 'error');
    } else {
      ui.showToastMessage('Gamefowl archived successfully.', 'warning');
      if (ui.selectedFowlForDetails?.id === id) ui.setSelectedFowlForDetails(null);
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [fetchDatabaseResources, ui]);

  const handleRestoreFowlOnly = useCallback(async (id: number) => {
    setLoading(true);
    const result = await fowlService.restoreFowl(id);
    if (result.error) {
      ui.showToastMessage(result.error, 'error');
    } else {
      ui.showToastMessage('Node successfully restored to active family registry.', 'success');
      if (ui.selectedFowlForDetails?.id === id) ui.setSelectedFowlForDetails(null);
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [fetchDatabaseResources, ui]);

  const handlePermanentDelete = useCallback(async () => {
    if (!ui.pendingPermanentDelete) return;
    ui.setPermanentDeleting(true);
    const result = await fowlService.deleteFowl(ui.pendingPermanentDelete.id);
    if (result.error) {
      ui.showToastMessage(result.error, 'error');
    } else {
      ui.showToastMessage(`${ui.pendingPermanentDelete.name} permanently deleted.`, 'success');
      if (ui.selectedFowlForDetails?.id === ui.pendingPermanentDelete.id) ui.setSelectedFowlForDetails(null);
      ui.setPendingPermanentDelete(null);
      setFowls(prev => prev.filter(f => f.id !== ui.pendingPermanentDelete!.id));
    }
    ui.setPermanentDeleting(false);
  }, [ui, setFowls]);

  const handleMarkFowlDeceased = useCallback(async () => {
    if (!ui.selectedFowlForDeceased) return;
    setLoading(true);
    const result = await fowlService.markFowlDeceased(ui.selectedFowlForDeceased.id, deathReasonInput);
    if (result.error) {
      ui.showToastMessage(result.error, 'error');
    } else {
      ui.showToastMessage('Gamefowl node recorded under mortality archive log.', 'error');
      if (ui.selectedFowlForDetails?.id === ui.selectedFowlForDeceased.id) ui.setSelectedFowlForDetails(null);
      ui.setSelectedFowlForDeceased(null);
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [deathReasonInput, fetchDatabaseResources, ui]);

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
        weight: editWeight ? `${Math.round(Number(editWeight.toString().replace(/[^0-9.]/g, '')) * 10) / 10} kg` : 'N/A',
        height: editHeight ? `${Math.round(Number(editHeight.toString().replace(/[^0-9.]/g, '')) * 10) / 10} cm` : 'N/A',
        leg_color: editLegColor.trim() ? editLegColor.trim() : 'N/A',
        sire: editSire.trim() ? sanitizeInput(editSire) : 'Foundation Stock',
        dam: editDam.trim() ? sanitizeInput(editDam) : 'Foundation Stock',
        sire_pct: sPct,
        dam_pct: dPct,
        bloodline_pct: calculatedBloodline
      };

      const result = await fowlService.updateFowl(ui.editingFowl.id, payload);
      if (result.error) throw new Error(result.error);

      ui.showToastMessage('GalloTrack Node object updated in cloud cluster.', 'success');
      await strainService.saveCustomStrain(editBreed, availableStrains);
      ui.setEditingFowl(null);
      fetchDatabaseResources();
    } catch (err: unknown) {
      ui.showToastMessage(`Update Cluster Failure: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [editName, editBreed, editGender, editColor, editColorCategory, editGrowthStage, editBehaviorTrait, editEyeVariant, editBirthdate, editAge, editWeight, editHeight, editLegColor, editSire, editDam, editSirePct, editDamPct, fowls, availableStrains, fetchDatabaseResources, ui]);

  // ── Local helper wrappers ──
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
    matchDate, setMatchDate, opponentName, setOpponentName, opponentBreed, setOpponentBreed,
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
    selectedStrains, addStrain, removeStrain,
    availableLegColors, setAvailableLegColors, customLegColorNames, deleteCustomLegColor,
    legColorQuery, setLegColorQuery, legColorOpen, setLegColorOpen,
    pairingAnalytics: analytics.pairingAnalytics,
    crossbreedChartData: analytics.crossbreedChartData,
    winRatePct: analytics.winRatePct,
    winsCount: analytics.winsCount,
    lossesCount: analytics.lossesCount,
    monthLabels: analytics.monthLabels,
    matchesByMonth: analytics.matchesByMonth,
    winsByMonth: analytics.winsByMonth,
    activeSpark: analytics.activeSpark,
    trendWinRate: analytics.trendWinRate,
    upcomingMilestones: analytics.upcomingMilestones,
    dateRangeLabel: analytics.dateRangeLabel,
    nextNodeId,
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
