'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Play, Image as ImageIcon, PencilLine, Share2, Plus, Trash2 } from 'lucide-react';
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
import { getFowlBloodlineStats } from '@/lib/bloodline-composition';
import { birdCodeOf, formatBirdCodeForDisplay } from '@/lib/bird-code';
import { activePartnerOf, childrenOf, originPairingOf, parentRecordOf } from '@/lib/lineage';
import { birdFamilyStats } from '@/lib/family-stats';
import { useUnitPrefs, weightFromStorage, heightFromStorage, weightUnitLabel, heightUnitLabel } from '@/lib/units';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import { isMale } from '@/lib/helpers';
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
} from '@/lib/services/media-service';
import { toastMessage } from '@/lib/toast-bus';
import { useRegistryOptions } from '@/lib/hooks/use-registry-options';

const HISTORY_FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  condition_status: 'Condition',
  breeding_role: 'Breeding role',
  activity_status: 'Activity',
  archive_kind: 'Archive reason',
  retired_scope: 'Retired scope',
};

const ROLE_OPTIONS: { value: 'none' | 'breeder' | 'material'; label: string }[] = [
  { value: 'none', label: 'Not a breeder' },
  { value: 'breeder', label: 'Breeder' },
  { value: 'material', label: 'Material' },
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
  generationPurity: (gen: number) => number;
  generationInfo: (gen: number) => { short: string; label: string; desc: string; tone: string };
  bloodlineOf: (f: FowlRecord) => number;
  cleanPct: (v: unknown) => number;
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
  generationPurity,
  generationInfo,
  bloodlineOf,
  cleanPct,
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
    breedingPairs,
    matchMedia,
  } = useFowl();
  const { rows: optionRows } = useRegistryOptions();

  const fowlId = selectedFowlForDetails?.id ?? null;
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
    fetchFowlPhotos(fowlId).then((photos) => {
      if (!cancelled) setGallery({ fowlId, photos });
    });
    return () => { cancelled = true; };
  }, [fowlId]);

  useEffect(() => {
    if (fowlId === null) return;
    if (historyState.fowlId === fowlId && historyState.entries !== null) return;
    let cancelled = false;
    fetchStatusHistory(fowlId).then((entries) => {
      if (!cancelled) {
        setHistoryState((s) => ({ fowlId, open: s.open && s.fowlId === fowlId, entries }));
      }
    });
    return () => { cancelled = true; };
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
      const photos = await fetchFowlPhotos(fowlId);
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

  if (!selectedFowlForDetails) return null;

  // Fresh copy so chips/selects update right after a status change.
  const bird = fowls.find((f) => f.id === selectedFowlForDetails.id) ?? selectedFowlForDetails;
  const conditionOptions = mergeOptions(optionRows, 'post_match_condition', bird.condition_status).filter(
    (o) => o.value !== 'Deceased',
  );
  const notesClean = notesDraft === (bird.notes ?? '');

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
          stats={getFowlBloodlineStats(selectedFowlForDetails, fowls)}
          title="Bloodline Percentage"
          subtitle="Each percentage is the 50/50 split contributed by the sire and the dam"
        />

        <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 dark:bg-muted/50 p-4 rounded-lg border border-slate-200/70 dark:border-border">
          <div className="w-24 h-24 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-md overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
            {selectedFowlForDetails.image_url ? (
              <img src={selectedFowlForDetails.image_url} alt={selectedFowlForDetails.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-mono text-xs text-muted-foreground font-bold">NO PHOTO</div>
            )}
          </div>
          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h4 className="text-lg font-black text-slate-900 dark:text-card-foreground">{selectedFowlForDetails.name}</h4>
              <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full uppercase">
                {formatBirdCodeForDisplay(birdCodeOf(selectedFowlForDetails, fowls)) || '—'}
              </span>
              {selectedFowlForDetails.wing_band ? (
                <span className="text-xs font-mono font-black text-teal bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 px-2.5 py-0.5 rounded-full uppercase" title="Wing Band ID">
                  ⌁ {selectedFowlForDetails.wing_band}
                </span>
              ) : null}
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full uppercase">{selectedFowlForDetails.breed}</span>
              {(() => {
                if (selectedFowlForDetails.status === 'Deceased') {
                  return (
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full uppercase bg-rose-900 text-white border border-rose-950 shadow-2xs">
                      💀 DECEASED
                    </span>
                  );
                }
                if (selectedFowlForDetails.status === 'Sire Material') {
                  return (
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full uppercase bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
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
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase ${badge.bg} border border-white/20 shadow-2xs`}>
                      {badge.label}
                    </span>
                  );
                }
                return (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    ● ACTIVE
                  </span>
                );
              })()}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Growth Stage: <strong className="text-slate-800 dark:text-card-foreground font-bold">{selectedFowlForDetails.growth_stage || 'Chick'}</strong> | Auto Age: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{(() => { const p = getAgeParts(selectedFowlForDetails.birthdate); return p ? getAgeLabel(p) : selectedFowlForDetails.age || 'N/A'; })()}</strong> | Legs: <strong className="text-slate-800 dark:text-card-foreground font-bold">{selectedFowlForDetails.leg_color || 'N/A'}</strong>
            </p>
            {(() => {
              const p = getAgeParts(selectedFowlForDetails.birthdate);
              return p ? (
                <p className="text-xs font-mono text-muted-foreground font-semibold">
                  Born {selectedFowlForDetails.birthdate} · Exact {getAgeExact(p)} · {getAgeMetrics(p)}
                </p>
              ) : (
                <p className="text-xs text-warning dark:text-amber-300 font-bold">⚠️ No birth date recorded — use ✏️ Edit to set one for automatic age &amp; milestone tracking.</p>
              );
            })()}
            {selectedFowlForDetails.status === 'Deceased' && (
              <p className="text-xs font-bold text-danger dark:text-rose-300">
                💀 Cause of Death: <strong className="text-rose-800 dark:text-rose-300">{selectedFowlForDetails.death_reason || 'Unspecified'}</strong>
                {selectedFowlForDetails.death_date ? ` · Recorded ${selectedFowlForDetails.death_date}` : ''}
              </p>
            )}
            {selectedFowlForDetails.status !== 'Deceased' && selectedFowlForDetails.status === 'Archived' && (
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                📦 Archived: <strong className="text-amber-800 dark:text-amber-300">{archiveDisplay(selectedFowlForDetails, optionRows)}</strong>
                {selectedFowlForDetails.retired_scope ? (
                  <> · {retiredScopeLabel(selectedFowlForDetails.retired_scope, optionRows)}</>
                ) : null}
                {selectedFowlForDetails.return_date ? (
                  <> · Return expected {selectedFowlForDetails.return_date}</>
                ) : null}
                <span className="font-medium text-muted-foreground"> (Non-Mortality)</span>
              </p>
            )}
            {selectedFowlForDetails.status !== 'Deceased' && selectedFowlForDetails.status !== 'Archived' && isMale(selectedFowlForDetails.gender) && (
              <div className="pt-1.5">
                {selectedFowlForDetails.status === 'Sire Material' ? (
                  <button type="button" onClick={() => handleSetActiveStatus(selectedFowlForDetails)} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
                    Set back to Active
                  </button>
                ) : (
                  <button type="button" onClick={() => handleSetSireMaterial(selectedFowlForDetails)} className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer">
                    Mark as Sire Material
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CHICKEN PHOTO GALLERY */}
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-lg p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Photo Gallery</h4>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => ui.setShareTarget({ type: 'fowl', id: selectedFowlForDetails.id, label: `${selectedFowlForDetails.name} — Profile` })}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Profile
              </button>
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> Add Photo
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
                className="relative group cursor-pointer"
                title="View main photo"
              >
                <img src={selectedFowlForDetails.image_url} alt={`${selectedFowlForDetails.name} main`} className="h-16 w-16 rounded border border-border object-cover" />
                <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] font-black text-center uppercase rounded-b">Main</span>
              </button>
            )}
            {galleryPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <button type="button" onClick={() => ui.setImageViewerUrl(photo.url)} className="cursor-pointer block">
                  <img src={photo.url} alt={`${selectedFowlForDetails.name} gallery`} className="h-16 w-16 rounded border border-border object-cover" />
                </button>
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => void handleDeleteGalleryPhoto(photo)}
                  className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-danger text-white group-hover:flex cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {!selectedFowlForDetails.image_url && galleryPhotos.length === 0 && (
              <p className="text-xs font-semibold text-muted-foreground">No photos yet — add the first one.</p>
            )}
          </div>
        </div>

        {/* STATUS & LIFECYCLE — condition, role, activity and final status are separate */}
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
              Status &amp; Lifecycle
            </h4>
            <button
              type="button"
              onClick={() => void toggleHistory()}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
            >
              {historyOpen ? 'Hide Status History' : 'View Status History'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-black px-2.5 py-1 rounded-full border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300">
              🩹 Condition: {conditionLabel(bird.condition_status)}
            </span>
            <span className="text-xs font-black px-2.5 py-1 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300">
              🧬 {breedingRoleLabel(bird.breeding_role)}
            </span>
            <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${bird.activity_status === 'active' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'}`}>
              {bird.activity_status === 'active' ? '● Active' : '○ Inactive'}
            </span>
            {bird.status === 'Archived' && bird.retired_scope ? (
              <span className="text-xs font-black px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                🏁 {retiredScopeLabel(bird.retired_scope, optionRows)}
              </span>
            ) : null}
          </div>

          {bird.status !== 'Deceased' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-xs font-bold text-slate-600 dark:text-muted-foreground">
                Post-Match Condition
                <select
                  value={bird.condition_status || 'Fit / Recovered'}
                  disabled={busy}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === (bird.condition_status || 'Fit / Recovered')) return;
                    void runAction(() => handleSetConditionStatus(bird, value));
                  }}
                  className="w-full mt-1 p-2.5 border border-input-border rounded-md text-sm bg-slate-50 dark:bg-muted font-semibold text-slate-800 dark:text-card-foreground focus:border-sky-500 cursor-pointer disabled:opacity-60"
                >
                  {conditionOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600 dark:text-muted-foreground">
                Breeding / Material Role (manual)
                <select
                  value={bird.breeding_role || 'none'}
                  disabled={busy}
                  onChange={(e) => {
                    const role = e.target.value as 'none' | 'breeder' | 'material';
                    if (role === (bird.breeding_role || 'none')) return;
                    void runAction(() => handleSetBreedingRole(bird, role));
                  }}
                  className="w-full mt-1 p-2.5 border border-input-border rounded-md text-sm bg-slate-50 dark:bg-muted font-semibold text-slate-800 dark:text-card-foreground focus:border-violet-500 cursor-pointer disabled:opacity-60"
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {bird.status === 'Archived' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction(async () => { await handleRestoreFowlOnly(bird.id); })}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer disabled:opacity-60"
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
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-sm transition-all cursor-pointer disabled:opacity-60"
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
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  Archive…
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => ui.setSelectedFowlForDeceased(bird)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 px-3 py-1.5 rounded-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  Record as Deceased…
                </button>
              </>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Injuries never convert a chicken into a breeder — condition, breeding role, activity and
            final status are changed only by your decision, and every change is logged.
          </p>

          {historyOpen ? (
            <div className="border-t border-slate-200 dark:border-border pt-3 space-y-1.5">
              <p className="text-xs font-black text-slate-700 dark:text-card-foreground">Status History</p>
              {history === null ? (
                <p className="text-xs text-muted-foreground font-semibold">Loading history…</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-muted-foreground font-semibold">No status changes recorded yet.</p>
              ) : (
                <ol className="space-y-1.5">
                  {history.map((entry) => (
                    <li key={entry.id} className="text-xs flex flex-wrap gap-x-2 items-baseline">
                      <span className="font-mono text-muted-foreground">
                        {new Date(entry.changed_at).toLocaleDateString()}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-card-foreground">
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
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
              Notes
            </h4>
            <button
              type="button"
              disabled={busy || notesClean}
              onClick={() => void runAction(() => handleSaveFowlNotes(bird, notesDraft))}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
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
            className="w-full p-2.5 border border-input-border rounded-md text-sm bg-slate-50 dark:bg-muted font-medium text-slate-800 dark:text-card-foreground focus:border-emerald-500 resize-y"
          />
        </div>

        {/* PARENTS · PARTNER · OFFSPRING */}
        {(() => {
          const bird = selectedFowlForDetails;
          const sire = parentRecordOf(bird, 'sire', fowls);
          const dam = parentRecordOf(bird, 'dam', fowls);
          const active = activePartnerOf(bird, breedingPairs, fowls);
          const kids = childrenOf(bird, fowls).slice().sort((a, b) => a.id - b.id);
          const kidId = (f: FowlRecord) => formatBirdCodeForDisplay(birdCodeOf(f, fowls)) || `#${f.id}`;

          const relationRow = (
            role: string,
            icon: string,
            tone: string,
            target: FowlRecord | null,
            fallbackName: string,
            badge?: string
          ) => {
            const foundation = !fallbackName || fallbackName.toLowerCase() === 'foundation stock';
            const meta = target
              ? [target.breed || null, formatBirdCodeForDisplay(birdCodeOf(target, fowls)), target.wing_band ? `Band ${target.wing_band}` : null]
                  .filter(Boolean)
                  .join(' · ') || '—'
              : foundation
              ? 'Foundation'
              : 'External / unresolved';
            return (
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-md border border-slate-100 dark:border-border bg-slate-50/60 dark:bg-muted/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-7 h-7 rounded-sm flex items-center justify-center text-sm shrink-0 border ${tone}`}>{icon}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{role}</p>
                    {target ? (
                      <button
                        type="button"
                        onClick={() => setSelectedFowlForDetails(target)}
                        className="text-sm font-black truncate text-emerald-700 dark:text-emerald-300 hover:underline underline-offset-2 cursor-pointer text-left"
                        title="Open profile"
                      >
                        {target.name}
                      </button>
                    ) : (
                      <p className="text-sm font-black truncate text-slate-800 dark:text-card-foreground">
                        {foundation ? 'Foundation Stock' : fallbackName || '—'}
                      </p>
                    )}
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{meta}</p>
                  </div>
                </div>
                {badge ? (
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${tone}`}>{badge}</span>
                ) : null}
              </div>
            );
          };

          const partnerFallback = active
            ? active.pairing.sire_id === bird.id || (active.pairing.sire_id == null && active.pairing.sire_name?.trim().toLowerCase() === bird.name.trim().toLowerCase())
              ? active.pairing.dam_name
              : active.pairing.sire_name
            : '';

          return (
            <div className="bg-white dark:bg-card rounded-lg border border-slate-200/80 dark:border-border shadow-sm p-4 sm:p-5">
              <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-100 mb-3">
                <span>🌳 Lineage Relationships</span>
                <span className="font-mono px-2 py-0.5 rounded border text-muted-foreground bg-slate-100 dark:bg-muted border-slate-200 dark:border-border">
                  ID #{bird.id}
                </span>
              </h4>

              {(() => {
                const stats = birdFamilyStats(bird, fowls);
                const chips = [
                  { label: 'Offspring', value: stats.offspring, tone: 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50' },
                  { label: 'Breeding Pairs', value: stats.breedingPairs, tone: 'text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50' },
                  { label: 'Full Siblings', value: stats.fullSiblings, tone: 'text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/50' },
                ];
                return (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {chips.map((c) => (
                      <span key={c.label} className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${c.tone}`}>
                        {c.label}: {c.value}
                      </span>
                    ))}
                  </div>
                );
              })()}

              <div className="space-y-2">
                {relationRow('Sire (Father)', '♂', 'text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50', sire, bird.sire)}
                {relationRow('Dam (Mother)', '♀', 'text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/50', dam, bird.dam)}
                {active
                  ? relationRow(
                      `Current Partner · ${active.pairing.pairing_code || active.pairing.outcome}`,
                      '💞',
                      'text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50',
                      active.partner,
                      partnerFallback,
                      active.pairing.outcome
                    )
                  : null}
                {(() => {
                  const origin = originPairingOf(bird, breedingPairs);
                  if (!origin) return null;
                  return (
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-md border border-slate-100 dark:border-border bg-slate-50/60 dark:bg-muted/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-sm flex items-center justify-center text-sm shrink-0 border text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50">🥚</span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Born From Pairing</p>
                          <p className="text-sm font-black truncate text-slate-800 dark:text-card-foreground font-mono">
                            {origin.pairing_code || `#${origin.id}`}
                          </p>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                            {origin.sire_name || '—'} × {origin.dam_name || '—'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                        origin.outcome === 'Active'
                          ? 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50'
                          : 'text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40'
                      }`}>
                        {origin.outcome}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                  Offspring ({kids.length})
                </p>
                {kids.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-semibold">
                    No registered offspring yet. Set the Sire/Dam of a chick in its profile to link it here.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {kids.slice(0, 14).map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setSelectedFowlForDetails(k)}
                        title={`Open ${k.name}&apos;s profile`}
                        className="text-[11px] font-bold px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                      >
                        {kidId(k)} · {k.name}
                      </button>
                    ))}
                    {kids.length > 14 ? (
                      <span className="text-[11px] font-black px-2 py-1 rounded-full border border-slate-200 dark:border-border text-muted-foreground">
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
          const full = relations.filter(r => r.relation === 'Full Sibling');
          const halfSire = relations.filter(r => r.relation === 'Half-Sibling (Shared Sire)');
          const halfDam = relations.filter(r => r.relation === 'Half-Sibling (Shared Dam)');
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
            const target = fowls.find((f) => f.name.trim().toLowerCase() === r.name.trim().toLowerCase());
            return (
              <div
                key={r.id}
                title={`${r.name} — ${badge}. ${context}.${target ? ' Click to open the profile.' : ''}`}
                onClick={target ? () => setSelectedFowlForDetails(target) : undefined}
                className={`flex items-center justify-between gap-3 p-3 rounded-md border border-slate-100 dark:border-border bg-slate-50/60 dark:bg-muted/50 hover:border-slate-200 transition-colors ${target ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-muted' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-sm flex items-center justify-center text-sm shrink-0 border ${tone}`}>{icon}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-black truncate ${target ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-card-foreground'}`}>{r.name}</p>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{context}</p>
                  </div>
                </div>
                <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full border shrink-0 ${tone}`}>{badge}</span>
              </div>
            );
          };
          return (
            <div className="bg-white dark:bg-card rounded-lg border border-slate-200/80 dark:border-border shadow-sm p-4 sm:p-5">
              <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-100 mb-3">
                <span>🧬 Sibling Match &amp; Lineage Relations</span>
                <span className={`font-mono px-2 py-0.5 rounded border ${relations.length > 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:border-emerald-800' : 'text-muted-foreground bg-slate-100 dark:bg-muted border-slate-200 dark:border-border'}`}>
                  {relations.length > 0 ? `${relations.length} DETECTED` : 'NO MATCHES'}
                </span>
              </h4>
              {relations.length === 0 ? (
                <p className="text-xs text-muted-foreground font-semibold">
                  No sibling records detected. Add another chicken sharing the same Sire and/or Dam to build the lineage tree.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground font-medium bg-slate-50 dark:bg-muted/50 border border-slate-100 dark:border-border rounded-sm px-3 py-2 mb-3 flex items-start gap-2">
                    <span className="text-sm shrink-0">🧬</span>
                    <span>
                      <strong className="text-slate-700 dark:text-card-foreground">How lineage is matched:</strong> chickens sharing both the same{' '}
                      <strong className="text-slate-700 dark:text-card-foreground">Sire</strong> and <strong className="text-slate-700 dark:text-card-foreground">Dam</strong> are <strong className="text-emerald-700 dark:text-emerald-300">Full Siblings</strong> (iisang tatay at iisang nanay);
                      sharing only the <strong className="text-slate-700 dark:text-card-foreground">Sire</strong> marks them <strong className="text-amber-700 dark:text-amber-300">Half-Siblings (Shared Sire)</strong> — magkaiba ang nanay, iisang tatay;
                      sharing only the <strong className="text-slate-700 dark:text-card-foreground">Dam</strong> marks them <strong className="text-sky-700 dark:text-sky-300">Half-Siblings (Shared Dam)</strong> — magkaiba ang tatay, iisang nanay.
                      New encodes appear here instantly.
                    </span>
                  </p>
                  <div className="space-y-2 mb-3">
                    {relations.map(relationCard)}
                  </div>
                  {(full.length > 0 || halfSire.length > 0 || halfDam.length > 0) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2.5 border-t border-slate-100 dark:border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <span className="text-emerald-700 dark:text-emerald-300">👥 {full.length} Full</span>
                      <span className="text-amber-700 dark:text-amber-300">🐓 {halfSire.length} Sire-side Half</span>
                      <span className="text-sky-700 dark:text-sky-300">🐔 {halfDam.length} Dam-side Half</span>
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
            const fMatches = matchHistory.filter((x) => x.entry_name?.trim().toLowerCase() === name.trim().toLowerCase());
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

          const formatStats = (s: { wins: number; losses: number; winRate: number; total: number; decided: number }) => {
            if (s.total === 0) return <span className="text-xs text-muted-foreground font-bold">No fights</span>;
            return (
              <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${s.winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'}`}>
                {s.winRate}% · {s.wins}W-{s.losses}L
              </span>
            );
          };

          const toneBadge = (relation: string) => {
            if (relation === 'Full Sibling') return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            if (relation === 'Half-Sibling (Shared Sire)') return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            return 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
          };

          return (
            <div className="bg-white dark:bg-card rounded-lg border border-slate-200/80 dark:border-border shadow-sm p-4 sm:p-5">
              <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-100 mb-3">
                <span>📊 Sibling Performance Analysis</span>
                <span className="font-mono px-2 py-0.5 rounded border text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800">
                  {relations.length} siblings
                </span>
              </h4>

              {/* THIS BIRD */}
              <div className="bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-900/50 rounded-md p-3 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-600 text-white rounded-sm flex items-center justify-center text-xs font-black">YOU</span>
                    <span className="text-sm font-black text-slate-800 dark:text-muted-foreground">{selectedFowlForDetails.name}</span>
                  </div>
                  {formatStats(thisBirdStats)}
                </div>
              </div>

              {/* SIBLING COMPARISON TABLE */}
              {siblingData.length > 0 && (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-border">
                        <th className="text-left py-2 font-bold text-muted-foreground uppercase tracking-wider">Sibling</th>
                        <th className="text-center py-2 font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                        <th className="text-center py-2 font-bold text-muted-foreground uppercase tracking-wider">Fights</th>
                        <th className="text-center py-2 font-bold text-muted-foreground uppercase tracking-wider">W-L</th>
                        <th className="text-center py-2 font-bold text-muted-foreground uppercase tracking-wider">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siblingData.map((s) => (
                        <tr key={s.id} className="border-b border-slate-50 dark:border-border hover:bg-slate-50/50 dark:hover:bg-muted/50">
                          <td className="py-2 font-black text-slate-800 dark:text-card-foreground">
                            {(() => {
                              const target = fowls.find((f) => f.name.trim().toLowerCase() === s.name.trim().toLowerCase());
                              if (!target) return s.name;
                              return (
                                <span className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedFowlForDetails(target)}
                                    className="font-black text-emerald-700 dark:text-emerald-300 hover:underline underline-offset-2 cursor-pointer"
                                    title="Open this sibling&apos;s profile"
                                  >
                                    {s.name}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => ui.setFightHistoryFowl(target)}
                                    aria-label={`View all fights for ${s.name}`}
                                    title="View all fights"
                                    className="text-xs text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300 border border-border hover:border-emerald-400 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                                  >
                                    ⚔
                                  </button>
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-2 text-center">
                            <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full border ${toneBadge(s.relation)}`}>
                              {s.relation === 'Full Sibling' ? 'Full' : s.relation === 'Half-Sibling (Shared Sire)' ? 'Sire-Half' : 'Dam-Half'}
                            </span>
                          </td>
                          <td className="py-2 text-center font-bold text-slate-600 dark:text-muted-foreground">{s.stats.total}</td>
                          <td className="py-2 text-center font-bold text-slate-600 dark:text-muted-foreground">{s.stats.wins}W-{s.stats.losses}L</td>
                          <td className="py-2 text-center">{formatStats(s.stats)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* BREEDING INSIGHT */}
              <div className="bg-slate-50 dark:bg-muted/50 border border-slate-200/60 dark:border-border rounded-md p-3 space-y-2">
                <p className="text-xs font-black text-slate-600 dark:text-muted-foreground uppercase tracking-widest">🧬 Breeding Insight</p>
                {bestSibling && bestSibling.stats.winRate > thisBirdStats.winRate ? (
                  <p className="text-xs text-slate-700 dark:text-card-foreground font-medium">
                    <strong className="text-emerald-700 dark:text-emerald-300">{bestSibling.name}</strong> has the best record among siblings at <strong className="text-emerald-700 dark:text-emerald-300">{bestSibling.stats.winRate}%</strong> win rate ({bestSibling.stats.wins}W-{bestSibling.stats.losses}L). Consider using its parent combination for future breeding.
                  </p>
                ) : worseSibling && worseSibling.stats.winRate < thisBirdStats.winRate && thisBirdStats.total > 0 ? (
                  <p className="text-xs text-slate-700 dark:text-card-foreground font-medium">
                    <strong className="text-emerald-700 dark:text-emerald-300">{selectedFowlForDetails.name}</strong> outperforms its siblings. This parent combination ({selectedFowlForDetails.sire} × {selectedFowlForDetails.dam}) is a strong breeding candidate.
                  </p>
                ) : thisBirdStats.total === 0 && siblingData.every((s) => s.stats.total === 0) ? (
                  <p className="text-xs text-muted-foreground font-medium">
                    No match data yet for any siblings. Log fights to see which parent combination performs best.
                  </p>
                ) : (
                  <p className="text-xs text-slate-700 dark:text-card-foreground font-medium">
                    All siblings have similar performance. Track more fights to identify the strongest breeding line.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* DEVELOPMENT TIMELINE & MILESTONES */}
        {(() => {
          const info = getMilestoneInfo(selectedFowlForDetails.birthdate, selectedFowlForDetails.gender);
          if (!info) return null;
          return (
            <div className="bg-white dark:bg-card rounded-lg border border-slate-200/80 dark:border-border shadow-sm p-4 sm:p-5">
              <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-100 mb-3">
                <span>📅 Development Timeline &amp; Calendar Milestones</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">CURRENT: {info.current?.stage || '—'}</span>
              </h4>
              <div className="space-y-2">
                {info.stages.map((s) => {
                  const isCurrent = info.current?.id === s.id;
                  const isPast = info.parts.totalMonths >= s.toMonths;
                  const isNext = info.next !== null && info.next.id === s.id;
                  return (
                    <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-md border transition-all ${isCurrent ? 'bg-emerald-50 border-emerald-300 shadow-sm' : isPast ? 'bg-slate-50 dark:bg-muted/50 border-slate-100 dark:border-border opacity-60' : 'bg-white dark:bg-card border-slate-100 dark:border-border'}`}>
                      <span className={`w-8 h-8 rounded-sm flex items-center justify-center text-base shrink-0 ${isCurrent ? 'bg-emerald-600' : isPast ? 'bg-slate-200 dark:bg-muted' : 'bg-white dark:bg-card border border-slate-200 dark:border-border'}`}>{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black ${isCurrent ? 'text-emerald-800 dark:text-emerald-300' : isPast ? 'text-muted-foreground' : 'text-slate-700 dark:text-card-foreground'}`}>
                          {s.stage} <span className="font-mono text-xs text-muted-foreground">({s.fromMonths}–{isFinite(s.toMonths) ? s.toMonths : '∞'} mo)</span>
                        </p>
                        <p className="text-xs text-muted-foreground font-medium truncate">{s.note}</p>
                      </div>
                      {isCurrent ? (
                        <span className="text-xs font-black uppercase text-success dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded-full shrink-0">● Current</span>
                      ) : isPast ? (
                        <span className="text-xs font-bold text-muted-foreground shrink-0">✓ Reached</span>
                      ) : isNext && info.next ? (
                        <span className={`text-xs font-black uppercase px-2 py-1 rounded-full shrink-0 border ${info.next.daysUntil >= 0 ? 'text-amber-700 bg-amber-50 border-amber-200 dark:border-amber-800' : 'text-muted-foreground bg-slate-100 dark:bg-muted border-slate-200 dark:border-border'}`}>
                          {info.next.daysUntil >= 0 ? `Next · in ${info.next.daysUntil}d` : `Due · ${Math.abs(info.next.daysUntil)}d overdue`}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {info.next && (
                <p className="mt-3 text-xs text-muted-foreground bg-slate-50 dark:bg-muted/50 border border-slate-100 dark:border-border rounded-sm px-3 py-2 font-semibold">
                  🗓️ Next milestone: reach <span className="text-amber-700 dark:text-amber-300 font-black">{info.next.stage}</span> around <span className="text-slate-800 dark:text-card-foreground font-black">{info.next.date.toLocaleDateString()}</span>
                  {info.next.daysUntil >= 0 ? ` — in ${info.next.daysUntil} day${info.next.daysUntil === 1 ? '' : 's'}.` : ` (already ${Math.abs(info.next.daysUntil)} days past due).`}
                </p>
              )}
            </div>
          );
        })()}

        {/* COMBAT PERFORMANCE STATS VECTOR */}
        {(() => {
          const fowlMatches = matchHistory.filter(m => m.entry_name?.trim().toLowerCase() === selectedFowlForDetails.name?.trim().toLowerCase());
          const totalFights = fowlMatches.length;
          const wins = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'win').length;
          const losses = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'loss').length;
          const draws = fowlMatches.filter(m => m.outcome && m.outcome.toLowerCase() === 'draw').length;
          const decidedFights = wins + losses;
          const winRate = decidedFights > 0 
            ? Math.round((wins / decidedFights) * 100) 
            : totalFights > 0 
            ? Math.round((wins / totalFights) * 100) 
            : 0;

          return (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-lg space-y-3 shadow-sm border border-slate-700/60">
                <h4 className="text-xs font-black text-success uppercase tracking-widest flex items-center justify-between border-b pb-2 border-slate-700/80">
                  <span>⚔️ Combat Analytics & Performance Vectors</span>
                  <span className="font-mono text-success bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">CHICKEN ID: #{selectedFowlForDetails.id}</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="bg-slate-800/80 p-2.5 rounded-md border border-slate-700/60">
                    <span className="text-xs text-muted-foreground font-bold uppercase block">Total Fights</span>
                    <strong className="text-base text-white font-black">{totalFights}</strong>
                  </div>
                  <div className="bg-emerald-950/40 p-2.5 rounded-md border border-emerald-700/40">
                    <span className="text-xs text-success font-bold uppercase block">Wins</span>
                    <strong className="text-base text-success font-black">{wins} 🏆</strong>
                  </div>
                  <div className="bg-rose-950/40 p-2.5 rounded-md border border-rose-700/40">
                    <span className="text-xs text-danger font-bold uppercase block">Losses</span>
                    <strong className="text-base text-danger font-black">{losses} 💀</strong>
                  </div>
                  <div className="bg-amber-950/40 p-2.5 rounded-md border border-amber-700/40">
                    <span className="text-xs text-warning font-bold uppercase block">Draws</span>
                    <strong className="text-base text-warning font-black">{draws} 🤝</strong>
                  </div>
                  <div className="bg-teal-950/40 p-2.5 rounded-md border border-teal-700/40 col-span-2 sm:col-span-1">
                    <span className="text-xs text-teal font-bold uppercase block">Per-Chicken Win Rate</span>
                    <strong className="text-base text-teal font-black">{winRate}%</strong>
                    <span className="text-xs text-muted-foreground block font-mono font-semibold">{wins}W - {losses}L</span>
                  </div>
                </div>
              </div>

              {/* PER-BREED INDIVIDUAL BREAKDOWN */}
              {(() => {
                const breedMap = new Map<string, { fights: number; wins: number; losses: number; draws: number }>();
                fowlMatches.forEach(m => {
                  const breed = (m.opponent_breed || '').trim() || 'Unknown';
                  if (!breedMap.has(breed)) breedMap.set(breed, { fights: 0, wins: 0, losses: 0, draws: 0 });
                  const b = breedMap.get(breed)!;
                  b.fights++;
                  const o = (m.outcome || '').toLowerCase();
                  if (o === 'win') b.wins++;
                  else if (o === 'loss') b.losses++;
                  else if (o === 'draw') b.draws++;
                });
                const breeds = Array.from(breedMap.entries()).sort((a, b) => b[1].fights - a[1].fights);
                if (breeds.length === 0) return null;
                return (
                  <div className="bg-white dark:bg-card rounded-lg border border-slate-200 dark:border-border overflow-hidden shadow-2xs">
                    <div className="p-3 bg-slate-50 dark:bg-muted/50 border-b border-slate-200/80 dark:border-border">
                      <h4 className="text-xs font-black text-slate-700 dark:text-card-foreground uppercase tracking-wider">🏆 Individual Per-Breed Performance ({breeds.length} breed{breeds.length > 1 ? 's' : ''} faced)</h4>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">Win / Loss breakdown against each opponent breed — specific to this chicken only.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
                      {breeds.map(([breed, stats]) => {
                        const decided = stats.wins + stats.losses;
                        const wr = decided > 0 ? Math.round((stats.wins / decided) * 100) : 0;
                        const tone = wr >= 70 ? 'emerald' : wr >= 40 ? 'amber' : 'rose';
                        return (
                          <div key={breed} className="p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800 dark:text-card-foreground uppercase">{breed}</span>
                              <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                                tone === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : tone === 'amber' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}>{wr}%</span>
                            </div>
                            <div className="flex gap-2 text-xs font-bold">
                              <span className="text-success dark:text-emerald-300">{stats.wins}W</span>
                              <span className="text-danger dark:text-rose-300">{stats.losses}L</span>
                              {stats.draws > 0 && <span className="text-warning dark:text-amber-300">{stats.draws}D</span>}
                              <span className="text-muted-foreground">{stats.fights} total</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-muted rounded-full overflow-hidden flex">
                              {decided > 0 && <div className={`h-full ${tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${wr}%` }} />}
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
                const oppMap = new Map<string, { fights: number; wins: number; losses: number; draws: number; lastDate: string }>();
                fowlMatches.forEach(m => {
                  const opp = (m.opponent || '').trim() || 'Anonymous Opponent';
                  if (!oppMap.has(opp)) oppMap.set(opp, { fights: 0, wins: 0, losses: 0, draws: 0, lastDate: '' });
                  const o = oppMap.get(opp)!;
                  o.fights++;
                  const res = (m.outcome || '').toLowerCase();
                  if (res === 'win') o.wins++;
                  else if (res === 'loss') o.losses++;
                  else if (res === 'draw') o.draws++;
                  if ((m.date || '') > o.lastDate) o.lastDate = m.date || '';
                });
                const opponents = Array.from(oppMap.entries()).sort((a, b) => b[1].fights - a[1].fights);
                if (opponents.length === 0) return null;
                return (
                  <div className="bg-white dark:bg-card rounded-lg border border-slate-200 dark:border-border overflow-hidden shadow-2xs">
                    <div className="p-3 bg-slate-50 dark:bg-muted/50 border-b border-slate-200/80 dark:border-border">
                      <h4 className="text-xs font-black text-slate-700 dark:text-card-foreground uppercase tracking-wider">🥊 Previous Opponents ({opponents.length} faced)</h4>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">Every opponent this chicken has met, with the head-to-head record — this chicken only.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-border bg-slate-50/70 dark:bg-muted/40">
                            <th className="p-2.5 font-black text-slate-600 dark:text-card-foreground uppercase tracking-wider">Opponent</th>
                            <th className="p-2.5 font-black text-slate-600 dark:text-card-foreground uppercase tracking-wider text-center">Record</th>
                            <th className="p-2.5 font-black text-slate-600 dark:text-card-foreground uppercase tracking-wider text-center">Fights</th>
                            <th className="p-2.5 font-black text-slate-600 dark:text-card-foreground uppercase tracking-wider text-right">Last Fought</th>
                          </tr>
                        </thead>
                        <tbody>
                          {opponents.map(([opp, s]) => (
                            <tr key={opp} className="border-b border-slate-100 dark:border-border/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-muted/30">
                              <td className="p-2.5 font-bold text-slate-800 dark:text-card-foreground">{opp}</td>
                              <td className="p-2.5 text-center font-mono font-bold">
                                <span className="text-success">{s.wins}W</span>
                                <span className="text-danger"> {s.losses}L</span>
                                {s.draws > 0 && <span className="text-warning"> {s.draws}D</span>}
                              </td>
                              <td className="p-2.5 text-center font-bold text-slate-600 dark:text-muted-foreground">{s.fights}</td>
                              <td className="p-2.5 text-right font-mono font-semibold text-muted-foreground">{s.lastDate || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* DEDICATED INDIVIDUAL MATCH LOG TABLE */}
              <div className="bg-white dark:bg-card rounded-lg border border-slate-200 dark:border-border overflow-hidden shadow-2xs">
                <div className="p-3 bg-slate-50 dark:bg-muted/50 border-b border-slate-200/80 dark:border-border flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-700 dark:text-card-foreground uppercase tracking-wider">Individual Fight History Logs ({totalFights})</h4>
                  <span className="text-xs font-mono font-bold bg-slate-200 dark:bg-muted text-slate-700 dark:text-card-foreground px-2 py-0.5 rounded">MATCH LOG PARITY</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 dark:bg-muted/50 text-muted-foreground font-extrabold uppercase border-b border-slate-200 dark:border-border">
                        <th className="p-2.5 pl-4">Date</th>
                        <th className="p-2.5">Our Chicken</th>
                        <th className="p-2.5">Opponent</th>
                        <th className="p-2.5">Arena Location</th>
                        <th className="p-2.5">Event / Match Type</th>
                        <th className="p-2.5 text-center">Result</th>
                        <th className="p-2.5 text-center">Condition</th>
                        <th className="p-2.5 text-center">Media</th>
                        <th className="p-2.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-border text-slate-600 dark:text-muted-foreground font-semibold">
                      {fowlMatches.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-muted-foreground text-sm">
                            No derby performance logs recorded for this specific chicken node.
                          </td>
                        </tr>
                      ) : (
                        fowlMatches.map(match => {
                          const matchVideos = videosFor(matchMedia, match.id);
                          const matchPhotos = photosFor(matchMedia, match.id);
                          return (
                          <tr key={match.id} className="hover:bg-slate-50/80 dark:hover:bg-muted/50 transition-colors">
                            <td className="p-2.5 pl-4 font-mono text-xs text-muted-foreground">{match.date}</td>
                            <td className="p-2.5">
                              <span className="font-black text-slate-800 dark:text-card-foreground">{match.entry_name}</span>
                              <span className="block text-[11px] font-semibold text-muted-foreground normal-case">
                                {match.breed || '—'}{selectedFowlForDetails.birthdate ? ` · hatch ${selectedFowlForDetails.birthdate}` : ''}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="flex items-center gap-1.5">
                                {match.opponent_photo_url && (
                                  <img src={match.opponent_photo_url} alt="Opponent" className="h-6 w-6 rounded-full border border-border object-cover shrink-0" />
                                )}
                                <span className="font-bold text-slate-800 dark:text-card-foreground">{match.opponent}</span>
                              </span>
                              <span className="block text-[11px] font-semibold text-muted-foreground normal-case">
                                {[match.opponent_breed, match.opponent_bloodline].filter(Boolean).join(' · ') || '—'}
                                {match.opponent_birthdate ? ` · hatch ${match.opponent_birthdate}` : ''}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-muted-foreground">{match.location}</td>
                            <td className="p-2.5"><span className="bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border text-slate-700 dark:text-card-foreground text-xs font-bold px-2 py-0.5 rounded-full">{match.event_type || match.type}{match.event_type && match.type && match.event_type !== match.type ? ` · ${match.type}` : ''}</span></td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                                match.outcome.toLowerCase() === 'win' 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                                  : match.outcome.toLowerCase() === 'loss' 
                                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' 
                                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              }`}>
                                {match.outcome}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              {match.post_fight_condition ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase border whitespace-nowrap ${
                                  (match.post_fight_condition || '').toLowerCase().includes('deceased')
                                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                    : (match.post_fight_condition || '').toLowerCase().includes('critical') || (match.post_fight_condition || '').toLowerCase().includes('severely')
                                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    : 'bg-teal-50 dark:bg-teal-950/50 text-teal border-teal-200 dark:border-teal-800'
                                }`}>
                                  {(match.post_fight_condition || '').toLowerCase().includes('deceased') ? '💀 ' : (match.post_fight_condition || '').toLowerCase().includes('critical') || (match.post_fight_condition || '').toLowerCase().includes('severely') ? '🟠 ' : '🟢 '}{match.post_fight_condition}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground font-bold">—</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {matchVideos.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => ui.setVideoViewerUrl(matchVideos[0])}
                                    className="text-xs font-black text-success dark:text-emerald-300 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
                                    title="Watch in app"
                                  >
                                    <Play className="w-3 h-3" /> {matchVideos.length}
                                  </button>
                                )}
                                {matchPhotos.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => ui.setImageViewerUrl(matchPhotos[0])}
                                    className="text-xs font-black text-teal dark:text-teal-300 hover:text-teal-700 inline-flex items-center gap-1 cursor-pointer"
                                    title="View match photos"
                                  >
                                    <ImageIcon className="w-3 h-3" /> {matchPhotos.length}
                                  </button>
                                )}
                                {matchVideos.length === 0 && matchPhotos.length === 0 && (
                                  <span className="text-xs text-muted-foreground font-bold">—</span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  aria-label="Edit match"
                                  title="Edit match"
                                  onClick={() => ui.setEditingMatch(match)}
                                  className="p-1 rounded border border-border bg-card text-muted-foreground hover:text-success hover:border-success/40 transition-colors cursor-pointer"
                                >
                                  <PencilLine className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Share match"
                                  title="Share match record"
                                  onClick={() => ui.setShareTarget({ type: 'match', id: match.id, label: `${match.entry_name} vs ${match.opponent || 'Opponent'} — ${match.date || ''}` })}
                                  className="p-1 rounded border border-border bg-card text-muted-foreground hover:text-success hover:border-success/40 transition-colors cursor-pointer"
                                >
                                  <Share2 className="w-3 h-3" />
                                </button>
                              </div>
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
        <div className="space-y-3 bg-white dark:bg-card p-4 rounded-lg border border-slate-200 dark:border-border">
          <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest border-b pb-2">Condition &amp; Result History</h4>
          {(() => {
            type TimelineItem = { key: string; date: string; kind: 'match' | 'status'; title: string; detail?: string };
            const birdName = (selectedFowlForDetails.name || '').trim().toLowerCase();
            const timelineMatches = matchHistory.filter((m) => (m.entry_name || '').trim().toLowerCase() === birdName);
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
              return <p className="text-xs font-semibold text-muted-foreground">No condition or result history yet.</p>;
            }
            return (
              <ol className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li key={item.key} className="flex items-baseline gap-2 text-xs">
                    <span className="font-mono font-bold text-muted-foreground w-24 shrink-0">{item.date || '—'}</span>
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${item.kind === 'match' ? 'bg-emerald-500' : 'bg-sky-500'}`} aria-hidden="true" />
                    <span className="font-bold text-foreground">{item.title}</span>
                    {item.detail && <span className="font-semibold text-muted-foreground">· {item.detail}</span>}
                  </li>
                ))}
              </ol>
            );
          })()}
        </div>

        <div className="space-y-3 bg-slate-50/50 dark:bg-muted/50 p-4 rounded-lg border border-slate-100 dark:border-border">
          <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest border-b pb-2">Lineage Integration Balance</h4>
          
          {(() => {
            const selGen = generationOf(selectedFowlForDetails);
            const selInfo = generationInfo(selGen);
            return (
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/50 rounded-md px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-black text-teal uppercase tracking-wider">🧬 Breeding Generation</p>
                  <p className="text-xs font-bold text-muted-foreground truncate">{selInfo.label} · {selInfo.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-black text-teal">{generationPurity(selGen)}%</span>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Generational Purity</p>
                </div>
              </div>
            );
          })()}
          
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span>♂ Sire Heritage Weight</span>
                {(() => {
                  const sireName = (selectedFowlForDetails.sire || '').trim();
                  const sireLower = sireName.toLowerCase();
                  const isFoundation = sireLower === 'foundation stock' || !sireLower;
                  const isRegistered = !!parentRecordOf(selectedFowlForDetails, 'sire', fowls);
                  return (
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-full uppercase ${isRegistered ? 'bg-sky-100 text-sky-700 border border-sky-200 dark:border-sky-800' : isFoundation ? 'bg-slate-100 dark:bg-muted text-muted-foreground border border-slate-200 dark:border-border' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}>
                      {isRegistered ? '✓ Registered' : isFoundation ? 'Foundation' : 'External'}
                    </span>
                  );
                })()}
              </span>
              <span className="text-slate-800 dark:text-card-foreground">{cleanPct(selectedFowlForDetails.sire_pct)}% · {(() => {
                const name = selectedFowlForDetails.sire || '';
                const target = parentRecordOf(selectedFowlForDetails, 'sire', fowls);
                return (
                  <>
                    {target ? (
                      <button
                        type="button"
                        onClick={() => setSelectedFowlForDetails(target)}
                        className="text-sky-700 dark:text-sky-300 font-bold hover:underline underline-offset-2 cursor-pointer"
                        title="Open Sire profile"
                      >
                        {name}
                      </button>
                    ) : <span className="text-slate-600 dark:text-muted-foreground">{name || '—'}</span>}
                    {target?.breed && <span className="font-semibold"> · {target.breed}</span>}
                  </>
                );
              })()}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-muted h-2 rounded-full overflow-hidden">
              <div className="bg-sky-500 h-full rounded-full" style={{ width: `${cleanPct(selectedFowlForDetails.sire_pct)}%` }}></div>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span>♀ Dam Heritage Weight</span>
                {(() => {
                  const damName = (selectedFowlForDetails.dam || '').trim();
                  const damLower = damName.toLowerCase();
                  const isFoundation = damLower === 'foundation stock' || !damLower;
                  const isRegistered = !!parentRecordOf(selectedFowlForDetails, 'dam', fowls);
                  return (
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-full uppercase ${isRegistered ? 'bg-pink-100 text-pink border border-pink-200 dark:border-pink-800' : isFoundation ? 'bg-slate-100 dark:bg-muted text-muted-foreground border border-slate-200 dark:border-border' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}>
                      {isRegistered ? '✓ Registered' : isFoundation ? 'Foundation' : 'External'}
                    </span>
                  );
                })()}
              </span>
              <span className="text-slate-800 dark:text-card-foreground">{cleanPct(selectedFowlForDetails.dam_pct)}% · {(() => {
                const name = selectedFowlForDetails.dam || '';
                const target = parentRecordOf(selectedFowlForDetails, 'dam', fowls);
                return (
                  <>
                    {target ? (
                      <button
                        type="button"
                        onClick={() => setSelectedFowlForDetails(target)}
                        className="text-pink font-bold hover:underline underline-offset-2 cursor-pointer"
                        title="Open Dam profile"
                      >
                        {name}
                      </button>
                    ) : <span className="text-slate-600 dark:text-muted-foreground">{name || '—'}</span>}
                    {target?.breed && <span className="font-semibold"> · {target.breed}</span>}
                  </>
                );
              })()}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-muted h-2 rounded-full overflow-hidden">
              <div className="bg-pink-500 h-full rounded-full" style={{ width: `${cleanPct(selectedFowlForDetails.dam_pct)}%` }}></div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/50 dark:border-border flex justify-between items-center text-xs">
            <span className="font-extrabold text-slate-700 dark:text-card-foreground">Specific Bloodline %</span>
            <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
              {bloodlineOf(selectedFowlForDetails)}%
            </span>
          </div>

          {(() => {
            const ps = pairingAnalytics.all.get(`${(selectedFowlForDetails.sire || '').trim().toLowerCase()}|||${(selectedFowlForDetails.dam || '').trim().toLowerCase()}`);
            if (!ps) return null;
            return (
              <div className="pt-2 border-t border-slate-200/50 dark:border-border flex justify-between items-center text-xs gap-2">
                <span className="font-extrabold text-slate-700 dark:text-card-foreground min-w-0 truncate">🔗 Pairing Performance ({ps.sire} × {ps.dam})</span>
                <span className={`font-mono font-black px-2.5 py-0.5 rounded-full border shrink-0 ${ps.totalFights > 0 ? (ps.winRate >= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60') : 'bg-slate-100 dark:bg-muted text-muted-foreground border-slate-200 dark:border-border'}`}>
                  {ps.totalFights > 0 ? `${ps.winRate}% · ${ps.wins}W-${ps.losses}L` : 'No match data'}
                </span>
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-muted/50 p-3 rounded-md border border-slate-100 dark:border-border">
            <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">Structural Weight</span>
            <strong className="text-slate-800 dark:text-card-foreground text-sm mt-0.5 block">{selectedFowlForDetails.weight ? `${weightFromStorage(selectedFowlForDetails.weight, unitPrefs.weightUnit)} ${weightUnitLabel(unitPrefs.weightUnit)}` : 'N/A'}</strong>
          </div>
          <div className="bg-slate-50 dark:bg-muted/50 p-3 rounded-md border border-slate-100 dark:border-border">
            <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">Height Dimension</span>
            <strong className="text-slate-800 dark:text-card-foreground text-sm mt-0.5 block">{selectedFowlForDetails.height ? `${heightFromStorage(selectedFowlForDetails.height, unitPrefs.heightUnit)} ${heightUnitLabel(unitPrefs.heightUnit)}` : 'N/A'}</strong>
          </div>
          <div className="bg-slate-50 dark:bg-muted/50 p-3 rounded-md border border-slate-100 dark:border-border">
            <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">Eye Specimen Variant</span>
            <strong className="text-slate-800 dark:text-card-foreground text-sm mt-0.5 block">{selectedFowlForDetails.eye_variant || 'Standard Eye'}</strong>
          </div>
          <div className="bg-slate-50 dark:bg-muted/50 p-3 rounded-md border border-slate-100 dark:border-border">
            <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">Visual Color Range</span>
            <strong className="text-slate-800 dark:text-card-foreground text-sm mt-0.5 block">{selectedFowlForDetails.color_category} ({selectedFowlForDetails.color})</strong>
          </div>
          <div className="bg-slate-50 dark:bg-muted/50 p-3 rounded-md border border-slate-100 dark:border-border sm:col-span-2">
            <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">Behavioral Spec</span>
            <strong className="text-emerald-700 dark:text-emerald-300 text-sm mt-0.5 block font-bold">{selectedFowlForDetails.behavior_trait}</strong>
          </div>
        </div>
      </Modal>
  );
}
