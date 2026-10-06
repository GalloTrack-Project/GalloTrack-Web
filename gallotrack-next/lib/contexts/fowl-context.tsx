'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/registry';
import { useUI } from './ui-context';
import { FowlFormStateProvider, useFowlFormState } from './fowl-form-context';
import {
  isMale as isMaleHelper,
  isFemale as isFemaleHelper,
  isFoundationStock,
  generationOfName as generationOfNameHelper,
  generationOf as generationOfHelper,
  generationPurity,
  generationInfo,
  parentBloodlinePct as parentBloodlinePctHelper,
  bloodlineOf,
  getAgeParts as getAgePartsHelper,
  getAgeLabel,
  getAgeExact,
  getAgeMetrics,
  autoComputeGrowthStage,
  getSiblingRelations as getSiblingRelationsHelper,
  getMilestoneInfo as getMilestoneInfoHelper,
  getArchiveBadgeStyle,
  matchSurvivability,
  STRAIN_LIST,
  LEG_COLOR_LIST,
} from '@/lib/helpers';
import { generateBloodlineReport, generateFarmBloodlineSummary } from '@/lib/bloodlines';
import {
  computeBloodlineComposition,
  getBloodlineStats,
  getFowlBloodlineStats,
  planLineageRefresh,
  planLineageRefreshAfterDelete,
  type BloodlineComposition,
  type BloodlineStats,
  type LineageRefreshPatch,
} from '@/lib/bloodline-composition';
import {
  buildCodeSet,
  isValidBirdCode,
  normalizeBirdCode,
  previewBirdCode,
  resolveBirdCodes,
} from '@/lib/bird-code';
import { generateColorReport } from '@/lib/color-genetics';
import { nameKey } from '@/lib/family-tree';
import { parentLinkIds } from '@/lib/lineage';
import { generateBreedCompliance } from '@/lib/breed-standards';
import { useFowlAnalytics } from '@/lib/hooks/use-fowl-analytics';
import { validateFowlForm, validateMatchForm } from '@/lib/validation';
import * as fowlService from '@/lib/services/fowl-service';
import { archiveDraftIssue, archiveKindLabel, type ArchiveDraft } from '@/lib/lifecycle';
import * as matchService from '@/lib/services/match-service';
import * as mediaService from '@/lib/services/media-service';
import * as optionsService from '@/lib/services/options-service';
import * as matchOptionsService from '@/lib/services/match-options-service';
import type { PartnerSuggestion } from '@/lib/services/match-options-service';
import * as strainService from '@/lib/services/strain-service';
import * as breedingService from '@/lib/services/breeding-service';
import { useUnitPrefs, weightToStorage, heightToStorage, weightFromStorage, heightFromStorage } from '@/lib/units';
import type { BloodlineReport } from '@/lib/bloodlines';
import type {
  FowlRecord,
  MatchRecord,
  MatchMedia,
  AgeParts,
  SiblingRelation,
  PairingAnalytics,
  BreedingPairRecord,
} from '@/lib/types';
import { toastMessage } from '@/lib/toast-bus';

interface FowlContextValue {
  fowls: FowlRecord[];
  setFowls: React.Dispatch<React.SetStateAction<FowlRecord[]>>;
  activeFowls: FowlRecord[];
  sireMaterialFowls: FowlRecord[];
  maleActiveFowls: FowlRecord[];
  femaleActiveFowls: FowlRecord[];
  archivedFowls: FowlRecord[];
  deceasedFowls: FowlRecord[];
  matchHistory: MatchRecord[];
  setMatchHistory: React.Dispatch<React.SetStateAction<MatchRecord[]>>;
  matchMedia: Map<number, MatchMedia>;
  /** Pairing history for the farm — parents/partner links in bird profiles. */
  breedingPairs: BreedingPairRecord[];
  loading: boolean;
  setLoading: (v: boolean) => void;
  /** Set when the registry fetch failed — the UI must say so instead of showing an empty farm. */
  loadError: string | null;

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
  birdCode: string; setBirdCode: (v: string) => void;
  wingBand: string; setWingBand: (v: string) => void;
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
  matchSide: string; setMatchSide: (v: string) => void;
  matchNotes: string; setMatchNotes: (v: string) => void;
  derbyMatchNumber: number; setDerbyMatchNumber: (v: number) => void;
  matchOutcome: string; setMatchOutcome: (v: string) => void;
  matchPostFight: string; setMatchPostFight: (v: string) => void;
  matchVideoFiles: File[]; setMatchVideoFiles: (f: File[]) => void;
  matchPhotoFiles: File[]; setMatchPhotoFiles: (f: File[]) => void;
  opponentBloodline: string; setOpponentBloodline: (v: string) => void;
  opponentHatch: string; setOpponentHatch: (v: string) => void;
  opponentPhoto: File | null; setOpponentPhoto: (f: File | null) => void;
  uploadingVideo: boolean; setUploadingVideo: (v: boolean) => void;

  matchOption: number; setMatchOption: (v: number) => void;
  betType: string; setBetType: (v: string) => void;
  targetNumber: number; setTargetNumber: (v: number) => void;
  partnerEntry: string; setPartnerEntry: (v: string) => void;
  suggestedPartners: PartnerSuggestion[]; setSuggestedPartners: (v: PartnerSuggestion[]) => void;

  cockCount: number; setCockCount: (v: number) => void;
  ageCategory: string; setAgeCategory: (v: string) => void;
  eventType: string; setEventType: (v: string) => void;

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
  editBirdCode: string; setEditBirdCode: (v: string) => void;
  editWingBand: string; setEditWingBand: (v: string) => void;

  autoCalcAge: boolean; getAutoCalcAge: () => boolean;

  availableStrains: string[];
  setAvailableStrains: React.Dispatch<React.SetStateAction<string[]>>;
  customStrainNames: Set<string>;
  setCustomStrainNames: React.Dispatch<React.SetStateAction<Set<string>>>;
  deleteCustomStrain: (name: string) => Promise<void>;
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

