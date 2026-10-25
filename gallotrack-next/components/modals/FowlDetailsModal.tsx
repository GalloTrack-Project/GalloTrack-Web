'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Printer, Share2, GitBranch } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import type {
  FowlRecord,
  MatchRecord,
  SiblingRelation,
  AgeParts,
  MilestoneInfo,
  PairingAnalytics,
  ArchiveBadge,
  StatusHistoryEntry,
  FowlPhotoRecord,
} from '@/lib/types';
import BloodlineReportCard from '@/components/BloodlineReportCard';
import BloodlineBreakdown from '@/components/BloodlineBreakdown';
import BloodlineProvenance from '@/components/BloodlineProvenance';
import { birdCodeOf, formatBirdCodeForDisplay } from '@/lib/bird-code';
import { activePartnerOf, childrenOf, originPairingOf, parentRecordOf } from '@/lib/lineage';
import { birdFamilyStats } from '@/lib/family-stats';
import {
  useUnitPrefs,
  weightFromStorage,
  heightFromStorage,
  weightUnitLabel,
  heightUnitLabel,
} from '@/lib/units';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import { isMale, isFemale, parentBloodlineOf, winRateOf, formatColorDisplay } from '@/lib/helpers';
import { getBreedingClassification, isFoundationStockRecord } from '@/lib/breeding-classification';
import BreedingTypeBadge from '@/components/BreedingTypeBadge';
import { getOffspringParentageRelatedness } from '@/lib/relatedness-classification';
import RelatednessBadge from '@/components/RelatednessBadge';
import { printReport } from '@/lib/report-export';
import { Modal } from '@/components/ui';
import {
  archiveDisplay,
  breedingRoleLabel,
  conditionLabel,
  mergeOptions,
  retiredScopeLabel,
} from '@/lib/lifecycle';
import { fetchStatusHistory } from '@/lib/services/fowl-service';
import {
  fetchFowlPhotos,
  insertFowlPhoto,
  deleteFowlPhoto,
  uploadFowlGalleryFile,
  videosFor,
  photosFor,
  postersFor,
} from '@/lib/services/media-service';
import { toastMessage } from '@/lib/toast-bus';
import MatchMediaButtons from '@/components/match/MatchMediaButtons';
import { useRegistryOptions } from '@/lib/hooks/use-registry-options';
import {
  buildRegistryContext,
  roleOf,
  isRetiredFighter,
  extractFoughtLookups,
} from '@/lib/registry-roles';
import {
  BREEDING_ROLE_LABELS,
  BREEDING_ROLE_FIELD_LABEL,
  MARK_AS_BREEDING_STOCK_BUTTON,
  SET_BACK_TO_ACTIVE_BUTTON,
  REMOVE_BREEDING_STOCK_BUTTON,
} from '@/lib/registry-labels';
import RetiredFighterBadge from '@/components/profiling/RetiredFighterBadge';

const HISTORY_FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  condition_status: 'Condition',
  breeding_role: 'Breeding role',
  activity_status: 'Activity',
  archive_kind: 'Archive reason',
  retired_scope: 'Retired scope',
};

const ROLE_OPTIONS: { value: 'none' | 'breeder' | 'material'; label: string }[] = [
  { value: 'none', label: BREEDING_ROLE_LABELS.none },
  { value: 'breeder', label: BREEDING_ROLE_LABELS.breeder },
  { value: 'material', label: BREEDING_ROLE_LABELS.material },
];

type FowlDetailsModalProps = {
  selectedFowlForDetails: FowlRecord | null;
  setSelectedFowlForDetails: (f: FowlRecord | null) => void;
  matchHistory: MatchRecord[];
  fowls: FowlRecord[];
  getAgeParts: (birthdate: string) => AgeParts | null;
  getAgeLabel: (parts: AgeParts) => string;
  getAgeExact: (parts: AgeParts) => string;
  getAgeMetrics: (parts: AgeParts) => string;
  generationOf: (f: FowlRecord) => number;
  /** @deprecated Use composition engine instead */
  generationPurity?: (gen: number) => number;
  generationInfo: (gen: number) => { short: string; label: string; desc: string; tone: string };
  bloodlineOf: (f: FowlRecord) => number;
  getSiblingRelations: (f: FowlRecord) => SiblingRelation[];
  getMilestoneInfo: (birthdate: string, gender: string) => MilestoneInfo | null;
  getArchiveBadgeStyle: (reason: string) => ArchiveBadge;
  pairingAnalytics: PairingAnalytics;
};