  birdCodes: Map<string, string>;
  birdCodeOf: (f: FowlRecord) => string;
  suggestedBirdCode: string;
  previewComposition: BloodlineComposition;
  previewBloodlineStats: BloodlineStats | null;
  bloodlineStatsOf: (f: FowlRecord) => BloodlineStats | null;
  bloodlineStatsById: Map<string, BloodlineStats | null>;

  handleAddFowl: (e: React.FormEvent) => Promise<void>;
  handleAddMatchRecord: (e: React.FormEvent) => Promise<void>;
  handleUpdateFowl: (e: React.FormEvent) => Promise<void>;
  handleOpenEditModal: (fowl: FowlRecord) => void;
  handleArchiveFowlOnly: (id: number) => Promise<void>;
  handleArchiveFowlWithReason: (draft?: ArchiveDraft) => Promise<void>;
  handleRestoreFowlOnly: (id: number) => Promise<void>;
  handlePermanentDelete: () => Promise<void>;
  handleMarkFowlDeceased: () => Promise<void>;
  handleSetSireMaterial: (fowl: FowlRecord) => Promise<void>;
  handleSetActiveStatus: (fowl: FowlRecord) => Promise<void>;
  handleSetConditionStatus: (fowl: FowlRecord, value: string) => Promise<void>;
  handleSetBreedingRole: (fowl: FowlRecord, role: 'none' | 'breeder' | 'material') => Promise<void>;
  handleSaveFowlNotes: (fowl: FowlRecord, notes: string) => Promise<void>;
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
  bloodlineOf: (f: FowlRecord, fowls?: FowlRecord[]) => number;
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
    strainRankings: { strain: string; count: number; avgWinRate: number | null }[];
    topCrosses: { pattern: string; tier: string; vigor: number }[];
  };

  deathReasonInput: string; setDeathReasonInput: (v: string) => void;
  deathReasonNote: string; setDeathReasonNote: (v: string) => void;
  archiveReasonInput: string; setArchiveReasonInput: (v: string) => void;
  archiveReasonNote: string; setArchiveReasonNote: (v: string) => void;
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
  const formState = useFowlFormState();
  return { ...ctx, ...formState };
}

function sanitizeInput(value: string): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function FowlProviderInternal({ children }: { children: React.ReactNode }) {
  const ui = useUI();
  const formState = useFowlFormState();
  const unitPrefs = useUnitPrefs();
  const {
    newName, setNewName, newBreed, setNewBreed, newGender, setNewGender,
    newColor, newColorCategory,
    newGrowthStage, setNewGrowthStage, newBehaviorTrait, newEyeVariant,
    newBirthdate, setNewBirthdate,
    sireName, setSireName, damName, setDamName,
    sirePct, setSirePct, damPct, setDamPct,
    weight, setWeight, height, setHeight,
    newLegColor, setNewLegColor, age, setAge,
    birdCode, setBirdCode,
    wingBand, setWingBand,
    search, setSearch, debouncedSearch,
    selectedImage, setSelectedImage, uploadingImage, setUploadingImage,
    imagePreview, setImagePreview,
    selectedFowlForMatch, setSelectedFowlForMatch,
    matchDate, setMatchDate, opponentName, setOpponentName,
    opponentBreed, setOpponentBreed, matchLocation, setMatchLocation,
    matchType, matchSide, setMatchSide, matchNotes, setMatchNotes,
    derbyMatchNumber, setDerbyMatchNumber,
    matchOutcome, setMatchOutcome,
    matchPostFight, setMatchPostFight,
    matchVideoFiles, setMatchVideoFiles, matchPhotoFiles, setMatchPhotoFiles,
    opponentBloodline, setOpponentBloodline, opponentHatch, setOpponentHatch,
    opponentPhoto, setOpponentPhoto, uploadingVideo, setUploadingVideo,
    matchOption, setMatchOption, betType, setBetType,
    targetNumber, setTargetNumber, partnerEntry, setPartnerEntry,
    suggestedPartners, setSuggestedPartners,
    cockCount, setCockCount, ageCategory, setAgeCategory, eventType, setEventType,
    editName, setEditName, editBreed, setEditBreed,
    editGender, setEditGender, editColorCategory, setEditColorCategory,
    editColor, setEditColor, editBehaviorTrait, setEditBehaviorTrait,
    editEyeVariant, setEditEyeVariant, editAge, setEditAge,
    editBirthdate, setEditBirthdate, editGrowthStage, setEditGrowthStage,
    editWeight, setEditWeight, editHeight, setEditHeight,
    editLegColor, setEditLegColor, editSire, setEditSire,
    editDam, setEditDam, editSirePct, setEditSirePct, editDamPct, setEditDamPct,
    editBirdCode, setEditBirdCode,
    editWingBand, setEditWingBand,
    availableStrains, setAvailableStrains, customStrainNames, setCustomStrainNames,
    strainQuery, setStrainQuery, strainOpen, setStrainOpen,
    selectedStrains, setSelectedStrains,
    availableLegColors, setAvailableLegColors, customLegColorNames, setCustomLegColorNames,
    legColorQuery, setLegColorQuery, legColorOpen, setLegColorOpen,
    handleAgeChange, handleEditAgeChange, handleNewBirthdateChange, handleEditBirthdateChange,
  } = formState;

  // Load system defaults for arena and age on mount
  useEffect(() => {
    fetch('/api/admin/system-settings')
      .then((r) => r.json())
      .then((s) => {
        if (s.default_arena) setMatchLocation(s.default_arena);
        if (s.auto_calculate_age === false) setAutoCalcAge(false);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Core data state ──
  const [fowls, setFowls] = useState<FowlRecord[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [matchMedia, setMatchMedia] = useState<Map<number, MatchMedia>>(new Map());
  const [breedingPairs, setBreedingPairs] = useState<BreedingPairRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [autoCalcAge, setAutoCalcAge] = useState(true);

  // ── Derived lists ──
  const activeFowls = fowls.filter(f => f.status === 'Active' || !f.status || f.status === 'active');
  const sireMaterialFowls = fowls.filter(f => f.status === 'Sire Material');
  const archivedFowls = fowls.filter(f => f.status === 'Archived');
  const deceasedFowls = fowls.filter(f => f.status === 'Deceased');
  const maleActiveFowls = activeFowls.filter(f => isMaleHelper(f.gender));
  const femaleActiveFowls = activeFowls.filter(f => isFemaleHelper(f.gender));

  // ── UI state ──
  const [deathReasonInput, setDeathReasonInput] = useState('Illness');
  const [deathReasonNote, setDeathReasonNote] = useState('');
  const [archiveReasonInput, setArchiveReasonInput] = useState('sold');
  const [archiveReasonNote, setArchiveReasonNote] = useState('');
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
  const offspringGen = hasAnyParent ? Math.max(sireGen, damGen) + 1 : 0;
  const offspringGenInfo = generationInfo(offspringGen);
  const sireGenInfo = generationInfo(sireGen);
  const damGenInfo = generationInfo(damGen);
  const computedBloodlinePct = generationPurity(offspringGen);

  // ── Standardized bird codes (sire 1, dam A, offspring 1A1 → 1A₁) ──
  const birdCodes = useMemo(() => resolveBirdCodes(fowls), [fowls]);
  const takenCodes = useMemo(() => buildCodeSet(Array.from(birdCodes.values())), [birdCodes]);
  const birdCodeOf = useCallback((f: FowlRecord) => birdCodes.get(String(f.id)) || normalizeBirdCode(f.bird_code), [birdCodes]);
  const suggestedBirdCode = useMemo(
    () => previewBirdCode({ gender: newGender, sireName, damName, fowls, taken: takenCodes }),
    [newGender, sireName, damName, fowls, takenCodes]
  );

  // ── Bloodline composition preview (hatian ng dugo per lahi) ──
  const previewComposition = useMemo<BloodlineComposition>(() => {
    const draft = {
      id: -1,
      name: newName.trim() || '__preview__',
      breed: selectedStrains.length > 0 ? selectedStrains.join(', ') : newBreed,
      gender: newGender,
      sire: sireName,
      dam: damName,
    } as FowlRecord;
    return computeBloodlineComposition(draft, fowls);
  }, [newName, newBreed, selectedStrains, newGender, sireName, damName, fowls]);
  const previewBloodlineStats = useMemo(() => getBloodlineStats(previewComposition), [previewComposition]);
  /**
   * "Lineage verified" used to mean "the breeder typed two purity numbers that
   * add to 100". The purity inputs are gone — the engine is the single source
   * now, so verified means: parents are named and at least one of them maps to
   * a registered ancestry we can compute a known share from.
   */
  const bloodlineVerified =
    hasAnyParent && previewBloodlineStats !== null && previewBloodlineStats.knownPct > 0;
  /**
   * Bloodline trace results for every registered bird, computed in one pass
   * whenever the registry changes. Consumers read from this map instead of
   * re-walking each bird's ancestry on every render.
   */
  const bloodlineStatsById = useMemo(() => {
    const map = new Map<string, BloodlineStats | null>();
    for (const f of fowls) map.set(String(f.id), getFowlBloodlineStats(f, fowls));
    return map;
  }, [fowls]);

  const bloodlineStatsOf = useCallback(
    (f: FowlRecord) => bloodlineStatsById.get(String(f.id)) ?? getFowlBloodlineStats(f, fowls),
    [bloodlineStatsById, fowls]
  );

  // ── Age/birthdate handlers (from formState) ──

  // ── Data fetching ──
  const fetchDatabaseResources = useCallback(async () => {
    setLoading(true);
    try {
      const [fowlData, matchData, strainNames, legColorNames, pairings] = await Promise.all([
        fowlService.fetchFowls(),
        matchService.fetchMatches(),
        strainService.fetchStrains(),
        strainService.fetchLegColors(),
        breedingService.fetchBreedingPairings(),
      ]);
      setFowls(fowlData);
      setMatchHistory(matchData);
      setMatchMedia(await mediaService.fetchMatchMedia(matchData.map(m => m.id)));
      setBreedingPairs(pairings.data);
      setAvailableStrains(strainNames);
      setCustomStrainNames(new Set(strainNames.filter(s => !STRAIN_LIST.includes(s))));
      setAvailableLegColors(legColorNames);
      setCustomLegColorNames(new Set(legColorNames.filter(s => !LEG_COLOR_LIST.includes(s))));
      setLoadError(null);
    } catch (err) {
      // Keep whatever we already had on screen: wiping the lists here made a
      // failed request indistinguishable from a genuinely empty farm. The
      // banner in the dashboard layout reports this instead.
      console.error('Failed to fetch database resources:', err);
      const detail = err instanceof Error ? err.message : String(err ?? '');
      setLoadError(
        detail
          ? `Could not refresh the chicken registry (${detail}).`
          : 'Could not refresh the chicken registry — the network request failed.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Push a batch of planned lineage patches to the database. Shared by every
   * flow that invalidates stored bloodline compositions (create, edit,
   * permanent delete) so they all report and stop the same way.
   */
  const applyLineagePatches = useCallback(async (patches: LineageRefreshPatch[]): Promise<number> => {
    let refreshed = 0;
    for (const { id, patch } of patches) {
      const { error } = await fowlService.updateFowl(id, patch);
      if (error) {
        console.error('Failed to refresh lineage composition:', error);
        break;
      }
      refreshed++;
    }
    if (refreshed > 0) {
      toastMessage(
        `Bloodline recomputed for ${refreshed} chicken${refreshed === 1 ? '' : 's'}.`,
        'success'
      );
    }
    return refreshed;
  }, []);

  /**
   * Re-sync descendants after a chicken is created or edited: every child whose
   * stored bloodline drifted (or that still points at a renamed parent) gets
   * its own update, so the stored 50/50 percentages never go stale.
   */
  const refreshDescendantCompositions = useCallback(
    async (root: FowlRecord, previousName?: string | null): Promise<number> => {
      try {
        return await applyLineagePatches(planLineageRefresh({ root, previousName, fowls }));
      } catch (err) {
        console.error('Failed to refresh lineage composition:', err);
        return 0;
      }
    },
    [fowls, applyLineagePatches]
  );

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
    if (STRAIN_LIST.includes(name)) {
      toastMessage(`"${name}" is a built-in strain and can't be deleted.`, 'warning');
      return;
    }
    setAvailableStrains((prev) => prev.filter((s) => s !== name));
    setCustomStrainNames((prev) => { const n = new Set(prev); n.delete(name); return n; });
    setSelectedStrains((prev) => prev.filter((s) => s !== name));
    const result = await strainService.deleteStrain(name);
    if (result.error) {
      toastMessage(`Failed to delete "${name}" from database.`, 'error');
    } else {
      toastMessage(`Strain "${name}" deleted.`, 'success');
    }
  }, [ui]);

  const deleteCustomLegColor = useCallback(async (name: string): Promise<void> => {
    if (LEG_COLOR_LIST.includes(name)) {
      toastMessage(`"${name}" is a built-in leg color and can't be deleted.`, 'warning');
      return;
    }
    const result = await strainService.deleteLegColor(name);
    if (!result.error) {
      setAvailableLegColors((prev) => prev.filter((s) => s !== name));
      setCustomLegColorNames((prev) => { const n = new Set(prev); n.delete(name); return n; });
      toastMessage(`Leg color "${name}" deleted.`, 'success');
    }
  }, [ui]);

  const addStrain = useCallback((strain: string) => {
    const trimmed = strain.trim();
    if (!trimmed) return;
    if (!selectedStrains.includes(trimmed)) {
      setSelectedStrains((prev) => [...prev, trimmed]);
    }
    if (!availableStrains.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setAvailableStrains((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
      setCustomStrainNames((prev) => new Set([...prev, trimmed]));
      strainService.saveCustomStrain(trimmed).then((saved) => {
        if (!saved) toastMessage(`Strain "${trimmed}" saved locally only.`, 'warning');
      }).catch(() => {});
    }
    setStrainQuery('');
    setNewBreed('');
  }, [selectedStrains, availableStrains, setNewBreed, ui]);

  const removeStrain = useCallback((index: number) => {
    setSelectedStrains((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Fowl CRUD ──
  const handleAddFowl = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateFowlForm({
      name: newName,
      breed: selectedStrains.length > 0 ? selectedStrains.join(', ') : newBreed,
      gender: newGender,
      weight,
      height,
      sirePct,
      damPct,
      birdCode,
    });
    if (!validation.success) {
      toastMessage(`Validation Error: ${validation.errors[0]}`, 'error');
      return;
    }

    // ── Unique name: each chicken in the registry owns its name ──
    const newKey = nameKey(sanitizeInput(newName));
    if (newKey && fowls.some((f) => nameKey(f.name) === newKey)) {
      toastMessage(`A chicken named "${newName.trim()}" already exists. Pick a unique name.`, 'error');
      return;
    }

    const submittedCode = normalizeBirdCode(birdCode);
    const codeToUse = submittedCode || suggestedBirdCode;
    if (!isValidBirdCode(codeToUse)) {
      toastMessage(`Invalid Chicken Code: use letters, numbers, x, - or . only.`, 'error');
      return;
    }
    if (takenCodes.has(codeToUse.toLowerCase())) {
      toastMessage(`Chicken Code "${codeToUse}" is already in use. Pick another.`, 'error');
      return;
    }

    // ── Wing band ID: physical band number, unique across the farm ──
    const bandValue = wingBand.trim();
    if (bandValue && !/^[A-Za-z0-9._-]{1,24}$/.test(bandValue)) {
      toastMessage('Wing Band: use letters, numbers, - . _ only (max 24 chars).', 'error');
      return;
    }
    if (bandValue && fowls.some((f) => (f.wing_band || '').trim().toLowerCase() === bandValue.toLowerCase())) {
      toastMessage(`Wing Band "${bandValue}" is already in use. Pick another.`, 'error');
      return;
    }

    setLoading(true);
    let publicImageUrl = '';

    try {
      if (selectedImage) {
        setUploadingImage(true);
        const result = await fowlService.uploadFowlImage(selectedImage);
        if (result.error) throw new Error(result.error);
        publicImageUrl = result.url || '';
      }

      const activeUserId = (await supabase.auth.getUser()).data.user?.id;
      if (!activeUserId) {
        toastMessage('Authentication Error: Active session user ID not detected.', 'error');
        return;
      }

      const autoParts = autoCalcAge ? getAgePartsHelper(newBirthdate) : null;

      const breedValue = selectedStrains.length > 0 ? selectedStrains.join(', ') : sanitizeInput(newBreed) || 'Unspecified Strain';
      const composition = computeBloodlineComposition(
        {
          id: -1,
          name: sanitizeInput(newName),
          breed: breedValue,
          gender: newGender || 'Rooster',
          sire: sireName.trim() ? sanitizeInput(sireName) : 'Foundation Stock',
          dam: damName.trim() ? sanitizeInput(damName) : 'Foundation Stock',
        } as FowlRecord,
        fowls
      );
      const compositionStats = getBloodlineStats(composition);

      const sireValue = sireName.trim() ? sanitizeInput(sireName) : 'Foundation Stock';
      const damValue = damName.trim() ? sanitizeInput(damName) : 'Foundation Stock';

      // Legacy `sire_pct`/`dam_pct` columns — still written so the DB/API
      // contract holds, but no longer user-entered, displayed, or averaged
      // into any percentage. The composition engine is the only source of truth.
      const sPct = isFoundationStock(sireValue) ? 100 : 50;
      const dPct = isFoundationStock(damValue) ? 100 : 50;

      const payload = {
        user_id: activeUserId,
        name: sanitizeInput(newName),
        breed: breedValue,
        gender: newGender || 'Rooster',
        color: newColor,
        color_category: newColorCategory,
        growth_stage: autoParts ? autoComputeGrowthStage(autoParts.totalMonths, newGender || 'Rooster') : newGrowthStage,
        behavior_trait: newBehaviorTrait,
        eye_variant: newEyeVariant,
        birthdate: newBirthdate || null,
        age: autoParts
          ? `${autoParts.totalMonths} Months`
          : age && !isNaN(Number(age))
          ? `${Number(age)} Months`
          : 'N/A',
        weight: weight ? weightToStorage(weight, unitPrefs.weightUnit) : '',
        height: height ? heightToStorage(height, unitPrefs.heightUnit) : '',
        leg_color: newLegColor.trim() ? newLegColor.trim() : 'N/A',
        sire: sireValue,
        dam: damValue,
        ...parentLinkIds({ user_id: activeUserId }, sireValue, damValue, fowls),
        sire_pct: sPct,
        dam_pct: dPct,
        bloodline_pct: compositionStats?.specificPct ?? computedBloodlinePct,
        bloodline_composition: composition,
        bird_code: codeToUse,
        wing_band: bandValue || null,
        status: 'Active',
        image_url: publicImageUrl,
      };

      const result = await fowlService.insertFowl(payload);
      if (result.error) {
        toastMessage(`Database Error: ${result.error}`, 'error');
      } else {
        toastMessage('GalloTrack Registry Object saved successfully.', 'success');
        for (const s of selectedStrains) {
          await strainService.saveCustomStrain(s);
        }
        const createdGender = newGender || 'Rooster';
        setNewName(''); setNewBreed(''); setNewGender(''); setSireName(''); setDamName(''); setSirePct(''); setDamPct(''); setWeight(''); setHeight(''); setNewLegColor(''); setLegColorQuery(''); setAge(''); setNewBirthdate(''); setNewGrowthStage(''); setSelectedImage(null); setStrainQuery(''); setStrainOpen(false); setSelectedStrains([]); setImagePreview(''); setBirdCode(''); setWingBand('');
        if (result.id != null) {
          await refreshDescendantCompositions({ ...payload, id: result.id } as FowlRecord, null);
        }
        fetchDatabaseResources();
        ui.setProfilingSubTab(isMaleHelper(createdGender) ? 'males' : 'females');
      }
    } catch (err: unknown) {
      toastMessage(`Upload Cluster Failure: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  }, [newName, newBreed, newGender, newBirthdate, age, weight, height, newLegColor, sireName, damName, sirePct, damPct, birdCode, wingBand, suggestedBirdCode, takenCodes, newColor, newColorCategory, newGrowthStage, newBehaviorTrait, newEyeVariant, selectedImage, computedBloodlinePct, selectedStrains, availableStrains, refreshDescendantCompositions, fetchDatabaseResources, ui]);

  const handleAddMatchRecord = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateMatchForm({
      selectedFowl: selectedFowlForMatch,
      date: matchDate,
      opponentName,
      opponentBreed,
      location: matchLocation,
      type: matchType,
      outcome: matchOutcome,
      postFightCondition: matchPostFight,
      matchSide,
      notes: matchNotes,
      cockCount,
      ageCategory,
      eventType,
      derbyMatchNumber,
    });
    if (!validation.success) {
      toastMessage(`Validation Error: ${validation.errors[0]}`, 'error');
      return;
    }

    setLoading(true);

    try {
      const matchedFowl = fowls.find(f => f.name === selectedFowlForMatch);
      const fowlBreed = matchedFowl ? matchedFowl.breed : 'Unknown';

      let videoUrl = '';
      const videoUrls: string[] = [];
      const photoUrls: string[] = [];
      if (matchVideoFiles.length > 0 || matchPhotoFiles.length > 0 || opponentPhoto) {
        setUploadingVideo(true);
      }
      for (const videoFile of matchVideoFiles) {
        const result = await matchService.uploadMatchVideo(videoFile);
        if (result.error) throw new Error(result.error);
        if (result.url) videoUrls.push(result.url);
      }
      videoUrl = videoUrls[0] || '';

      let opponentPhotoUrl = '';
      if (opponentPhoto) {
        const photoResult = await mediaService.uploadMatchPhotoFile(opponentPhoto);
        if (photoResult.error) throw new Error(photoResult.error);
        opponentPhotoUrl = photoResult.url || '';
      }
      for (const photoFile of matchPhotoFiles) {
        const result = await mediaService.uploadMatchPhotoFile(photoFile);
        if (result.error) throw new Error(result.error);
        if (result.url) photoUrls.push(result.url);
      }
      setUploadingVideo(false);

      const activeUserId = (await supabase.auth.getUser()).data.user?.id;
      if (!activeUserId) {
        toastMessage('Authentication Error: Active session user ID not detected.', 'error');
        return;
      }

      const payload = {
        user_id: activeUserId,
        date: matchDate || new Date().toISOString().split('T')[0],
        entry_name: selectedFowlForMatch,
        breed: fowlBreed,
        opponent: sanitizeInput(opponentName) || 'Anonymous Opponent',
        opponent_breed: sanitizeInput(opponentBreed) || '',
        opponent_bloodline: opponentBloodline.trim() ? sanitizeInput(opponentBloodline) : null,
        opponent_birthdate: opponentHatch.trim() || null,
        opponent_photo_url: opponentPhotoUrl || null,
        location: sanitizeInput(matchLocation),
        type: matchType || 'Main Event',
        derby_match_number: derbyMatchNumber,
        outcome: matchOutcome,
        status: 'Verified',
        post_fight_condition: matchPostFight,
        side: matchSide.trim() ? sanitizeInput(matchSide) : null,
        notes: matchNotes.trim() ? sanitizeInput(matchNotes) : null,
        video_url: videoUrl || null,
        cock_count: cockCount,
        age_category: ageCategory,
        event_type: eventType === '__custom__' ? '' : eventType,
      };

      const result = await matchService.insertMatch(payload);
      if (result.error || !result.id) {
        throw new Error(result.error || 'Failed to save match');
      } else {
        const newMatchId = result.id;
        for (let i = 0; i < videoUrls.length; i++) {
          const v = await mediaService.insertMatchVideo(newMatchId, videoUrls[i], i + 1);
          if (v.error) console.warn('Match video save skipped:', v.error);
        }
        for (let i = 0; i < photoUrls.length; i++) {
          const p = await mediaService.insertMatchPhoto(newMatchId, photoUrls[i], i + 1);
          if (p.error) console.warn('Match photo save skipped:', p.error);
        }

        // Save betting/option data to match_options table
        const optResult = await matchOptionsService.insertMatchOption({
          option_number: matchOption,
          fowl_entry: selectedFowlForMatch,
          partner_entry: partnerEntry || undefined,
          bet_type: betType,
          target_number: targetNumber,
          status: partnerEntry ? 'matched' : 'pending',
        });
        if (optResult.error) {
          console.warn('Match options save skipped:', optResult.error);
        }

        // Persist a custom event type once so it becomes a reusable option
        if (eventType && eventType !== '__custom__') {
          const opts = await optionsService.fetchRegistryOptions();
          const known = new Set(opts.filter((o) => o.list_key === 'event_type').map((o) => o.value));
          if (!known.has(eventType)) {
            await optionsService.addRegistryOption('event_type', eventType);
          }
        }

        toastMessage('Performance match vector successfully computed and logged.', 'success');
        setOpponentName(''); setOpponentBreed(''); setMatchLocation(''); setMatchVideoFiles([]); setMatchPhotoFiles([]); setMatchPostFight('Fit / Recovered');
        setOpponentBloodline(''); setOpponentHatch(''); setOpponentPhoto(null);
        setMatchSide(''); setMatchNotes('');
        setPartnerEntry(''); setSuggestedPartners([]);
        fetchDatabaseResources();
        ui.setProfilingSubTab('males');
      }
    } catch (err: unknown) {
      toastMessage(`Database Write Constraint Fault: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setLoading(false);
      setUploadingVideo(false);
    }
  }, [selectedFowlForMatch, fowls, matchDate, opponentName, opponentBreed, matchLocation, matchType, matchSide, matchNotes, derbyMatchNumber, matchOutcome, matchPostFight, eventType, cockCount, ageCategory, matchVideoFiles, matchPhotoFiles, opponentBloodline, opponentHatch, opponentPhoto, matchOption, betType, targetNumber, partnerEntry, setSuggestedPartners, fetchDatabaseResources, ui]);

  const handleSetSireMaterial = useCallback(async (fowl: FowlRecord) => {
    setLoading(true);
    const result = await fowlService.setSireMaterial(fowl.id);
    if (result.error) {
      toastMessage(`Failed to mark ${fowl.name} as Sire Material: ${result.error}`, 'error');
    } else {
      toastMessage(`${fowl.name} is now Sire Material — retired from fighting, available for breeding.`, 'success');
      if (ui.selectedFowlForDetails?.id === fowl.id) ui.setSelectedFowlForDetails(null);
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [fetchDatabaseResources, ui]);

  const handleSetConditionStatus = useCallback(async (fowl: FowlRecord, value: string) => {
    setLoading(true);
    const result = await fowlService.setConditionStatus(fowl.id, value);
    if (result.error) {
      toastMessage(`Failed to update ${fowl.name}'s condition: ${result.error}`, 'error');
    } else {
      toastMessage(`${fowl.name}'s condition set to ${value}.`, 'success');
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [fetchDatabaseResources]);

  const handleSetBreedingRole = useCallback(
    async (fowl: FowlRecord, role: 'none' | 'breeder' | 'material') => {
      setLoading(true);
      const result = await fowlService.setBreedingRole(fowl.id, role);
      if (result.error) {
        toastMessage(`Failed to update ${fowl.name}'s breeding role: ${result.error}`, 'error');
      } else {
        const label = role === 'none' ? 'no breeding role' : role === 'breeder' ? 'Breeder' : 'Material';
        toastMessage(`${fowl.name} is now recorded as ${label}.`, 'success');
        fetchDatabaseResources();
      }
      setLoading(false);
    },
    [fetchDatabaseResources],
  );

  const handleSaveFowlNotes = useCallback(async (fowl: FowlRecord, notes: string) => {
    setLoading(true);
    const result = await fowlService.updateFowl(fowl.id, { notes });
    if (result.error) {
      toastMessage(`Failed to save notes: ${result.error}`, 'error');
    } else {
      toastMessage(`Notes saved for ${fowl.name}.`, 'success');
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [fetchDatabaseResources]);

  const handleSetActiveStatus = useCallback(async (fowl: FowlRecord) => {
    setLoading(true);
    const result = await fowlService.setFowlActive(fowl.id);
    if (result.error) {
      toastMessage(`Failed to return ${fowl.name} to Active: ${result.error}`, 'error');
    } else {
      toastMessage(`${fowl.name} is back to Active status.`, 'success');
      if (ui.selectedFowlForDetails?.id === fowl.id) ui.setSelectedFowlForDetails(null);
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [fetchDatabaseResources, ui]);

  const handleArchiveFowlWithReason = useCallback(async (draft?: ArchiveDraft) => {
    if (!ui.selectedFowlForArchive) return;
    const d: ArchiveDraft = {
      kind: draft?.kind ?? archiveReasonInput,
      note: draft?.note ?? archiveReasonNote,
      retiredScope: draft?.retiredScope ?? null,
      returnDate: draft?.returnDate ?? null,
    };
    const issue = archiveDraftIssue(d);
    if (issue) {
      toastMessage(issue, 'error');
      return;
    }
    setLoading(true);
    const result = await fowlService.archiveFowl(ui.selectedFowlForArchive.id, {
      kind: d.kind,
      note: d.note,
      retiredScope: d.retiredScope,
      returnDate: d.returnDate,
    });
    if (result.error) {
      toastMessage(result.error, 'error');
    } else {
      toastMessage(
        `${ui.selectedFowlForArchive.name} archived — ${archiveKindLabel(d.kind)}.`,
        'warning',
      );
      setArchiveReasonNote('');
      if (ui.selectedFowlForDetails?.id === ui.selectedFowlForArchive.id) ui.setSelectedFowlForDetails(null);
      ui.setSelectedFowlForArchive(null);
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [archiveReasonInput, archiveReasonNote, fetchDatabaseResources, ui]);

  const handleArchiveFowlOnly = useCallback(async (id: number) => {
    setLoading(true);
    const result = await fowlService.archiveFowl(id);
    if (result.error) {
      toastMessage(result.error, 'error');
    } else {
      toastMessage('Chicken archived successfully.', 'warning');
      if (ui.selectedFowlForDetails?.id === id) ui.setSelectedFowlForDetails(null);
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [fetchDatabaseResources, ui]);

  const handleRestoreFowlOnly = useCallback(async (id: number) => {
    setLoading(true);
    const result = await fowlService.restoreFowl(id);
    if (result.error) {
      toastMessage(result.error, 'error');
    } else {
      toastMessage('Node successfully restored to active family registry.', 'success');
      if (ui.selectedFowlForDetails?.id === id) ui.setSelectedFowlForDetails(null);
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [fetchDatabaseResources, ui]);

  const handlePermanentDelete = useCallback(async () => {
    const deleted = ui.pendingPermanentDelete;
    if (!deleted) return;
    ui.setPermanentDeleting(true);
    const result = await fowlService.deleteFowl(deleted.id);
    if (result.error) {
      toastMessage(result.error, 'error');
    } else {
      toastMessage(`${deleted.name} permanently deleted.`, 'success');
      if (ui.selectedFowlForDetails?.id === deleted.id) ui.setSelectedFowlForDetails(null);
      ui.setPendingPermanentDelete(null);
      setFowls(prev => prev.filter(f => f.id !== deleted.id));
      // The database already dropped the FK links (sire_id/dam_id, match.fowl_id)
      // and cascaded photos/status history, so the stored bloodline compositions
      // of every descendant are now wrong — rebuild them, then re-sync matches,
      // media and pairings so no orphaned rows linger on screen.
      await applyLineagePatches(planLineageRefreshAfterDelete({ deleted, fowls }));
      await fetchDatabaseResources();
    }
    ui.setPermanentDeleting(false);
  }, [ui, setFowls, applyLineagePatches, fowls, fetchDatabaseResources]);

  const handleMarkFowlDeceased = useCallback(async () => {
    if (!ui.selectedFowlForDeceased) return;
    const typedCause = deathReasonNote.replace(/[<>&"]/g, '').trim();
    if (deathReasonInput === 'Other' && !typedCause) {
      toastMessage('Type the cause of death before confirming (Other).', 'error');
      return;
    }
    const finalCause = deathReasonInput === 'Other' ? typedCause : deathReasonInput;
    setLoading(true);
    const result = await fowlService.markFowlDeceased(ui.selectedFowlForDeceased.id, finalCause);
    if (result.error) {
      toastMessage(result.error, 'error');
    } else {
      toastMessage('Chicken node recorded under mortality archive log.', 'error');
      setDeathReasonNote('');
      if (ui.selectedFowlForDetails?.id === ui.selectedFowlForDeceased.id) ui.setSelectedFowlForDetails(null);
      ui.setSelectedFowlForDeceased(null);
      fetchDatabaseResources();
    }
    setLoading(false);
  }, [deathReasonInput, deathReasonNote, fetchDatabaseResources, ui]);

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
    setEditWeight(weightFromStorage(fowl.weight, unitPrefs.weightUnit));
    setEditHeight(heightFromStorage(fowl.height, unitPrefs.heightUnit));
    setEditLegColor(fowl.leg_color || 'N/A');
    setEditSire(fowl.sire || '');
    setEditDam(fowl.dam || '');
    setEditSirePct(isFoundationStock(fowl.sire || '') ? 100 : (fowl.sire_pct ?? 0));
    setEditDamPct(isFoundationStock(fowl.dam || '') ? 100 : (fowl.dam_pct ?? 0));
    setEditBirdCode(birdCodeOf(fowl));
    setEditWingBand(fowl.wing_band || '');
  }, [ui, birdCodeOf]);

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
      const editAutoParts = autoCalcAge ? getAgePartsHelper(editBirthdate) : null;

      // Validate the raw input — normalizing first would silently truncate oversize codes.
      const submittedCode = String(editBirdCode ?? '').replace(/\s+/g, '');
      if (!isValidBirdCode(submittedCode)) {
        toastMessage('Invalid Chicken Code: use letters, numbers, x, - or . only (max 24 chars).', 'error');
        return;
      }
      const editingId = String(ui.editingFowl.id);
      const duplicateCode = Array.from(birdCodes.entries()).some(
        ([id, code]) => editingId !== id && code.toLowerCase() === submittedCode.toLowerCase()
      );
      if (duplicateCode) {
        toastMessage(`Chicken Code "${submittedCode}" is already in use. Pick another.`, 'error');
        return;
      }

      // ── Unique name: one chicken per name (excluding the record being edited) ──
      const editKey = nameKey(sanitizeInput(editName));
      if (editKey && fowls.some((f) => f.id !== ui.editingFowl?.id && nameKey(f.name) === editKey)) {
        toastMessage(`A chicken named "${editName.trim()}" already exists. Pick a unique name.`, 'error');
        return;
      }

      // ── Wing band ID: physical band number, unique across the farm ──
      const editBand = editWingBand.trim();
      if (editBand && !/^[A-Za-z0-9._-]{1,24}$/.test(editBand)) {
        toastMessage('Wing Band: use letters, numbers, - . _ only (max 24 chars).', 'error');
        return;
      }
      const duplicateBand = fowls.some(
        (f) => f.id !== ui.editingFowl?.id && (f.wing_band || '').trim().toLowerCase() === editBand.toLowerCase()
      );
      if (editBand && duplicateBand) {
        toastMessage(`Wing Band "${editBand}" is already in use. Pick another.`, 'error');
        return;
      }

      const editComposition = computeBloodlineComposition(
        {
          id: ui.editingFowl.id,
          name: sanitizeInput(editName),
          breed: sanitizeInput(editBreed),
          gender: editGender,
          sire: editSire.trim() ? sanitizeInput(editSire) : 'Foundation Stock',
          dam: editDam.trim() ? sanitizeInput(editDam) : 'Foundation Stock',
        } as FowlRecord,
        fowls
      );
      const editCompositionStats = getBloodlineStats(editComposition);

      const editSireValue = editSire.trim() ? sanitizeInput(editSire) : 'Foundation Stock';
      const editDamValue = editDam.trim() ? sanitizeInput(editDam) : 'Foundation Stock';
      const editing = ui.editingFowl;
      const resolvedParents = parentLinkIds(
        { id: editing.id, user_id: editing.user_id },
        editSireValue,
        editDamValue,
        fowls
      );
      // An unchanged parent name keeps its existing link even when the name is
      // ambiguous; only a renamed side is re-resolved (and may drop to null).
      const keptSireId =
        resolvedParents.sire_id ??
        (nameKey(editSireValue) === nameKey(editing.sire) ? editing.sire_id ?? null : null);
      const keptDamId =
        resolvedParents.dam_id ??
        (nameKey(editDamValue) === nameKey(editing.dam) ? editing.dam_id ?? null : null);

      const payload = {
        name: sanitizeInput(editName),
        breed: sanitizeInput(editBreed),
        gender: editGender,
        color: editColor,
        color_category: editColorCategory,
        growth_stage: editAutoParts ? autoComputeGrowthStage(editAutoParts.totalMonths, editGender || 'Rooster') : editGrowthStage,
        behavior_trait: editBehaviorTrait,
        eye_variant: editEyeVariant,
        birthdate: editBirthdate || null,
        age: editAutoParts
          ? `${editAutoParts.totalMonths} Months`
          : editAge && !isNaN(Number(editAge))
          ? `${Number(editAge)} Months`
          : 'N/A',
        weight: editWeight ? weightToStorage(editWeight, unitPrefs.weightUnit) : '',
        height: editHeight ? heightToStorage(editHeight, unitPrefs.heightUnit) : '',
        leg_color: editLegColor.trim() ? editLegColor.trim() : 'N/A',
        sire: editSireValue,
        dam: editDamValue,
        sire_id: keptSireId,
        dam_id: keptDamId,
        sire_pct: sPct,
        dam_pct: dPct,
        bloodline_pct: editCompositionStats?.specificPct ?? calculatedBloodline,
        bloodline_composition: editComposition,
        bird_code: submittedCode,
        wing_band: editBand || null
      };

      const result = await fowlService.updateFowl(ui.editingFowl.id, payload);
      if (result.error) throw new Error(result.error);

      toastMessage('GalloTrack Node object updated in cloud cluster.', 'success');
      await strainService.saveCustomStrain(editBreed);
      const editedRoot = {
        ...ui.editingFowl,
        name: payload.name,
        breed: payload.breed,
        gender: payload.gender,
        sire: payload.sire,
        dam: payload.dam,
        bloodline_pct: payload.bloodline_pct,
        bloodline_composition: payload.bloodline_composition,
      } as FowlRecord;
      await refreshDescendantCompositions(editedRoot, ui.editingFowl.name);
      ui.setEditingFowl(null);
      fetchDatabaseResources();
    } catch (err: unknown) {
      toastMessage(`Update Cluster Failure: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [editName, editBreed, editGender, editColor, editColorCategory, editGrowthStage, editBehaviorTrait, editEyeVariant, editBirthdate, editAge, editWeight, editHeight, editLegColor, editSire, editDam, editSirePct, editDamPct, editBirdCode, editWingBand, birdCodes, fowls, availableStrains, refreshDescendantCompositions, fetchDatabaseResources, ui]);

  // ── Local helper wrappers ──
  const generationOfLocal = useCallback((f: FowlRecord) => generationOfHelper(f, fowls), [fowls]);
  const parentBloodlinePctLocal = useCallback((f: FowlRecord) => parentBloodlinePctHelper(f, fowls), [fowls]);
  const getSiblingRelationsLocal = useCallback((f: FowlRecord) => getSiblingRelationsHelper(f, fowls), [fowls]);

  const value: FowlContextValue = {
    ...formState,
    deleteCustomStrain,
    deleteCustomLegColor,
    fowls, setFowls, activeFowls, sireMaterialFowls, maleActiveFowls, femaleActiveFowls, archivedFowls, deceasedFowls,
    matchHistory, setMatchHistory, matchMedia, breedingPairs, loading, setLoading, loadError,
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
    birdCodes, birdCodeOf, suggestedBirdCode, previewComposition, previewBloodlineStats, bloodlineStatsOf, bloodlineStatsById,
    offspringGenInfo, sireGenInfo, damGenInfo, sireGen, damGen,
    handleAddFowl, handleAddMatchRecord, handleUpdateFowl,
    handleOpenEditModal, handleArchiveFowlOnly, handleArchiveFowlWithReason,
    handleRestoreFowlOnly, handlePermanentDelete, handleMarkFowlDeceased,
    handleSetSireMaterial, handleSetActiveStatus,
    handleSetConditionStatus, handleSetBreedingRole, handleSaveFowlNotes,
    fetchDatabaseResources,
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
    deathReasonNote, setDeathReasonNote,
    archiveReasonInput, setArchiveReasonInput,
    archiveReasonNote, setArchiveReasonNote,
    breakdownTab, setBreakdownTab,
    dateRangePreset, setDateRangePreset,
    dateRangeOpen, setDateRangeOpen,
  };

  return <FowlContext.Provider value={value}>{children}</FowlContext.Provider>;
}

export function FowlProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <FowlFormStateProvider>
      <FowlProviderInternal>{children}</FowlProviderInternal>
    </FowlFormStateProvider>
  );
}