export default function FowlDetailsModal({
  selectedFowlForDetails,
  setSelectedFowlForDetails,
  matchHistory,
  fowls,
  getAgeParts,
  getAgeLabel,
  getAgeExact,
  getAgeMetrics,
  generationOf,
  generationInfo,
  bloodlineOf,
  getSiblingRelations,
  getMilestoneInfo,
  getArchiveBadgeStyle,
  pairingAnalytics,
}: FowlDetailsModalProps) {
  const unitPrefs = useUnitPrefs();
  const ui = useUI();
  const {
    handleSetSireMaterial,
    handleSetActiveStatus,
    handleSetConditionStatus,
    handleSetBreedingRole,
    handleSaveFowlNotes,
    handleRestoreFowlOnly,
    setArchiveReasonInput,
    handleOpenEditModal,
    breedingPairs,
    matchMedia,
    bloodlineStatsOf,
  } = useFowl();
  const { rows: optionRows } = useRegistryOptions();
  const router = useRouter();
  const t = useT();

  const fowlId = selectedFowlForDetails?.id ?? null;
  const ownerId = selectedFowlForDetails?.user_id ?? null;
  // State is keyed by fowl id so switching birds never shows stale history
  // or another chicken's notes draft (no effect + setState needed).
  const [historyState, setHistoryState] = useState<{
    fowlId: number | null;
    open: boolean;
    entries: StatusHistoryEntry[] | null;
  }>({ fowlId: null, open: false, entries: null });
  const [notesState, setNotesState] = useState<{ fowlId: number | null; draft: string }>({
    fowlId: null,
    draft: '',
  });
  const [busy, setBusy] = useState(false);

  const [gallery, setGallery] = useState<{ fowlId: number | null; photos: FowlPhotoRecord[] }>({
    fowlId: null,
    photos: [],
  });
  const [galleryBusy, setGalleryBusy] = useState(false);

  useEffect(() => {
    if (fowlId === null) return;
    let cancelled = false;
    fetchFowlPhotos(fowlId, ownerId).then((photos) => {
      if (!cancelled) setGallery({ fowlId, photos });
    });
    return () => {
      cancelled = true;
    };
  }, [fowlId, ownerId]);

  useEffect(() => {
    if (fowlId === null) return;
    if (historyState.fowlId === fowlId && historyState.entries !== null) return;
    let cancelled = false;
    fetchStatusHistory(fowlId).then((entries) => {
      if (!cancelled) {
        setHistoryState((s) => ({ fowlId, open: s.open && s.fowlId === fowlId, entries }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fowlId, historyState.fowlId, historyState.entries]);

  const galleryPhotos = gallery.fowlId === fowlId ? gallery.photos : [];

  const handleAddGalleryPhoto = async (file: File) => {
    if (fowlId === null) return;
    setGalleryBusy(true);
    try {
      const up = await uploadFowlGalleryFile(file);
      if (up.error || !up.url) throw new Error(up.error || 'Upload failed');
      const ins = await insertFowlPhoto(fowlId, up.url);
      if (ins.error) throw new Error(ins.error);
      const photos = await fetchFowlPhotos(fowlId, ownerId);
      setGallery({ fowlId, photos });
      toastMessage('Photo added to gallery.', 'success');
    } catch (err) {
      toastMessage(err instanceof Error ? err.message : 'Failed to add photo.', 'error');
    } finally {
      setGalleryBusy(false);
    }
  };

  const handleDeleteGalleryPhoto = async (photo: FowlPhotoRecord) => {
    const result = await deleteFowlPhoto(photo.id);
    if (result.error) {
      toastMessage(result.error, 'error');
    } else if (fowlId !== null) {
      setGallery({ fowlId, photos: gallery.photos.filter((p) => p.id !== photo.id) });
    }
  };

  const history = historyState.fowlId === fowlId ? historyState.entries : null;
  const historyOpen = historyState.fowlId === fowlId && historyState.open;
  const notesDraft =
    notesState.fowlId === fowlId ? notesState.draft : (selectedFowlForDetails?.notes ?? '');
  const setNotesDraft = (value: string) => setNotesState({ fowlId, draft: value });

  const refreshHistory = useCallback(async () => {
    if (fowlId === null) return;
    const entries = await fetchStatusHistory(fowlId);
    setHistoryState((s) => ({ ...s, fowlId, entries }));
  }, [fowlId]);

  const toggleHistory = useCallback(async () => {
    if (fowlId === null) return;
    if (historyState.fowlId === fowlId && historyState.open) {
      setHistoryState({ fowlId, open: false, entries: historyState.entries });
      return;
    }
    const entries =
      historyState.fowlId === fowlId && historyState.entries !== null
        ? historyState.entries
        : await fetchStatusHistory(fowlId);
    setHistoryState({ fowlId, open: true, entries });
  }, [fowlId, historyState]);

  const regCtx = useMemo(() => buildRegistryContext(fowls ?? []), [fowls]);
  const { foughtFowlIds, foughtNames } = useMemo(
    () => extractFoughtLookups(matchHistory ?? []),
    [matchHistory],
  );

  if (!selectedFowlForDetails) return null;

  // Fresh copy so chips/selects update right after a status change.
  const bird = fowls.find((f) => f.id === selectedFowlForDetails.id) ?? selectedFowlForDetails;
  const classification = getBreedingClassification(bird, fowls);
  const parentageRelatedness = getOffspringParentageRelatedness(bird, fowls);
  const isRetired = isRetiredFighter(bird, foughtFowlIds, foughtNames, regCtx);
  const conditionOptions = mergeOptions(
    optionRows,
    'post_match_condition',
    bird.condition_status,
  ).filter((o) => o.value !== 'Deceased');
  const notesClean = notesDraft === (bird.notes ?? '');

  const printProfileReport = () => {
    const fights = matchHistory
      .filter(
        (m) => (m.entry_name || '').trim().toLowerCase() === (bird.name || '').trim().toLowerCase(),
      )
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const wins = fights.filter((m) => (m.outcome || '').toLowerCase() === 'win').length;
    const losses = fights.filter((m) => (m.outcome || '').toLowerCase() === 'loss').length;
    const draws = fights.filter((m) => (m.outcome || '').toLowerCase() === 'draw').length;
    const ageParts = bird.birthdate ? getAgeParts(bird.birthdate) : null;
    const bloodlineStats = bloodlineStatsOf(bird);

    printReport({
      title: `Gamefowl Profile — ${bird.name}`,
      meta: [
        formatBirdCodeForDisplay(birdCodeOf(bird, fowls)),
        classification.type === 'Crossbred' ? classification.derivedBreed : bird.breed,
        bird.gender,
        bird.status,
      ]
        .filter(Boolean)
        .join(' · '),
      sections: [
        {
          heading: 'Profile',
          fields: [
            { label: 'Bird code', value: formatBirdCodeForDisplay(birdCodeOf(bird, fowls)) || '—' },
            { label: 'Wing band', value: bird.wing_band || '—' },
            { label: 'Name', value: bird.name },
            { label: 'Gender', value: bird.gender || '—' },
            {
              label: 'Breed / strain',
              value:
                classification.type === 'Crossbred'
                  ? classification.derivedBreed
                  : bird.breed || '—',
            },
            { label: 'Breeding classification', value: classification.badgeLabel },
            {
              label: 'Composition basis',
              value:
                classification.compositionSource === 'declared'
                  ? 'Declared'
                  : classification.compositionSource === 'adjusted'
                    ? 'Adjusted'
                    : classification.compositionSource === 'assumed'
                      ? 'Assumed'
                      : 'Derived',
            },
            {
              label: 'Feather color',
              value: formatColorDisplay(bird.feather_color || bird.color, bird.color_category),
            },
            { label: 'Trait', value: bird.trait || bird.behavior_trait || '—' },
            { label: 'Birthdate', value: bird.birthdate || '—' },
            { label: 'Age', value: ageParts ? getAgeLabel(ageParts) : '—' },
            {
              label: 'Weight',
              value: (() => {
                const regWeight =
                  bird.structural_weight !== undefined &&
                  bird.structural_weight !== null &&
                  bird.structural_weight !== ''
                    ? bird.structural_weight
                    : bird.weight;
                return regWeight
                  ? `${weightFromStorage(regWeight, unitPrefs.weightUnit)} ${weightUnitLabel(unitPrefs.weightUnit)}`
                  : '—';
              })(),
            },
            {
              label: 'Height',
              value: (() => {
                const regHeight =
                  bird.structural_height !== undefined &&
                  bird.structural_height !== null &&
                  bird.structural_height !== ''
                    ? bird.structural_height
                    : bird.height;
                return regHeight
                  ? `${heightFromStorage(regHeight, unitPrefs.heightUnit)} ${heightUnitLabel(unitPrefs.heightUnit)}`
                  : '—';
              })(),
            },
            { label: 'Leg color', value: bird.leg_color || '—' },
            { label: 'Sire', value: bird.sire || '—' },
            { label: 'Dam', value: bird.dam || '—' },
            { label: 'Generation', value: generationInfo(generationOf(bird)).label },
            {
              label: 'Dominant bloodline',
              value: `${classification.purityPct}% ${classification.dominantBreed}`,
            },
            { label: 'Parentage relatedness', value: parentageRelatedness.label },
          ],
        },
        {
          heading: 'Bloodline Composition',
          table: {
            columns: ['Strain', 'Share %'],
            rows: (bloodlineStats?.entries ?? []).map((e) => [e.strain, e.pct]),
          },
        },
        {
          heading: 'Performance Metrics',
          fields: [
            { label: 'Total fights', value: String(fights.length) },
            { label: 'Wins', value: String(wins) },
            { label: 'Losses', value: String(losses) },
            { label: 'Draws', value: String(draws) },
            { label: 'Win rate', value: wins + losses > 0 ? `${winRateOf(wins, losses)}%` : '—' },
          ],
        },
        {
          heading: 'Match History',
          table: {
            columns: [
              'Date',
              'Opponent',
              'Breed',
              'Event',
              'Outcome',
              'Location',
              'Post-Fight Condition',
            ],
            rows: fights.map((m) => [
              m.date,
              m.opponent,
              [m.breed, m.opponent_breed].filter(Boolean).join(' vs '),
              [m.event_type, m.type].filter(Boolean).join(' · '),
              m.outcome,
              m.location,
              m.post_fight_condition,
            ]),
          },
        },
      ],
    });
  };

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      await refreshHistory();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => setSelectedFowlForDetails(null)}
      title="Individual Chicken Analytics & Match Logs"
      icon={<span aria-hidden="true">🧬</span>}
      className="max-w-2xl"
    >
      <BloodlineReportCard fowl={selectedFowlForDetails} />

      <BloodlineBreakdown
        stats={bloodlineStatsOf(selectedFowlForDetails)}
        fowl={selectedFowlForDetails}
        fowls={fowls}
        title="Bloodline Percentage"
        onEditComposition={
          isFoundationStockRecord(selectedFowlForDetails)
            ? () => handleOpenEditModal(selectedFowlForDetails)
            : undefined
        }
      />

      <BloodlineProvenance
        fowl={selectedFowlForDetails}
        fowls={fowls}
        onOpenAncestor={(f) => setSelectedFowlForDetails(f)}
      />

      <div className="dark:bg-muted/50 dark:border-border flex flex-col items-center gap-4 rounded-lg border border-slate-200/70 bg-slate-50 p-4 sm:flex-row">
        <div className="dark:bg-card dark:border-border relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-inner">
          {selectedFowlForDetails.image_url ? (
            <img
              src={selectedFowlForDetails.image_url}
              alt={selectedFowlForDetails.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center font-mono text-xs font-bold">
              NO PHOTO
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1.5 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h4 className="dark:text-card-foreground text-lg font-black text-slate-900">
              {selectedFowlForDetails.name}
            </h4>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-black text-emerald-700 uppercase dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              {formatBirdCodeForDisplay(birdCodeOf(selectedFowlForDetails, fowls)) || '—'}
            </span>
            {selectedFowlForDetails.birth_code &&
              selectedFowlForDetails.birth_code !== birdCodeOf(selectedFowlForDetails, fowls) && (
                <span className="text-muted-foreground dark:bg-muted dark:border-border rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold">
                  born as {formatBirdCodeForDisplay(selectedFowlForDetails.birth_code)}
                </span>
              )}
            {selectedFowlForDetails.wing_band ? (
              <span
                className="text-teal rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 font-mono text-xs font-black uppercase dark:border-teal-800 dark:bg-teal-950/50"
                title="Wing Banding"
              >
                ⌁ {selectedFowlForDetails.wing_band}
              </span>
            ) : null}
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 uppercase dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              {classification.type === 'Crossbred'
                ? classification.derivedBreed
                : selectedFowlForDetails.breed}
            </span>
            <BreedingTypeBadge classification={classification} />
            {parentageRelatedness.type !== 'unknown' ? (
              <RelatednessBadge classification={parentageRelatedness} prefix="Bred from: " />
            ) : null}
            {isRetired && <RetiredFighterBadge />}
            {isFoundationStockRecord(selectedFowlForDetails) && (
              <button
                type="button"
                onClick={() => handleOpenEditModal(selectedFowlForDetails)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-800 uppercase transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
                title="Edit breed composition for this foundation chicken"
              >
                ✏️ Edit composition
              </button>
            )}
            <a
              href={`/lineage?tab=pedigree&chicken=${encodeURIComponent(birdCodeOf(selectedFowlForDetails, fowls) || String(selectedFowlForDetails.id))}`}
              onClick={() => setSelectedFowlForDetails(null)}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 uppercase transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
              title="Open 3-generation pedigree tree for this chicken"
            >
              📜 View pedigree
            </a>
            {(() => {
              if (selectedFowlForDetails.status === 'Deceased') {
                return (
                  <span className="rounded-full border border-rose-950 bg-rose-900 px-2.5 py-0.5 text-xs font-black text-white uppercase shadow-2xs">
                    💀 DECEASED
                  </span>
                );
              }
              if (selectedFowlForDetails.status === 'Sire Material') {
                return (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-700 uppercase dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                    ● SIRE MATERIAL
                  </span>
                );
              }
              if (selectedFowlForDetails.status === 'Archived') {
                const kind = selectedFowlForDetails.archive_kind;
                const badge = getArchiveBadgeStyle(
                  kind
                    ? kind === 'transfer'
                      ? 'TRANSFERRED'
                      : kind.toUpperCase()
                    : selectedFowlForDetails.archive_reason || 'OTHER',
                );
                return (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase ${badge.bg} border border-white/20 shadow-2xs`}
                  >
                    {badge.label}
                  </span>
                );
              }
              return (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 uppercase dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  ● ACTIVE
                </span>
              );
            })()}
          </div>
          <p className="text-muted-foreground text-xs font-medium">
            Growth Stage:{' '}
            <strong className="dark:text-card-foreground font-bold text-slate-800">
              {selectedFowlForDetails.growth_stage || 'Chick'}
            </strong>{' '}
            | Auto Age:{' '}
            <strong className="font-bold text-emerald-700 dark:text-emerald-300">
              {(() => {
                const p = getAgeParts(selectedFowlForDetails.birthdate);
                return p ? getAgeLabel(p) : selectedFowlForDetails.age || 'N/A';
              })()}
            </strong>{' '}
            | Legs:{' '}
            <strong className="dark:text-card-foreground font-bold text-slate-800">
              {selectedFowlForDetails.leg_color || 'N/A'}
            </strong>
          </p>
          {(() => {
            const p = getAgeParts(selectedFowlForDetails.birthdate);
            return p ? (
              <p className="text-muted-foreground font-mono text-xs font-semibold">
                Born {selectedFowlForDetails.birthdate} · Exact {getAgeExact(p)} ·{' '}
                {getAgeMetrics(p)}
              </p>
            ) : (
              <p className="text-warning text-xs font-bold dark:text-amber-300">
                ⚠️ No birth date recorded — use ✏️ Edit to set one for automatic age &amp; milestone
                tracking.
              </p>
            );
          })()}
          {selectedFowlForDetails.status === 'Deceased' && (
            <p className="text-danger text-xs font-bold dark:text-rose-300">
              💀 Cause of Death:{' '}
              <strong className="text-rose-800 dark:text-rose-300">
                {selectedFowlForDetails.death_reason || 'Unspecified'}
              </strong>
              {selectedFowlForDetails.death_date
                ? ` · Recorded ${selectedFowlForDetails.death_date}`
                : ''}
            </p>
          )}
          {selectedFowlForDetails.status !== 'Deceased' &&
            selectedFowlForDetails.status === 'Archived' && (
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                📦 Archived:{' '}
                <strong className="text-amber-800 dark:text-amber-300">
                  {archiveDisplay(selectedFowlForDetails, optionRows)}
                </strong>
                {selectedFowlForDetails.retired_scope ? (
                  <> · {retiredScopeLabel(selectedFowlForDetails.retired_scope, optionRows)}</>
                ) : null}
                {selectedFowlForDetails.return_date ? (
                  <> · Return expected {selectedFowlForDetails.return_date}</>
                ) : null}
                <span className="text-muted-foreground font-medium"> (Non-Mortality)</span>
              </p>
            )}
          {selectedFowlForDetails.status !== 'Deceased' &&
            selectedFowlForDetails.status !== 'Archived' &&
            isMale(selectedFowlForDetails.gender) && (
              <div className="pt-1.5">
                {selectedFowlForDetails.status === 'Sire Material' ? (
                  <button
                    type="button"
                    onClick={() => handleSetActiveStatus(selectedFowlForDetails)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                  >
                    {SET_BACK_TO_ACTIVE_BUTTON}
                  </button>
                ) : selectedFowlForDetails.breeding_role === 'material' ? (
                  <button
                    type="button"
                    onClick={() => handleSetBreedingRole(selectedFowlForDetails, 'none')}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                  >
                    {REMOVE_BREEDING_STOCK_BUTTON}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetSireMaterial(selectedFowlForDetails)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-amber-200/80 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition-all hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50"
                  >
                    {MARK_AS_BREEDING_STOCK_BUTTON}
                  </button>
                )}
              </div>
            )}
        </div>
      </div>

      {/* REPORT ACTIONS */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            const code = (
              bird.bird_code ||
              bird.chicken_code ||
              bird.birth_code ||
              String(bird.id)
            ).trim();
            const qs = new URLSearchParams({ tab: 'pedigree', chicken: code }).toString();
            router.push(`/lineage?${qs}`);
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-violet-200/80 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 transition-all hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300 dark:hover:bg-violet-900/50"
        >
          <GitBranch className="h-3.5 w-3.5" aria-hidden="true" /> View pedigree
        </button>
        <button
          type="button"
          onClick={printProfileReport}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Print / Export Profile Report
        </button>
      </div>

      {/* CHICKEN PHOTO GALLERY */}
      <div className="dark:bg-card dark:border-border space-y-2.5 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="dark:text-muted-foreground text-xs font-black tracking-wide text-slate-500 uppercase">
            Photo Gallery
          </h4>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                ui.setShareTarget({
                  type: 'fowl',
                  id: selectedFowlForDetails.id,
                  label: `${selectedFowlForDetails.name} — Profile`,
                })
              }
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              <Share2 className="h-3.5 w-3.5" /> Share Profile
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-300">
              <Plus className="h-3.5 w-3.5" /> Add Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={galleryBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAddGalleryPhoto(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedFowlForDetails.image_url && (
            <button
              type="button"
              onClick={() => ui.setImageViewerUrl(selectedFowlForDetails.image_url || '')}
              className="group relative cursor-pointer"
              title="View main photo"
            >
              <img
                src={selectedFowlForDetails.image_url}
                alt={`${selectedFowlForDetails.name} main`}
                className="border-border h-16 w-16 rounded border object-cover"
              />
              <span className="absolute right-0 bottom-0 left-0 rounded-b bg-black/50 text-center text-xs font-black text-white uppercase">
                Main
              </span>
            </button>
          )}
          {galleryPhotos.map((photo) => (
            <div key={photo.id} className="group relative">
              <button
                type="button"
                onClick={() => ui.setImageViewerUrl(photo.url)}
                className="block cursor-pointer"
              >
                <img
                  src={photo.url}
                  alt={`${selectedFowlForDetails.name} gallery`}
                  className="border-border h-16 w-16 rounded border object-cover"
                />
              </button>
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => void handleDeleteGalleryPhoto(photo)}
                className="bg-danger absolute -top-1.5 -right-1.5 hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white group-hover:flex"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {!selectedFowlForDetails.image_url && galleryPhotos.length === 0 && (
            <p className="text-muted-foreground text-xs font-semibold">
              No photos yet — add the first one.
            </p>
          )}
        </div>
      </div>

      {/* STATUS & LIFECYCLE — condition, role, activity and final status are separate */}
      <div className="dark:bg-card dark:border-border space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="dark:text-muted-foreground text-xs font-black tracking-wide text-slate-500 uppercase">
            Status &amp; Lifecycle
          </h4>
          <button
            type="button"
            onClick={() => void toggleHistory()}
            className="cursor-pointer text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-300"
          >
            {historyOpen ? 'Hide Status History' : 'View Status History'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
            🩹 Condition: {conditionLabel(bird.condition_status)}
          </span>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
            🧬 {breedingRoleLabel(bird.breeding_role)}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-black ${bird.activity_status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
          >
            {bird.activity_status === 'active' ? '● Active' : '○ Inactive'}
          </span>
          {bird.status === 'Archived' && bird.retired_scope ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              🏁 {retiredScopeLabel(bird.retired_scope, optionRows)}
            </span>
          ) : null}
        </div>

        {bird.status !== 'Deceased' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="dark:text-muted-foreground space-y-1 text-xs font-bold text-slate-600">
              Post-Match Condition
              <select
                value={bird.condition_status || 'Fit / Recovered'}
                disabled={busy}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === (bird.condition_status || 'Fit / Recovered')) return;
                  void runAction(() => handleSetConditionStatus(bird, value));
                }}
                className="border-input-border dark:bg-muted dark:text-card-foreground mt-1 w-full cursor-pointer rounded-md border bg-slate-50 p-2.5 text-sm font-semibold text-slate-800 focus:border-sky-500 disabled:opacity-60"
              >
                {conditionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {(() => {
              const regCtx = buildRegistryContext(fowls);
              const currentRole = roleOf(bird, regCtx);
              const isUnpromotedOffspring = currentRole === 'Non-Breeding';

              return (
                <label className="dark:text-muted-foreground space-y-1 text-xs font-bold text-slate-600">
                  {BREEDING_ROLE_FIELD_LABEL}
                  <select
                    value={bird.breeding_role || 'none'}
                    disabled={busy}
                    onChange={(e) => {
                      const role = e.target.value as 'none' | 'breeder' | 'material';
                      if (role === 'breeder' && isUnpromotedOffspring) return;
                      if (role === (bird.breeding_role || 'none')) return;
                      void runAction(() => handleSetBreedingRole(bird, role));
                    }}
                    className="border-input-border dark:bg-muted dark:text-card-foreground mt-1 w-full cursor-pointer rounded-md border bg-slate-50 p-2.5 text-sm font-semibold text-slate-800 focus:border-violet-500 disabled:opacity-60"
                  >
                    {ROLE_OPTIONS.map((o) => {
                      const disabled = o.value === 'breeder' && isUnpromotedOffspring;
                      return (
                        <option key={o.value} value={o.value} disabled={disabled}>
                          {o.label}
                          {disabled ? ' (promotion required)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {isUnpromotedOffspring && (
                    <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                      Offspring become breeders through the promotion flow.
                    </span>
                  )}
                </label>
              );
            })()}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {bird.status === 'Archived' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runAction(async () => {
                  await handleRestoreFowlOnly(bird.id);
                })
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 disabled:opacity-60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            >
              ↩ Return / Restore
            </button>
          ) : null}
          {bird.status !== 'Archived' && bird.status !== 'Deceased' ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setArchiveReasonInput('inactive');
                  ui.setSelectedFowlForArchive(bird);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Deactivate (Archive)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setArchiveReasonInput('sold');
                  ui.setSelectedFowlForArchive(bird);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-amber-200/80 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition-all hover:bg-amber-100 disabled:opacity-60 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50"
              >
                Archive…
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => ui.setSelectedFowlForDeceased(bird)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-rose-200/80 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition-all hover:bg-rose-100 disabled:opacity-60 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50"
              >
                Record as Deceased…
              </button>
            </>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Injuries never convert a chicken into a breeder — condition, breeding role, activity and
          final status are changed only by your decision, and every change is logged.
        </p>

        {historyOpen ? (
          <div className="dark:border-border space-y-1.5 border-t border-slate-200 pt-3">
            <p className="dark:text-card-foreground text-xs font-black text-slate-700">
              Status History
            </p>
            {history === null ? (
              <p className="text-muted-foreground text-xs font-semibold">Loading history…</p>
            ) : history.length === 0 ? (
              <p className="text-muted-foreground text-xs font-semibold">
                No status changes recorded yet.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {history.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span className="text-muted-foreground font-mono">
                      {new Date(entry.changed_at).toLocaleDateString()}
                    </span>
                    <span className="dark:text-card-foreground font-bold text-slate-700">
                      {HISTORY_FIELD_LABELS[entry.field] || entry.field}:
                    </span>
                    <span className="font-mono">
                      {entry.old_value ?? '—'} → {entry.new_value}
                    </span>
                    {entry.reason ? (
                      <span className="text-muted-foreground">({entry.reason})</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </div>

      {/* NOTES — add or edit any time, independent of the photo */}
      <div className="dark:bg-card dark:border-border space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="dark:text-muted-foreground text-xs font-black tracking-wide text-slate-500 uppercase">
            Notes
          </h4>
          <button
            type="button"
            disabled={busy || notesClean}
            onClick={() => void runAction(() => handleSaveFowlNotes(bird, notesDraft))}
            className="cursor-pointer text-xs font-bold text-emerald-700 hover:underline disabled:no-underline disabled:opacity-50 dark:text-emerald-300"
          >
            {notesClean ? 'Saved' : 'Save Notes'}
          </button>
        </div>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Observations, temperament, medical notes, handling tips…"
          className="border-input-border dark:bg-muted dark:text-card-foreground w-full resize-y rounded-md border bg-slate-50 p-2.5 text-sm font-medium text-slate-800 focus:border-emerald-500"
        />
      </div>

      {/* PARENTS · PARTNER · OFFSPRING */}
      {(() => {
        const bird = selectedFowlForDetails;
        const sire = parentRecordOf(bird, 'sire', fowls);
        const dam = parentRecordOf(bird, 'dam', fowls);
        const active = activePartnerOf(bird, breedingPairs, fowls);
        const kids = childrenOf(bird, fowls)
          .slice()
          .sort((a, b) => a.id - b.id);
        const kidId = (f: FowlRecord) =>
          formatBirdCodeForDisplay(birdCodeOf(f, fowls)) || `#${f.id}`;

        const relationRow = (
          role: string,
          icon: string,
          tone: string,
          target: FowlRecord | null,
          fallbackName: string,
          badge?: string,
        ) => {
          const foundation = !fallbackName || fallbackName.toLowerCase() === 'foundation stock';
          const meta = target
            ? [
                target.breed || null,
                formatBirdCodeForDisplay(birdCodeOf(target, fowls)),
                target.wing_band ? `Band ${target.wing_band}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || '—'
            : foundation
              ? 'Foundation'
              : 'External / unresolved';
          return (
            <div className="dark:border-border dark:bg-muted/50 flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border text-sm ${tone}`}
                >
                  {icon}
                </span>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-black tracking-widest uppercase">
                    {role}
                  </p>
                  {target ? (
                    <button
                      type="button"
                      onClick={() => setSelectedFowlForDetails(target)}
                      className="cursor-pointer truncate text-left text-sm font-black text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                      title="Open profile"
                    >
                      {target.name}
                    </button>
                  ) : (
                    <p className="dark:text-card-foreground truncate text-sm font-black text-slate-800">
                      {foundation ? 'Foundation Stock' : fallbackName || '—'}
                    </p>
                  )}
                  <p className="text-muted-foreground truncate text-xs font-semibold tracking-wider uppercase">
                    {meta}
                  </p>
                </div>
              </div>
              {badge ? (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-black uppercase ${tone}`}
                >
                  {badge}
                </span>
              ) : null}
            </div>
          );
        };

        const partnerFallback = active
          ? active.pairing.sire_id === bird.id ||
            (active.pairing.sire_id == null &&
              active.pairing.sire_name?.trim().toLowerCase() === bird.name.trim().toLowerCase())
            ? active.pairing.dam_name
            : active.pairing.sire_name
          : '';

        return (
          <div className="dark:bg-card dark:border-border rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <h4 className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 text-xs font-black tracking-widest text-emerald-800 uppercase dark:text-emerald-300">
              <span>🌳 Lineage Relationships</span>
              <span className="text-muted-foreground dark:bg-muted dark:border-border rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono">
                ID #{bird.id}
              </span>
            </h4>

            {(() => {
              const stats = birdFamilyStats(bird, fowls);
              const chips = [
                {
                  label: 'Offspring',
                  value: stats.offspring,
                  tone: 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50',
                },
                {
                  label: 'Breeding Pairs',
                  value: stats.breedingPairs,
                  tone: 'text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50',
                },
                {
                  label: 'Full Siblings',
                  value: stats.fullSiblings,
                  tone: 'text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/50',
                },
              ];
              return (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {chips.map((c) => (
                      <span
                        key={c.label}
                        className={`rounded-full border px-2.5 py-1 text-xs font-black ${c.tone}`}
                      >
                        {c.label}: {c.value}
                      </span>
                    ))}
                  </div>
                  {parentageRelatedness.type !== 'unknown' ? (
                    <RelatednessBadge
                      classification={parentageRelatedness}
                      prefix="Bred from: "
                      showSecondary
                    />
                  ) : null}
                </div>
              );
            })()}

            <div className="space-y-2">
              {relationRow(
                'Sire (Father)',
                '♂',
                'text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50',
                sire,
                bird.sire,
              )}
              {relationRow(
                'Dam (Mother)',
                '♀',
                'text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/50',
                dam,
                bird.dam,
              )}
              {active
                ? relationRow(
                    `Current Partner · ${active.pairing.pairing_code || active.pairing.outcome}`,
                    '💞',
                    'text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50',
                    active.partner,
                    partnerFallback,
                    active.pairing.outcome,
                  )
                : null}
              {(() => {
                const origin = originPairingOf(bird, breedingPairs);
                if (!origin) return null;
                return (
                  <div className="dark:border-border dark:bg-muted/50 flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-amber-200 bg-amber-50 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        🥚
                      </span>
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs font-black tracking-widest uppercase">
                          Born From Pairing
                        </p>
                        <p className="dark:text-card-foreground truncate font-mono text-sm font-black text-slate-800">
                          {origin.pairing_code || `#${origin.id}`}
                        </p>
                        <p className="text-muted-foreground truncate text-xs font-semibold tracking-wider uppercase">
                          {origin.sire_name || '—'} × {origin.dam_name || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {parentageRelatedness.type !== 'unknown' ? (
                        <RelatednessBadge classification={parentageRelatedness} compact />
                      ) : null}
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-black uppercase ${
                          origin.outcome === 'Active'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400'
                        }`}
                      >
                        {origin.outcome}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="dark:border-border mt-3 border-t border-slate-100 pt-3">
              <p className="text-muted-foreground mb-2 text-xs font-black tracking-widest uppercase">
                Offspring ({kids.length})
              </p>
              {kids.length === 0 ? (
                <p className="text-muted-foreground text-xs font-semibold">
                  No registered offspring yet. Set the Sire/Dam of a chick in its profile to link it
                  here.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {kids.slice(0, 14).map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setSelectedFowlForDetails(k)}
                      title={`Open ${k.name}&apos;s profile`}
                      className="cursor-pointer rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                    >
                      {kidId(k)} · {k.name}
                    </button>
                  ))}
                  {kids.length > 14 ? (
                    <span className="dark:border-border text-muted-foreground rounded-full border border-slate-200 px-2 py-1 text-xs font-black">
                      +{kids.length - 14} more
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* SIBLING MATCH / LINEAGE RELATIONS */}
      {(() => {
        const relations = getSiblingRelations(selectedFowlForDetails);
        const full = relations.filter((r) => r.relation === 'Full Sibling');
        const halfSire = relations.filter((r) => r.relation === 'Half-Sibling (Shared Sire)');
        const halfDam = relations.filter((r) => r.relation === 'Half-Sibling (Shared Dam)');
        const relationCard = (r: SiblingRelation) => {
          const isFull = r.relation === 'Full Sibling';
          const isSire = r.relation === 'Half-Sibling (Shared Sire)';
          const tone = isFull
            ? 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50'
            : isSire
              ? 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50'
              : 'text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50';
          const icon = isFull ? '👥' : isSire ? '🐓' : '🐔';
          const badge = isFull ? 'Full Sibling' : 'Half-Sibling';
          const context = isFull
            ? `Shared Sire: ${r.sharedSire} & Dam: ${r.sharedDam}`
            : isSire
              ? `Shared Sire: ${r.sharedSire}`
              : `Shared Dam: ${r.sharedDam}`;
          const target = fowls.find(
            (f) => f.name.trim().toLowerCase() === r.name.trim().toLowerCase(),
          );
          return (
            <div
              key={r.id}
              title={`${r.name} — ${badge}. ${context}.${target ? ' Click to open the profile.' : ''}`}
              onClick={target ? () => setSelectedFowlForDetails(target) : undefined}
              className={`dark:border-border dark:bg-muted/50 flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:border-slate-200 ${target ? 'dark:hover:bg-muted cursor-pointer hover:bg-slate-100' : ''}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border text-sm ${tone}`}
                >
                  {icon}
                </span>
                <div className="min-w-0">
                  <p
                    className={`flex items-center gap-1.5 truncate text-sm font-black ${target ? 'text-emerald-700 dark:text-emerald-300' : 'dark:text-card-foreground text-slate-800'}`}
                  >
                    {target?.bird_code && (
                      <span className="bg-muted text-foreground border-border shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs font-bold uppercase">
                        [{formatBirdCodeForDisplay(target.bird_code)}]
                      </span>
                    )}
                    <span className="truncate">{r.name}</span>
                  </p>
                  <p className="text-muted-foreground truncate text-xs font-semibold tracking-wider uppercase">
                    {context}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black uppercase ${tone}`}
              >
                {badge}
              </span>
            </div>
          );
        };
        return (
          <div className="dark:bg-card dark:border-border rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <h4 className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 text-xs font-black tracking-widest text-emerald-800 uppercase dark:text-emerald-300">
              <span>🧬 Sibling Match &amp; Lineage Relations</span>
              <span
                className={`rounded border px-2 py-0.5 font-mono ${relations.length > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800' : 'text-muted-foreground dark:bg-muted dark:border-border border-slate-200 bg-slate-100'}`}
              >
                {relations.length > 0 ? `${relations.length} DETECTED` : 'NO MATCHES'}
              </span>
            </h4>
            {relations.length === 0 ? (
              <p className="text-muted-foreground text-xs font-semibold">
                No sibling records detected. Add another chicken sharing the same Sire and/or Dam to
                build the lineage tree.
              </p>
            ) : (
              <>
                <p className="text-muted-foreground dark:bg-muted/50 dark:border-border mb-3 flex items-start gap-2 rounded-sm border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium">
                  <span className="shrink-0 text-sm">🧬</span>
                  <span>
                    <strong className="dark:text-card-foreground text-slate-700">
                      How lineage is matched:
                    </strong>{' '}
                    chickens sharing both the same{' '}
                    <strong className="dark:text-card-foreground text-slate-700">Sire</strong> and{' '}
                    <strong className="dark:text-card-foreground text-slate-700">Dam</strong> are{' '}
                    <strong className="text-emerald-700 dark:text-emerald-300">
                      Full Siblings
                    </strong>{' '}
                    (iisang tatay at iisang nanay); sharing only the{' '}
                    <strong className="dark:text-card-foreground text-slate-700">Sire</strong> marks
                    them{' '}
                    <strong className="text-amber-700 dark:text-amber-300">
                      Half-Siblings (Shared Sire)
                    </strong>{' '}
                    — magkaiba ang nanay, iisang tatay; sharing only the{' '}
                    <strong className="dark:text-card-foreground text-slate-700">Dam</strong> marks
                    them{' '}
                    <strong className="text-sky-700 dark:text-sky-300">
                      Half-Siblings (Shared Dam)
                    </strong>{' '}
                    — magkaiba ang tatay, iisang nanay. New encodes appear here instantly.
                  </span>
                </p>
                <div className="mb-3 space-y-2">{relations.map(relationCard)}</div>
                {(full.length > 0 || halfSire.length > 0 || halfDam.length > 0) && (
                  <div className="dark:border-border text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2.5 text-xs font-bold tracking-wider uppercase">
                    <span className="text-emerald-700 dark:text-emerald-300">
                      👥 {full.length} Full
                    </span>
                    <span className="text-amber-700 dark:text-amber-300">
                      🐓 {halfSire.length} Sire-side Half
                    </span>
                    <span className="text-sky-700 dark:text-sky-300">
                      🐔 {halfDam.length} Dam-side Half
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* SIBLING PERFORMANCE ANALYSIS */}
      {(() => {
        const relations = getSiblingRelations(selectedFowlForDetails);
        if (relations.length === 0) return null;

        const getMatchStats = (name: string) => {
          const fMatches = matchHistory.filter(
            (x) => x.entry_name?.trim().toLowerCase() === name.trim().toLowerCase(),
          );
          const total = fMatches.length;
          const wins = fMatches.filter((x) => x.outcome?.toLowerCase() === 'win').length;
          const losses = fMatches.filter((x) => x.outcome?.toLowerCase() === 'loss').length;
          const draws = fMatches.filter((x) => x.outcome?.toLowerCase() === 'draw').length;
          const decided = wins + losses;
          const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;
          return { total, wins, losses, draws, decided, winRate };
        };

        const thisBirdStats = getMatchStats(selectedFowlForDetails.name);
        const siblingData = relations.map((r) => ({
          ...r,
          stats: getMatchStats(r.name),
        }));

        const bestSibling = siblingData
          .filter((s) => s.stats.decided > 0)
          .sort((a, b) => b.stats.winRate - a.stats.winRate || b.stats.wins - a.stats.wins)[0];

        const worseSibling = siblingData
          .filter((s) => s.stats.decided > 0)
          .sort((a, b) => a.stats.winRate - b.stats.winRate)[0];

        const formatStats = (s: {
          wins: number;
          losses: number;
          winRate: number;
          total: number;
          decided: number;
        }) => {
          if (s.total === 0)
            return <span className="text-muted-foreground text-xs font-bold">No fights</span>;
          return (
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-black ${s.winRate >= 50 ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'}`}
            >
              {s.winRate}% · {s.wins}W-{s.losses}L
            </span>
          );
        };

        const toneBadge = (relation: string) => {
          if (relation === 'Full Sibling')
            return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
          if (relation === 'Half-Sibling (Shared Sire)')
            return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
          return 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
        };

        return (
          <div className="dark:bg-card dark:border-border rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <h4 className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 text-xs font-black tracking-widest text-emerald-800 uppercase dark:text-emerald-300">
              <span>📊 Sibling Performance Analysis</span>
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                {relations.length} siblings
              </span>
            </h4>

            {/* THIS BIRD */}
            <div className="mb-3 rounded-md border border-emerald-200/60 bg-emerald-50/80 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-emerald-600 text-xs font-black text-white">
                    YOU
                  </span>
                  <span className="dark:text-muted-foreground text-sm font-black text-slate-800">
                    {selectedFowlForDetails.name}
                  </span>
                </div>
                {formatStats(thisBirdStats)}
              </div>
            </div>

            {/* SIBLING COMPARISON TABLE */}
            {siblingData.length > 0 && (
              <div className="mb-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="dark:border-border border-b border-slate-100">
                      <th className="text-muted-foreground py-2 text-left font-bold tracking-wider uppercase">
                        Sibling
                      </th>
                      <th className="text-muted-foreground py-2 text-center font-bold tracking-wider uppercase">
                        Type
                      </th>
                      <th className="text-muted-foreground py-2 text-center font-bold tracking-wider uppercase">
                        Fights
                      </th>
                      <th className="text-muted-foreground py-2 text-center font-bold tracking-wider uppercase">
                        W-L
                      </th>
                      <th className="text-muted-foreground py-2 text-center font-bold tracking-wider uppercase">
                        Win Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {siblingData.map((s) => (
                      <tr
                        key={s.id}
                        className="dark:border-border dark:hover:bg-muted/50 border-b border-slate-50 hover:bg-slate-50/50"
                      >
                        <td className="dark:text-card-foreground py-2 font-black text-slate-800">
                          {(() => {
                            const target = fowls.find(
                              (f) => f.name.trim().toLowerCase() === s.name.trim().toLowerCase(),
                            );
                            if (!target) return s.name;
                            return (
                              <span className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedFowlForDetails(target)}
                                  className="cursor-pointer font-black text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                                  title="Open this sibling's profile"
                                >
                                  {s.name}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => ui.setFightHistoryFowl(target)}
                                  aria-label={`View all fights for ${s.name}`}
                                  title="View all fights"
                                  className="text-muted-foreground border-border cursor-pointer rounded border px-1.5 py-0.5 text-xs transition-colors hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                                >
                                  ⚔
                                </button>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2 text-center">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-black uppercase ${toneBadge(s.relation)}`}
                          >
                            {s.relation === 'Full Sibling'
                              ? 'Full'
                              : s.relation === 'Half-Sibling (Shared Sire)'
                                ? 'Sire-Half'
                                : 'Dam-Half'}
                          </span>
                        </td>
                        <td className="dark:text-muted-foreground py-2 text-center font-bold text-slate-600">
                          {s.stats.total}
                        </td>
                        <td className="dark:text-muted-foreground py-2 text-center font-bold text-slate-600">
                          {s.stats.wins}W-{s.stats.losses}L
                        </td>
                        <td className="py-2 text-center">{formatStats(s.stats)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* BREEDING INSIGHT */}
            <div className="dark:bg-muted/50 dark:border-border space-y-2 rounded-md border border-slate-200/60 bg-slate-50 p-3">
              <p className="dark:text-muted-foreground text-xs font-black tracking-widest text-slate-600 uppercase">
                🧬 Breeding Insight
              </p>
              {bestSibling && bestSibling.stats.winRate > thisBirdStats.winRate ? (
                <p className="dark:text-card-foreground text-xs font-medium text-slate-700">
                  <strong className="text-emerald-700 dark:text-emerald-300">
                    {bestSibling.name}
                  </strong>{' '}
                  has the best record among siblings at{' '}
                  <strong className="text-emerald-700 dark:text-emerald-300">
                    {bestSibling.stats.winRate}%
                  </strong>{' '}
                  win rate ({bestSibling.stats.wins}W-{bestSibling.stats.losses}L). Consider using
                  its parent combination for future breeding.
                </p>
              ) : worseSibling &&
                worseSibling.stats.winRate < thisBirdStats.winRate &&
                thisBirdStats.total > 0 ? (
                <p className="dark:text-card-foreground text-xs font-medium text-slate-700">
                  <strong className="text-emerald-700 dark:text-emerald-300">
                    {selectedFowlForDetails.name}
                  </strong>{' '}
                  outperforms its siblings. This parent combination ({selectedFowlForDetails.sire} ×{' '}
                  {selectedFowlForDetails.dam}) is a strong breeding candidate.
                </p>
              ) : thisBirdStats.total === 0 && siblingData.every((s) => s.stats.total === 0) ? (
                <p className="text-muted-foreground text-xs font-medium">
                  No match data yet for any siblings. Log fights to see which parent combination
                  performs best.
                </p>
              ) : (
                <p className="dark:text-card-foreground text-xs font-medium text-slate-700">
                  All siblings have similar performance. Track more fights to identify the strongest
                  breeding line.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* DEVELOPMENT TIMELINE & MILESTONES */}
      {(() => {
        const info = getMilestoneInfo(
          selectedFowlForDetails.birthdate,
          selectedFowlForDetails.gender,
        );
        if (!info) return null;
        return (
          <div className="dark:bg-card dark:border-border rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <h4 className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 text-xs font-black tracking-widest text-emerald-800 uppercase dark:text-emerald-300">
              <span>📅 Development Timeline &amp; Calendar Milestones</span>
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                CURRENT: {info.current?.stage || '—'}
              </span>
            </h4>
            <div className="space-y-2">
              {info.stages.map((s) => {
                const isCurrent = info.current?.id === s.id;
                const isPast = info.parts.totalMonths >= s.toMonths;
                const isNext = info.next !== null && info.next.id === s.id;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-md border p-2.5 transition-all ${isCurrent ? 'border-emerald-300 bg-emerald-50 shadow-sm' : isPast ? 'dark:bg-muted/50 dark:border-border border-slate-100 bg-slate-50 opacity-60' : 'dark:bg-card dark:border-border border-slate-100 bg-white'}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-base ${isCurrent ? 'bg-emerald-600' : isPast ? 'dark:bg-muted bg-slate-200' : 'dark:bg-card dark:border-border border border-slate-200 bg-white'}`}
                    >
                      {s.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-black ${isCurrent ? 'text-emerald-800 dark:text-emerald-300' : isPast ? 'text-muted-foreground' : 'dark:text-card-foreground text-slate-700'}`}
                      >
                        {s.stage}{' '}
                        <span className="text-muted-foreground font-mono text-xs">
                          ({s.fromMonths}–{isFinite(s.toMonths) ? s.toMonths : '∞'} mo)
                        </span>
                      </p>
                      <p className="text-muted-foreground truncate text-xs font-medium">{s.note}</p>
                    </div>
                    {isCurrent ? (
                      <span className="text-success shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-black uppercase dark:bg-emerald-900/50 dark:text-emerald-300">
                        ● Current
                      </span>
                    ) : isPast ? (
                      <span className="text-muted-foreground shrink-0 text-xs font-bold">
                        ✓ Reached
                      </span>
                    ) : isNext && info.next ? (
                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-xs font-black uppercase ${info.next.daysUntil >= 0 ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800' : 'text-muted-foreground dark:bg-muted dark:border-border border-slate-200 bg-slate-100'}`}
                      >
                        {info.next.daysUntil >= 0
                          ? `Next · in ${info.next.daysUntil}d`
                          : `Due · ${Math.abs(info.next.daysUntil)}d overdue`}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {info.next && (
              <p className="text-muted-foreground dark:bg-muted/50 dark:border-border mt-3 rounded-sm border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold">
                🗓️ Next milestone: reach{' '}
                <span className="font-black text-amber-700 dark:text-amber-300">
                  {info.next.stage}
                </span>{' '}
                around{' '}
                <span className="dark:text-card-foreground font-black text-slate-800">
                  {info.next.date.toLocaleDateString()}
                </span>
                {info.next.daysUntil >= 0
                  ? ` — in ${info.next.daysUntil} day${info.next.daysUntil === 1 ? '' : 's'}.`
                  : ` (already ${Math.abs(info.next.daysUntil)} days past due).`}
              </p>
            )}
          </div>
        );
      })()}

      {/* COMBAT PERFORMANCE STATS VECTOR */}
      {(() => {
        if (
          isFemale(selectedFowlForDetails.gender) ||
          selectedFowlForDetails.registry_role === 'Breeding Female'
        ) {
          return null;
        }
        const fowlMatches = matchHistory.filter(
          (m) =>
            m.entry_name?.trim().toLowerCase() ===
            selectedFowlForDetails.name?.trim().toLowerCase(),
        );
        const totalFights = fowlMatches.length;
        const wins = fowlMatches.filter(
          (m) => m.outcome && m.outcome.toLowerCase() === 'win',
        ).length;
        const losses = fowlMatches.filter(
          (m) => m.outcome && m.outcome.toLowerCase() === 'loss',
        ).length;
        const draws = fowlMatches.filter(
          (m) => m.outcome && m.outcome.toLowerCase() === 'draw',
        ).length;
        const winRate = winRateOf(wins, losses);

        return (
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border border-slate-700/60 bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-sm">
              <h4 className="text-success flex items-center justify-between border-b border-slate-700/80 pb-2 text-xs font-black tracking-widest uppercase">
                <span>⚔️ Combat Analytics & Performance Vectors</span>
                <span className="text-success rounded border border-emerald-800 bg-emerald-950/60 px-2 py-0.5 font-mono">
                  CHICKEN ID: #{selectedFowlForDetails.id}
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
                <div className="rounded-md border border-slate-700/60 bg-slate-800/80 p-2.5">
                  <span className="text-muted-foreground block text-xs font-bold uppercase">
                    Total Fights
                  </span>
                  <strong className="text-base font-black text-white">{totalFights}</strong>
                </div>
                <div className="rounded-md border border-emerald-700/40 bg-emerald-950/40 p-2.5">
                  <span className="text-success block text-xs font-bold uppercase">Wins</span>
                  <strong className="text-success text-base font-black">{wins} 🏆</strong>
                </div>
                <div className="rounded-md border border-rose-700/40 bg-rose-950/40 p-2.5">
                  <span className="text-danger block text-xs font-bold uppercase">Losses</span>
                  <strong className="text-danger text-base font-black">{losses} 💀</strong>
                </div>
                <div className="rounded-md border border-amber-700/40 bg-amber-950/40 p-2.5">
                  <span className="text-warning block text-xs font-bold uppercase">Draws</span>
                  <strong className="text-warning text-base font-black">{draws} 🤝</strong>
                </div>
                <div className="col-span-2 rounded-md border border-teal-700/40 bg-teal-950/40 p-2.5 sm:col-span-1">
                  <span className="text-teal block text-xs font-bold uppercase">
                    Per-Chicken Win Rate
                  </span>
                  <strong className="text-teal text-base font-black">{winRate}%</strong>
                  <span className="text-muted-foreground block font-mono text-xs font-semibold">
                    {wins}W - {losses}L
                  </span>
                </div>
              </div>
            </div>

            {/* PER-BREED INDIVIDUAL BREAKDOWN */}
            {(() => {
              const breedMap = new Map<
                string,
                { fights: number; wins: number; losses: number; draws: number }
              >();
              fowlMatches.forEach((m) => {
                const breed = (m.opponent_breed || '').trim() || 'Unknown';
                if (!breedMap.has(breed))
                  breedMap.set(breed, { fights: 0, wins: 0, losses: 0, draws: 0 });
                const b = breedMap.get(breed)!;
                b.fights++;
                const o = (m.outcome || '').toLowerCase();
                if (o === 'win') b.wins++;
                else if (o === 'loss') b.losses++;
                else if (o === 'draw') b.draws++;
              });
              const breeds = Array.from(breedMap.entries()).sort(
                (a, b) => b[1].fights - a[1].fights,
              );
              if (breeds.length === 0) return null;
              return (
                <div className="dark:bg-card dark:border-border overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
                  <div className="dark:bg-muted/50 dark:border-border border-b border-slate-200/80 bg-slate-50 p-3">
                    <h4 className="dark:text-card-foreground text-xs font-black tracking-wider text-slate-700 uppercase">
                      🏆 Individual Per-Breed Performance ({breeds.length} breed
                      {breeds.length > 1 ? 's' : ''} faced)
                    </h4>
                    <p className="text-muted-foreground mt-0.5 text-xs font-semibold">
                      Win / Loss breakdown against each opponent breed — specific to this chicken
                      only.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-slate-100 sm:grid-cols-3">
                    {breeds.map(([breed, stats]) => {
                      const decided = stats.wins + stats.losses;
                      const wr = decided > 0 ? Math.round((stats.wins / decided) * 100) : 0;
                      const tone = wr >= 70 ? 'emerald' : wr >= 40 ? 'amber' : 'rose';
                      return (
                        <div key={breed} className="space-y-1.5 p-3">
                          <div className="flex items-center justify-between">
                            <span className="dark:text-card-foreground text-xs font-black text-slate-800 uppercase">
                              {breed}
                            </span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-xs font-black ${
                                tone === 'emerald'
                                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : tone === 'amber'
                                    ? 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                    : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                              }`}
                            >
                              {wr}%
                            </span>
                          </div>
                          <div className="flex gap-2 text-xs font-bold">
                            <span className="text-success dark:text-emerald-300">
                              {stats.wins}W
                            </span>
                            <span className="text-danger dark:text-rose-300">{stats.losses}L</span>
                            {stats.draws > 0 && (
                              <span className="text-warning dark:text-amber-300">
                                {stats.draws}D
                              </span>
                            )}
                            <span className="text-muted-foreground">{stats.fights} total</span>
                          </div>
                          <div className="dark:bg-muted flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            {decided > 0 && (
                              <div
                                className={`h-full ${tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${wr}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* PREVIOUS OPPONENTS SUMMARY */}
            {(() => {
              const oppMap = new Map<
                string,
                { fights: number; wins: number; losses: number; draws: number; lastDate: string }
              >();
              fowlMatches.forEach((m) => {
                const opp = (m.opponent || '').trim() || 'Anonymous Opponent';
                if (!oppMap.has(opp))
                  oppMap.set(opp, { fights: 0, wins: 0, losses: 0, draws: 0, lastDate: '' });
                const o = oppMap.get(opp)!;
                o.fights++;
                const res = (m.outcome || '').toLowerCase();
                if (res === 'win') o.wins++;
                else if (res === 'loss') o.losses++;
                else if (res === 'draw') o.draws++;
                if ((m.date || '') > o.lastDate) o.lastDate = m.date || '';
              });
              const opponents = Array.from(oppMap.entries()).sort(
                (a, b) => b[1].fights - a[1].fights,
              );
              if (opponents.length === 0) return null;
              return (
                <div className="dark:bg-card dark:border-border overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
                  <div className="dark:bg-muted/50 dark:border-border border-b border-slate-200/80 bg-slate-50 p-3">
                    <h4 className="dark:text-card-foreground text-xs font-black tracking-wider text-slate-700 uppercase">
                      🥊 Previous Opponents ({opponents.length} faced)
                    </h4>
                    <p className="text-muted-foreground mt-0.5 text-xs font-semibold">
                      Every opponent this chicken has met, with the head-to-head record — this
                      chicken only.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="dark:border-border dark:bg-muted/40 border-b border-slate-200 bg-slate-50/70">
                          <th className="dark:text-card-foreground p-2.5 font-black tracking-wider text-slate-600 uppercase">
                            Opponent
                          </th>
                          <th className="dark:text-card-foreground p-2.5 text-center font-black tracking-wider text-slate-600 uppercase">
                            Record
                          </th>
                          <th className="dark:text-card-foreground p-2.5 text-center font-black tracking-wider text-slate-600 uppercase">
                            Fights
                          </th>
                          <th className="dark:text-card-foreground p-2.5 text-right font-black tracking-wider text-slate-600 uppercase">
                            Last Fought
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {opponents.map(([opp, s]) => (
                          <tr
                            key={opp}
                            className="dark:border-border/60 dark:hover:bg-muted/30 border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                          >
                            <td className="dark:text-card-foreground p-2.5 font-bold text-slate-800">
                              {opp}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold">
                              <span className="text-success">{s.wins}W</span>
                              <span className="text-danger"> {s.losses}L</span>
                              {s.draws > 0 && <span className="text-warning"> {s.draws}D</span>}
                            </td>
                            <td className="dark:text-muted-foreground p-2.5 text-center font-bold text-slate-600">
                              {s.fights}
                            </td>
                            <td className="text-muted-foreground p-2.5 text-right font-mono font-semibold">
                              {s.lastDate || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* DEDICATED INDIVIDUAL MATCH LOG TABLE */}
            <div className="dark:bg-card dark:border-border overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
              <div className="dark:bg-muted/50 dark:border-border flex items-center justify-between border-b border-slate-200/80 bg-slate-50 p-3">
                <h4 className="dark:text-card-foreground text-xs font-black tracking-wider text-slate-700 uppercase">
                  Individual Fight History Logs ({totalFights})
                </h4>
                <span className="dark:bg-muted dark:text-card-foreground rounded bg-slate-200 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
                  MATCH LOG PARITY
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="dark:bg-muted/50 text-muted-foreground dark:border-border border-b border-slate-200 bg-slate-100/70 font-extrabold uppercase">
                      <th className="p-2.5 pl-4">Date</th>
                      <th className="p-2.5">Our Chicken</th>
                      <th className="p-2.5">Opponent</th>
                      <th className="p-2.5">Arena Location</th>
                      <th className="p-2.5">Event / Match Type</th>
                      <th className="p-2.5 text-center">Result</th>
                      <th className="p-2.5 text-center">Condition</th>
                      <th className="p-2.5 text-center">Media &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="dark:divide-border dark:text-muted-foreground divide-y divide-slate-100 font-semibold text-slate-600">
                    {fowlMatches.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-muted-foreground p-6 text-center text-sm">
                          No derby performance logs recorded for this specific chicken node.
                        </td>
                      </tr>
                    ) : (
                      fowlMatches.map((match) => {
                        const matchVideos = videosFor(matchMedia, match.id);
                        const matchPhotos = photosFor(matchMedia, match.id);
                        return (
                          <tr
                            key={match.id}
                            className="dark:hover:bg-muted/50 transition-colors hover:bg-slate-50/80"
                          >
                            <td className="text-muted-foreground p-2.5 pl-4 font-mono text-xs">
                              {match.date}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1.5">
                                {formatBirdCodeForDisplay(
                                  birdCodeOf(selectedFowlForDetails, fowls),
                                ) && (
                                  <span className="text-success rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-xs font-black uppercase">
                                    [
                                    {formatBirdCodeForDisplay(
                                      birdCodeOf(selectedFowlForDetails, fowls),
                                    )}
                                    ]
                                  </span>
                                )}
                                <span className="dark:text-card-foreground font-black text-slate-800">
                                  {match.entry_name}
                                </span>
                              </div>
                              <span className="text-muted-foreground block text-xs font-semibold normal-case">
                                {match.breed || '—'}
                                {selectedFowlForDetails.birthdate
                                  ? ` · ${t('registry.hatchedDate', { date: selectedFowlForDetails.birthdate })}`
                                  : ''}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="flex items-center gap-1.5">
                                {match.opponent_photo_url && (
                                  <img
                                    src={match.opponent_photo_url}
                                    alt="Opponent"
                                    className="border-border h-6 w-6 shrink-0 rounded-full border object-cover"
                                  />
                                )}
                                <span className="dark:text-card-foreground font-bold text-slate-800">
                                  {match.opponent}
                                </span>
                              </span>
                              <span className="text-muted-foreground block text-xs font-semibold normal-case">
                                {[match.opponent_breed, match.opponent_bloodline]
                                  .filter(Boolean)
                                  .join(' · ') || '—'}
                              </span>
                            </td>
                            <td className="dark:text-muted-foreground p-2.5 text-slate-600">
                              {match.location}
                            </td>
                            <td className="p-2.5">
                              <span className="dark:bg-muted dark:border-border dark:text-card-foreground rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                                {match.event_type || match.type || 'Derby'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-xs font-black uppercase ${
                                  match.outcome.toLowerCase() === 'win'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                    : match.outcome.toLowerCase() === 'loss'
                                      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                                      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                }`}
                              >
                                {match.outcome}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              {match.post_fight_condition ? (
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-xs font-black whitespace-nowrap uppercase ${
                                    (match.post_fight_condition || '')
                                      .toLowerCase()
                                      .includes('deceased')
                                      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                                      : (match.post_fight_condition || '')
                                            .toLowerCase()
                                            .includes('critical') ||
                                          (match.post_fight_condition || '')
                                            .toLowerCase()
                                            .includes('severely')
                                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                        : 'text-teal border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/50'
                                  }`}
                                >
                                  {(match.post_fight_condition || '')
                                    .toLowerCase()
                                    .includes('deceased')
                                    ? '💀 '
                                    : (match.post_fight_condition || '')
                                          .toLowerCase()
                                          .includes('critical') ||
                                        (match.post_fight_condition || '')
                                          .toLowerCase()
                                          .includes('severely')
                                      ? '🟠 '
                                      : '🟢 '}
                                  {match.post_fight_condition}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs font-bold">—</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <MatchMediaButtons
                                match={match}
                                videos={matchVideos}
                                photos={matchPhotos}
                                posters={postersFor(matchMedia, match.id)}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONDITION & RESULT HISTORY — status changes and fight results on one timeline */}
      <div className="dark:bg-card dark:border-border space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="text-muted-foreground border-b pb-2 text-xs font-black tracking-widest uppercase">
          Condition &amp; Result History
        </h4>
        {(() => {
          type TimelineItem = {
            key: string;
            date: string;
            kind: 'match' | 'status';
            title: string;
            detail?: string;
          };
          const birdName = (selectedFowlForDetails.name || '').trim().toLowerCase();
          const isDamRecord =
            isFemale(selectedFowlForDetails.gender) ||
            selectedFowlForDetails.registry_role === 'Breeding Female';
          const timelineMatches = isDamRecord
            ? []
            : matchHistory.filter((m) => (m.entry_name || '').trim().toLowerCase() === birdName);
          const items: TimelineItem[] = timelineMatches.map((m) => ({
            key: `m-${m.id}`,
            date: m.date || '',
            kind: 'match',
            title: `${m.outcome || '—'} vs ${m.opponent || 'Opponent'}`,
            detail: m.post_fight_condition,
          }));
          for (const entry of history || []) {
            items.push({
              key: `h-${entry.id}`,
              date: (entry.changed_at || '').slice(0, 10),
              kind: 'status',
              title: `${HISTORY_FIELD_LABELS[entry.field] || entry.field}: ${entry.new_value}`,
              detail: entry.reason || entry.note || undefined,
            });
          }
          items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          if (items.length === 0) {
            return (
              <p className="text-muted-foreground text-xs font-semibold">
                No condition or result history yet.
              </p>
            );
          }
          return (
            <ol className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={item.key} className="flex items-baseline gap-2 text-xs">
                  <span className="text-muted-foreground w-24 shrink-0 font-mono font-bold">
                    {item.date || '—'}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.kind === 'match' ? 'bg-emerald-500' : 'bg-sky-500'}`}
                    aria-hidden="true"
                  />
                  <span className="text-foreground font-bold">{item.title}</span>
                  {item.detail && (
                    <span className="text-muted-foreground font-semibold">· {item.detail}</span>
                  )}
                </li>
              ))}
            </ol>
          );
        })()}
      </div>

      <div className="dark:bg-muted/50 dark:border-border space-y-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
        <h4 className="text-muted-foreground border-b pb-2 text-xs font-black tracking-widest uppercase">
          Lineage Integration Balance
        </h4>

        {(() => {
          const selGen = generationOf(selectedFowlForDetails);
          const selInfo = generationInfo(selGen);
          return (
            <div className="flex items-center justify-between gap-3 rounded-md border border-teal-100 bg-gradient-to-r from-teal-50 to-emerald-50 px-3 py-2.5 dark:border-teal-900/50 dark:from-teal-950/40 dark:to-emerald-950/40">
              <div className="min-w-0">
                <p className="text-teal text-xs font-black tracking-wider uppercase">
                  🧬 Lineage Generation
                </p>
                <p className="text-muted-foreground truncate text-xs font-semibold">
                  {selInfo.label} · {selInfo.desc}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-teal text-lg font-black">{classification.purityPct}%</span>
                <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                  Purity ({classification.dominantBreed})
                </p>
              </div>
            </div>
          );
        })()}

        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span>♂ Sire Contribution</span>
              {(() => {
                const sireName = (selectedFowlForDetails.sire || '').trim();
                const sireLower = sireName.toLowerCase();
                const isFoundation = sireLower === 'foundation stock' || !sireLower;
                const isRegistered = !!parentRecordOf(selectedFowlForDetails, 'sire', fowls);
                return (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-black uppercase ${isRegistered ? 'border border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-800' : isFoundation ? 'dark:bg-muted text-muted-foreground dark:border-border border border-slate-200 bg-slate-100' : 'border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-300'}`}
                  >
                    {isRegistered ? '✓ Registered' : isFoundation ? 'Foundation' : 'External'}
                  </span>
                );
              })()}
            </span>
            <span className="dark:text-card-foreground text-slate-800">
              50% ·{' '}
              {(() => {
                const name = selectedFowlForDetails.sire || '';
                const target = parentRecordOf(selectedFowlForDetails, 'sire', fowls);
                const targetClass = target ? getBreedingClassification(target, fowls) : null;
                const targetBreed =
                  targetClass?.type === 'Crossbred' ? targetClass.derivedBreed : target?.breed;
                return (
                  <>
                    {target ? (
                      <button
                        type="button"
                        onClick={() => setSelectedFowlForDetails(target)}
                        className="cursor-pointer font-bold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
                        title="Open Sire profile"
                      >
                        {name}
                      </button>
                    ) : (
                      <span className="dark:text-muted-foreground text-slate-600">
                        {name || '—'}
                      </span>
                    )}
                    {targetBreed && <span className="font-semibold"> · {targetBreed}</span>}
                  </>
                );
              })()}
            </span>
          </div>
          <div className="dark:bg-muted h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-sky-500" style={{ width: '50%' }}></div>
          </div>
          {(() => {
            const s = parentBloodlineOf(selectedFowlForDetails.sire, fowls);
            return s ? (
              <p className="text-xs font-bold text-sky-700 dark:text-sky-300">
                Sire&apos;s own bloodline: {s.summary}
              </p>
            ) : null;
          })()}
        </div>

        <div className="space-y-1 pt-1">
          <div className="text-muted-foreground flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span>♀ Dam Contribution</span>
              {(() => {
                const damName = (selectedFowlForDetails.dam || '').trim();
                const damLower = damName.toLowerCase();
                const isFoundation = damLower === 'foundation stock' || !damLower;
                const isRegistered = !!parentRecordOf(selectedFowlForDetails, 'dam', fowls);
                return (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-black uppercase ${isRegistered ? 'text-pink border border-pink-200 bg-pink-100 dark:border-pink-800' : isFoundation ? 'dark:bg-muted text-muted-foreground dark:border-border border border-slate-200 bg-slate-100' : 'border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-300'}`}
                  >
                    {isRegistered ? '✓ Registered' : isFoundation ? 'Foundation' : 'External'}
                  </span>
                );
              })()}
            </span>
            <span className="dark:text-card-foreground text-slate-800">
              50% ·{' '}
              {(() => {
                const name = selectedFowlForDetails.dam || '';
                const target = parentRecordOf(selectedFowlForDetails, 'dam', fowls);
                const targetClass = target ? getBreedingClassification(target, fowls) : null;
                const targetBreed =
                  targetClass?.type === 'Crossbred' ? targetClass.derivedBreed : target?.breed;
                return (
                  <>
                    {target ? (
                      <button
                        type="button"
                        onClick={() => setSelectedFowlForDetails(target)}
                        className="text-pink cursor-pointer font-bold underline-offset-2 hover:underline"
                        title="Open Dam profile"
                      >
                        {name}
                      </button>
                    ) : (
                      <span className="dark:text-muted-foreground text-slate-600">
                        {name || '—'}
                      </span>
                    )}
                    {targetBreed && <span className="font-semibold"> · {targetBreed}</span>}
                  </>
                );
              })()}
            </span>
          </div>
          <div className="dark:bg-muted h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-pink-500" style={{ width: '50%' }}></div>
          </div>
          {(() => {
            const s = parentBloodlineOf(selectedFowlForDetails.dam, fowls);
            return s ? (
              <p className="text-pink text-xs font-bold">Dam&apos;s own bloodline: {s.summary}</p>
            ) : null;
          })()}
        </div>

        <div className="dark:border-border flex items-center justify-between border-t border-slate-200/50 pt-2 text-xs">
          <span className="dark:text-card-foreground font-extrabold text-slate-700">
            Specific Bloodline %
          </span>
          <span className="rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 font-mono font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {bloodlineOf(selectedFowlForDetails)}%
          </span>
        </div>

        {(() => {
          const ps = pairingAnalytics.all.get(
            `${(selectedFowlForDetails.sire || '').trim().toLowerCase()}|||${(selectedFowlForDetails.dam || '').trim().toLowerCase()}`,
          );
          if (!ps) return null;
          return (
            <div className="dark:border-border flex items-center justify-between gap-2 border-t border-slate-200/50 pt-2 text-xs">
              <span className="dark:text-card-foreground min-w-0 truncate font-extrabold text-slate-700">
                🔗 Pairing Performance ({ps.sire} × {ps.dam})
              </span>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono font-black ${ps.totalFights > 0 ? (ps.winRate >= 50 ? 'border-emerald-200/60 bg-emerald-50 text-emerald-700' : 'border-rose-200/60 bg-rose-50 text-rose-700') : 'dark:bg-muted text-muted-foreground dark:border-border border-slate-200 bg-slate-100'}`}
              >
                {ps.totalFights > 0
                  ? `${ps.winRate}% · ${ps.wins}W-${ps.losses}L`
                  : 'No match data'}
              </span>
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="dark:bg-muted/50 dark:border-border rounded-md border border-slate-100 bg-slate-50 p-3">
          <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
            Structural Weight
          </span>
          <strong className="dark:text-card-foreground mt-0.5 block text-sm text-slate-800">
            {(() => {
              const regWeight =
                selectedFowlForDetails.structural_weight !== undefined &&
                selectedFowlForDetails.structural_weight !== null &&
                selectedFowlForDetails.structural_weight !== ''
                  ? selectedFowlForDetails.structural_weight
                  : selectedFowlForDetails.weight;
              return regWeight
                ? `${weightFromStorage(regWeight, unitPrefs.weightUnit)} ${weightUnitLabel(unitPrefs.weightUnit)}`
                : 'N/A';
            })()}
          </strong>
        </div>
        <div className="dark:bg-muted/50 dark:border-border rounded-md border border-slate-100 bg-slate-50 p-3">
          <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
            Height Dimension
          </span>
          <strong className="dark:text-card-foreground mt-0.5 block text-sm text-slate-800">
            {(() => {
              const regHeight =
                selectedFowlForDetails.structural_height !== undefined &&
                selectedFowlForDetails.structural_height !== null &&
                selectedFowlForDetails.structural_height !== ''
                  ? selectedFowlForDetails.structural_height
                  : selectedFowlForDetails.height;
              return regHeight
                ? `${heightFromStorage(regHeight, unitPrefs.heightUnit)} ${heightUnitLabel(unitPrefs.heightUnit)}`
                : 'N/A';
            })()}
          </strong>
        </div>
        <div className="dark:bg-muted/50 dark:border-border rounded-md border border-slate-100 bg-slate-50 p-3">
          <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
            Eye Specimen Variant
          </span>
          <strong className="dark:text-card-foreground mt-0.5 block text-sm text-slate-800">
            {selectedFowlForDetails.eye_variant || 'Standard Eye'}
          </strong>
        </div>
        <div className="dark:bg-muted/50 dark:border-border rounded-md border border-slate-100 bg-slate-50 p-3">
          <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
            Feather Color
          </span>
          <strong className="dark:text-card-foreground mt-0.5 block text-sm text-slate-800">
            {formatColorDisplay(
              selectedFowlForDetails.feather_color || selectedFowlForDetails.color,
              selectedFowlForDetails.color_category,
            )}
          </strong>
        </div>
        <div className="dark:bg-muted/50 dark:border-border rounded-md border border-slate-100 bg-slate-50 p-3 sm:col-span-2">
          <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
            Trait
          </span>
          <strong className="mt-0.5 block text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {selectedFowlForDetails.trait ||
              selectedFowlForDetails.behavior_trait ||
              'Not specified'}
          </strong>
        </div>
      </div>
    </Modal>
  );
}
