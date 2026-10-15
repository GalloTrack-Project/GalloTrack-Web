'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ArrowLeft, Trash2, Video, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { isMale } from '@/lib/helpers';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { mergeOptions } from '@/lib/lifecycle';
import { useRegistryOptions } from '@/lib/hooks/use-registry-options';
import { useUserSettings } from '@/lib/hooks/use-user-settings';
import { useFowl } from '@/lib/contexts/fowl-context';
import * as matchService from '@/lib/services/match-service';
import * as mediaService from '@/lib/services/media-service';
import { supabase } from '@/lib/registry';
import { toastMessage } from '@/lib/toast-bus';
import { signMediaUrls } from '@/lib/media-privacy';
import {
  MAX_MATCH_PHOTOS,
  MAX_MATCH_VIDEOS,
  captureVideoPoster,
  uploadKey,
  validatePhotoFile,
  validateVideoFile,
} from '@/lib/media-format';
import type { FowlRecord, MatchRecord } from '@/lib/types';

function SelectChevron() {
  return (
    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
      <div className="h-[7px] w-[7px] border-r-[1.7px] border-b-[1.7px] border-muted-foreground rotate-45 -translate-y-[2px]" />
    </div>
  );
}

export type MatchRecordFormProps = {
  mode: 'add' | 'edit';
  initialRecord?: MatchRecord | null;
  initialFowlId?: number | null;
  onSuccessRedirect?: string;
};

interface FormState {
  fowlId: number | null;
  date: string;
  opponentName: string;
  opponentBreed: string;
  opponentBloodline: string;
  opponentHatch: string;
  matchLocation: string;
  matchType: string;
  matchSide: string;
  matchNotes: string;
  derbyMatchNumber: number;
  matchOutcome: string;
  matchPostFight: string;
  cockCount: number;
  ageCategory: string;
  eventType: string;
}

export default function MatchRecordForm({
  mode,
  initialRecord,
  initialFowlId,
  onSuccessRedirect = '/match-logs',
}: MatchRecordFormProps) {
  const router = useRouter();
  const { fowls, birdCodes, fetchDatabaseResources } = useFowl();
  const { rows } = useRegistryOptions();
  const settings = useUserSettings();

  // Find initial fowl ID
  const computeInitialFowlId = (): number | null => {
    if (initialFowlId) return initialFowlId;
    if (initialRecord) {
      if (initialRecord.fowl_id != null) return initialRecord.fowl_id;
      // Fallback by name for legacy records
      const found = fowls.find(
        (f) => (f.name || '').trim().toLowerCase() === (initialRecord.entry_name || '').trim().toLowerCase()
      );
      if (found) return found.id;
    }
    return null;
  };

  const initialFormState: FormState = useMemo(() => ({
    fowlId: computeInitialFowlId(),
    date: initialRecord?.date || new Date().toISOString().split('T')[0],
    opponentName: initialRecord?.opponent || '',
    opponentBreed: initialRecord?.opponent_breed || '',
    opponentBloodline: initialRecord?.opponent_bloodline || '',
    opponentHatch: initialRecord?.opponent_birthdate || '',
    matchLocation: initialRecord?.location || '',
    matchType: initialRecord?.type || 'Main Event',
    matchSide: initialRecord?.side || '',
    matchNotes: initialRecord?.notes || '',
    derbyMatchNumber: initialRecord?.derby_match_number || 1,
    matchOutcome: initialRecord?.outcome || 'Win',
    matchPostFight: initialRecord?.post_fight_condition || 'Fit / Recovered',
    cockCount: initialRecord?.cock_count || 2,
    ageCategory: initialRecord?.age_category || 'Cock',
    eventType: initialRecord?.event_type || 'Derby',
  }), [initialRecord, initialFowlId, fowls]);

  const [form, setForm] = useState<FormState>(initialFormState);
  const [customEventType, setCustomEventType] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Media state
  const [existingVideos, setExistingVideos] = useState<mediaService.MatchMediaDetailItem[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<mediaService.MatchMediaDetailItem[]>([]);
  const [signedVideoUrls, setSignedVideoUrls] = useState<Record<number, string>>({});
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<Record<number, string>>({});
  const [newVideoFiles, setNewVideoFiles] = useState<File[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [mediaUploadProgress, setMediaUploadProgress] = useState<Record<string, number>>({});

  // Submitting / Dirty states
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);

  // Load existing media in Edit mode
  useEffect(() => {
    if (mode === 'edit' && initialRecord?.id) {
      let isMounted = true;
      mediaService.fetchMatchMediaDetails(initialRecord.id).then(async (details) => {
        if (!isMounted) return;
        setExistingVideos(details.videos);
        setExistingPhotos(details.photos);

        // Sign private URLs for preview
        const vUrls = details.videos.map((v) => v.url);
        const pUrls = details.photos.map((p) => p.url);
        const [signedV, signedP] = await Promise.all([
          signMediaUrls(vUrls),
          signMediaUrls(pUrls),
        ]);
        if (!isMounted) return;

        const vMap: Record<number, string> = {};
        details.videos.forEach((v, idx) => {
          vMap[v.id] = signedV[idx] || v.url;
        });
        setSignedVideoUrls(vMap);

        const pMap: Record<number, string> = {};
        details.photos.forEach((p, idx) => {
          pMap[p.id] = signedP[idx] || p.url;
        });
        setSignedPhotoUrls(pMap);
      });
      return () => {
        isMounted = false;
      };
    }
  }, [mode, initialRecord?.id]);

  // Sync initial state if initialRecord/initialFowlId changes
  useEffect(() => {
    setForm(initialFormState);
  }, [initialFormState]);

  // Compute dirty flag
  const isDirty = useMemo(() => {
    if (newVideoFiles.length > 0 || newPhotoFiles.length > 0) return true;
    return (
      form.fowlId !== initialFormState.fowlId ||
      form.date !== initialFormState.date ||
      form.opponentName !== initialFormState.opponentName ||
      form.opponentBreed !== initialFormState.opponentBreed ||
      form.opponentBloodline !== initialFormState.opponentBloodline ||
      form.opponentHatch !== initialFormState.opponentHatch ||
      form.matchLocation !== initialFormState.matchLocation ||
      form.matchType !== initialFormState.matchType ||
      form.matchSide !== initialFormState.matchSide ||
      form.matchNotes !== initialFormState.matchNotes ||
      form.derbyMatchNumber !== initialFormState.derbyMatchNumber ||
      form.matchOutcome !== initialFormState.matchOutcome ||
      form.matchPostFight !== initialFormState.matchPostFight ||
      form.cockCount !== initialFormState.cockCount ||
      form.ageCategory !== initialFormState.ageCategory ||
      form.eventType !== initialFormState.eventType
    );
  }, [form, initialFormState, newVideoFiles, newPhotoFiles]);

  // Unsaved changes beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, saving]);

  // Candidate roosters: active males + currently assigned bird if editing
  const candidateFowls = useMemo(() => {
    const activeMales = fowls.filter((f) => f.status === 'Active' && isMale(f.gender));
    if (form.fowlId) {
      const current = fowls.find((f) => f.id === form.fowlId);
      if (current && !activeMales.some((f) => f.id === current.id)) {
        return [current, ...activeMales];
      }
    }
    return activeMales;
  }, [fowls, form.fowlId]);

  // Registry options
  const eventOptions = mergeOptions(rows, 'event_type', form.eventType || 'Derby');
  const eventValues = eventOptions.map((o) => o.value);
  const eventTypeIsCustom = form.eventType === '__custom__' || !eventValues.includes(form.eventType);
  const eventTypeSelectValue = eventValues.includes(form.eventType) ? form.eventType : '__custom__';
  const effectiveEventType = form.eventType === '__custom__' ? customEventType : form.eventType;

  const conditionOptions = mergeOptions(rows, 'post_match_condition', form.matchPostFight);
  const locationOptions = mergeOptions(rows, 'location', form.matchLocation);

  const buildPreview = () => {
    const cockText = form.cockCount > 0 ? `${form.cockCount} cocks` : '0 cocks';
    const eventLabel = effectiveEventType || 'Event Type';
    return `${eventLabel} · ${cockText} · ${form.ageCategory}`;
  };

  const handleVideoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = MAX_MATCH_VIDEOS - (existingVideos.length + newVideoFiles.length);
    if (remainingSlots <= 0) {
      toastMessage(`Maximum ${MAX_MATCH_VIDEOS} videos allowed per match.`, 'warning');
      return;
    }
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      const error = await validateVideoFile(file);
      if (error) toastMessage(error, 'error');
      else accepted.push(file);
    }
    if (accepted.length > 0) {
      setNewVideoFiles((prev) => [...prev, ...accepted].slice(0, MAX_MATCH_VIDEOS - existingVideos.length));
    }
  };

  const handlePhotoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = MAX_MATCH_PHOTOS - (existingPhotos.length + newPhotoFiles.length);
    if (remainingSlots <= 0) {
      toastMessage(`Maximum ${MAX_MATCH_PHOTOS} photos allowed per match.`, 'warning');
      return;
    }
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      const error = await validatePhotoFile(file);
      if (error) toastMessage(error, 'error');
      else accepted.push(file);
    }
    if (accepted.length > 0) {
      setNewPhotoFiles((prev) => [...prev, ...accepted].slice(0, MAX_MATCH_PHOTOS - existingPhotos.length));
    }
  };

  const handleDeleteExistingVideo = async (rowId: number) => {
    if (!window.confirm('Delete this video from the match? This will remove the video file permanently.')) return;
    const res = await mediaService.deleteMatchMedia('video', rowId);
    if (res.error) {
      toastMessage(res.error, 'error');
    } else {
      toastMessage('Video removed successfully.', 'success');
      setExistingVideos((prev) => prev.filter((v) => v.id !== rowId));
    }
  };

  const handleDeleteExistingPhoto = async (rowId: number) => {
    if (!window.confirm('Delete this photo from the match? This will remove the photo file permanently.')) return;
    const res = await mediaService.deleteMatchMedia('photo', rowId);
    if (res.error) {
      toastMessage(res.error, 'error');
    } else {
      toastMessage('Photo removed successfully.', 'success');
      setExistingPhotos((prev) => prev.filter((p) => p.id !== rowId));
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.fowlId) {
      errs.fowlId = 'Please select a chicken entry.';
    }
    if (!form.opponentName.trim()) {
      errs.opponentName = 'Opponent entry identity is required.';
    }
    if (settings.match_location_required && !form.matchLocation.trim()) {
      errs.matchLocation = 'Arena location is required by your farm settings.';
    }
    if (eventTypeIsCustom && !effectiveEventType.trim()) {
      errs.eventType = 'Enter a custom event type or pick a preset.';
    }
    if (form.cockCount < 1 || form.cockCount > 99) {
      errs.cockCount = 'Number of cocks must be between 1 and 99.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCancel = (destination = onSuccessRedirect) => {
    if (isDirty) {
      setPendingNavigationUrl(destination);
      setShowDiscardDialog(true);
    } else {
      router.push(destination);
    }
  };

  const confirmDiscard = () => {
    setShowDiscardDialog(false);
    if (pendingNavigationUrl) {
      router.push(pendingNavigationUrl);
    } else {
      router.push(onSuccessRedirect);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const errs: Record<string, string> = {};
    if (!form.fowlId) {
      errs.fowlId = 'Please select a chicken entry.';
    }
    if (!form.opponentName.trim()) {
      errs.opponentName = 'Opponent entry identity is required.';
    }
    if (settings.match_location_required && !form.matchLocation.trim()) {
      errs.matchLocation = 'Arena location is required by your farm settings.';
    }
    if (eventTypeIsCustom && !effectiveEventType.trim()) {
      errs.eventType = 'Enter a custom event type or pick a preset.';
    }
    if (form.cockCount < 1 || form.cockCount > 99) {
      errs.cockCount = 'Number of cocks must be between 1 and 99.';
    }
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstField = Object.keys(errs)[0];
      const el = document.getElementById(firstField);
      el?.focus();
      return;
    }

    setSaving(true);

    try {
      const selectedFowl = fowls.find((f) => f.id === form.fowlId);
      if (!selectedFowl) throw new Error('Selected chicken record could not be found.');

      const activeUserId = (await supabase.auth.getUser()).data.user?.id;
      if (!activeUserId) throw new Error('Active session user ID not detected.');

      // 1. Upload new videos with progress
      const uploadedVideoUrls: string[] = [];
      const uploadedVideoPosters: (string | null)[] = [];
      for (const vFile of newVideoFiles) {
        const key = uploadKey('video', vFile);
        const vRes = await matchService.uploadMatchVideo(vFile, (pct) => {
          setMediaUploadProgress((prev) => ({ ...prev, [key]: pct }));
        });
        if (vRes.error) throw new Error(vRes.error);
        if (vRes.url) {
          uploadedVideoUrls.push(vRes.url);
          let posterUrl: string | null = null;
          try {
            const posterBlob = await captureVideoPoster(vFile);
            if (posterBlob) {
              const posterFile = new File(
                [posterBlob],
                `${vFile.name.replace(/\.[^.]+$/, '') || 'video'}-poster.jpg`,
                { type: 'image/jpeg' }
              );
              const posterUpload = await mediaService.uploadMatchPhotoFile(posterFile);
              posterUrl = posterUpload.url || null;
            }
          } catch {
            /* poster is best-effort */
          }
          uploadedVideoPosters.push(posterUrl);
        }
      }

      // 2. Upload new photos with progress
      const uploadedPhotoUrls: string[] = [];
      for (const pFile of newPhotoFiles) {
        const key = uploadKey('photo', pFile);
        const pRes = await mediaService.uploadMatchPhotoFile(pFile, (pct) => {
          setMediaUploadProgress((prev) => ({ ...prev, [key]: pct }));
        });
        if (pRes.error) throw new Error(pRes.error);
        if (pRes.url) uploadedPhotoUrls.push(pRes.url);
      }

      // 3. Assemble database payload
      // Link matches to chickens by fowl ID (authoritative foreign key) and write entry_name as snapshot
      const matchPayload: Record<string, unknown> = {
        user_id: activeUserId,
        fowl_id: selectedFowl.id,
        entry_name: selectedFowl.name,
        breed: selectedFowl.breed || 'Unknown',
        date: form.date || new Date().toISOString().split('T')[0],
        opponent: form.opponentName.trim(),
        opponent_breed: form.opponentBreed.trim() || '',
        opponent_bloodline: form.opponentBloodline.trim() || null,
        opponent_birthdate: form.opponentHatch.trim() || null,
        location: form.matchLocation.trim(),
        type: form.matchType || 'Main Event',
        derby_match_number: form.derbyMatchNumber,
        outcome: form.matchOutcome,
        status: 'Verified',
        post_fight_condition: form.matchPostFight,
        side: form.matchSide.trim() || null,
        notes: form.matchNotes.trim() || null,
        cock_count: form.cockCount,
        age_category: form.ageCategory,
        event_type: effectiveEventType,
      };

      if (uploadedVideoUrls.length > 0) {
        matchPayload.video_url = uploadedVideoUrls[0];
      }

      let matchId: number;

      if (mode === 'add') {
        const result = await matchService.insertMatch(matchPayload);
        if (result.error || !result.id) throw new Error(result.error || 'Failed to save match record.');
        matchId = result.id;
      } else {
        if (!initialRecord?.id) throw new Error('Missing match ID for edit.');
        matchId = initialRecord.id;
        const result = await matchService.updateMatch(matchId, matchPayload);
        if (result.error) throw new Error(result.error || 'Failed to update match record.');
      }

      // 4. Save newly uploaded media rows
      const existingVideoCount = existingVideos.length;
      for (let i = 0; i < uploadedVideoUrls.length; i++) {
        await mediaService.insertMatchVideo(
          matchId,
          uploadedVideoUrls[i],
          existingVideoCount + i + 1,
          uploadedVideoPosters[i] ?? null
        );
      }

      const existingPhotoCount = existingPhotos.length;
      for (let i = 0; i < uploadedPhotoUrls.length; i++) {
        await mediaService.insertMatchPhoto(matchId, uploadedPhotoUrls[i], existingPhotoCount + i + 1);
      }

      // 5. Invalidate & refresh everything that depends on matches
      await fetchDatabaseResources();

      toastMessage(
        mode === 'add' ? 'Match record logged successfully!' : 'Match record updated successfully!',
        'success'
      );

      // Redirect back to Match Logs
      router.push(onSuccessRedirect);
    } catch (err) {
      console.error('Error saving match record:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(msg);
      toastMessage(`Save failed: ${msg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectClass = (hasError?: boolean) =>
    `match-field h-10 w-full cursor-pointer rounded-md border ${
      hasError ? 'border-danger focus:border-danger' : 'border-input-border focus:border-success'
    } bg-white dark:bg-input px-3 pr-10 text-sm font-semibold text-foreground transition-colors duration-150 focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]`;

  const inputClass = (hasError?: boolean) =>
    `match-field h-10 min-w-0 flex-1 rounded-md border ${
      hasError ? 'border-danger focus:border-danger' : 'border-input-border focus:border-success'
    } bg-white dark:bg-input px-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)]`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Breadcrumb & Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-muted-foreground font-semibold">
        <button
          type="button"
          onClick={() => handleCancel(onSuccessRedirect)}
          className="hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Match Logs</span>
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-bold">
          {mode === 'add' ? 'Add Match Record' : 'Edit Match Record'}
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span>⚔️</span>
            <span>{mode === 'add' ? 'Add Match Record' : 'Edit Match Record'}</span>
          </h1>
          <p className="text-sm text-muted-foreground font-semibold mt-1">
            {mode === 'add'
              ? 'Log a new competitive fight performance encounter with official verification'
              : `Updating match record #${initialRecord?.id ?? ''} · ${initialRecord?.entry_name || 'Chicken'}`}
          </p>
        </div>
      </div>

      {/* Save Error Banner */}
      {saveError && (
        <div role="alert" className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-danger flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="font-bold block">Save Failed</strong>
            <span>{saveError}</span>
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} noValidate className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-6">
        {/* Section 1: Chicken Node & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="fowlId">
              Select Local Chicken Entry <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <select
                id="fowlId"
                value={form.fowlId ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setForm((prev) => ({ ...prev, fowlId: val }));
                  if (errors.fowlId) setErrors((prev) => ({ ...prev, fowlId: '' }));
                }}
                className={selectClass(!!errors.fowlId)}
                aria-invalid={!!errors.fowlId}
                aria-describedby={errors.fowlId ? 'err-fowlId' : undefined}
                required
              >
                <option value="">-- Select Rooster --</option>
                {candidateFowls.map((f) => {
                  const code = birdCodes.get(String(f.id));
                  return (
                    <option key={f.id} value={f.id}>
                      {code ? `[${formatBirdCodeForDisplay(code)}] ` : ''}
                      {f.name} ({f.breed})
                    </option>
                  );
                })}
              </select>
              <SelectChevron />
            </div>
            {errors.fowlId && (
              <p id="err-fowlId" role="alert" className="mt-1 text-xs font-semibold text-danger">
                {errors.fowlId}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="match-date">
              Match Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              id="match-date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className={inputClass()}
              required
            />
          </div>
        </div>

        {/* Section 2: Opponent & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="opponent-entry-identity">
              Opponent Entry Identity <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              id="opponent-entry-identity"
              value={form.opponentName}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, opponentName: e.target.value }));
                if (errors.opponentName) setErrors((prev) => ({ ...prev, opponentName: '' }));
              }}
              placeholder="e.g., Kelso Express"
              className={inputClass(!!errors.opponentName)}
              aria-invalid={!!errors.opponentName}
              aria-describedby={errors.opponentName ? 'err-opponent' : undefined}
              required
            />
            {errors.opponentName && (
              <p id="err-opponent" role="alert" className="mt-1 text-xs font-semibold text-danger">
                {errors.opponentName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="opponent-breed-rasa">
              Opponent Breed / Rasa
            </label>
            <input
              type="text"
              id="opponent-breed-rasa"
              value={form.opponentBreed}
              onChange={(e) => setForm((prev) => ({ ...prev, opponentBreed: e.target.value }))}
              placeholder="e.g., Kelso, Roundhead"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="arena-location-hub">
              Arena Location Hub {settings.match_location_required && <span className="text-danger">*</span>}
            </label>
            <input
              list="arena-locations"
              id="arena-location-hub"
              value={form.matchLocation}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, matchLocation: e.target.value }));
                if (errors.matchLocation) setErrors((prev) => ({ ...prev, matchLocation: '' }));
              }}
              className={inputClass(!!errors.matchLocation)}
              placeholder={settings.match_location_required ? 'Select or type arena...' : 'Select or type arena (optional)...'}
              required={settings.match_location_required}
              aria-invalid={!!errors.matchLocation}
              aria-describedby={errors.matchLocation ? 'err-location' : undefined}
            />
            <datalist id="arena-locations">
              {locationOptions.map((o) => (
                <option key={o.value} value={o.value} />
              ))}
            </datalist>
            {errors.matchLocation && (
              <p id="err-location" role="alert" className="mt-1 text-xs font-semibold text-danger">
                {errors.matchLocation}
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Match Configuration */}
        <div className="rounded-lg border border-border bg-muted/20 p-5 space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
            <span>⚙️</span> Match Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-success" htmlFor="number-of-cocks">
                Number of Cocks
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={99}
                  id="number-of-cocks"
                  value={form.cockCount || ''}
                  onChange={(e) => {
                    const count = Number(e.target.value) || 0;
                    setForm((prev) => ({ ...prev, cockCount: count }));
                  }}
                  className={`${inputClass()} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                />
                <span className="rounded-md bg-muted px-4 py-2.5 text-xs font-bold text-muted-foreground">cocks</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-success" htmlFor="chicken-class">
                Chicken Class
              </label>
              <div className="relative">
                <select
                  id="chicken-class"
                  value={form.ageCategory}
                  onChange={(e) => setForm((prev) => ({ ...prev, ageCategory: e.target.value }))}
                  className={selectClass()}
                >
                  <option value="Cock">Cock</option>
                  <option value="Stag">Stag</option>
                </select>
                <SelectChevron />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-success" htmlFor="event-type">
                Event Type
              </label>
              <div className="relative">
                <select
                  id="event-type"
                  value={eventTypeSelectValue}
                  onChange={(e) => setForm((prev) => ({ ...prev, eventType: e.target.value }))}
                  className={selectClass(!!errors.eventType)}
                >
                  {eventOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label || o.value}
                    </option>
                  ))}
                  <option value="__custom__">Others (Add Custom)</option>
                </select>
                <SelectChevron />
              </div>

              {eventTypeIsCustom && (
                <input
                  type="text"
                  value={form.eventType === '__custom__' ? customEventType : form.eventType}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomEventType(v);
                    setForm((prev) => ({ ...prev, eventType: v || '__custom__' }));
                    if (errors.eventType) setErrors((prev) => ({ ...prev, eventType: '' }));
                  }}
                  placeholder="Type custom event type..."
                  maxLength={50}
                  className={`${inputClass(!!errors.eventType)} mt-2`}
                  aria-invalid={!!errors.eventType}
                  aria-describedby={errors.eventType ? 'err-event' : undefined}
                />
              )}
              {errors.eventType && (
                <p id="err-event" role="alert" className="mt-1 text-xs font-semibold text-danger">
                  {errors.eventType}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-success" htmlFor="match-notes">
                Notes
              </label>
              <input
                type="text"
                id="match-notes"
                value={form.matchNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, matchNotes: e.target.value }))}
                placeholder="e.g., slow starter, powerful finish"
                maxLength={300}
                className={inputClass()}
              />
            </div>
          </div>

          {form.cockCount > 0 && (
            <div className="mt-2 rounded-md bg-success/10 border border-success/20 p-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wide text-success">Live Preview:</span>
              <span className="text-sm font-extrabold text-foreground">{buildPreview()}</span>
            </div>
          )}
        </div>

        {/* Section 4: Fight Outcome & Health Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="fight-outcome">
              Fight Outcome <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <select
                id="fight-outcome"
                value={form.matchOutcome}
                onChange={(e) => setForm((prev) => ({ ...prev, matchOutcome: e.target.value }))}
                className="w-full h-10 px-3 pr-10 border border-amber-300 dark:border-amber-700/80 rounded-md text-sm bg-amber-50 dark:bg-amber-950/40 font-black text-amber-900 dark:text-amber-200 cursor-pointer"
                required
              >
                <option value="Win">WIN</option>
                <option value="Loss">LOSS</option>
                <option value="Draw">DRAW</option>
              </select>
              <SelectChevron />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5" htmlFor="post-fight-condition">
              Post-Fight Condition / Health Status
            </label>
            <div className="relative">
              <select
                id="post-fight-condition"
                value={form.matchPostFight}
                onChange={(e) => setForm((prev) => ({ ...prev, matchPostFight: e.target.value }))}
                className={selectClass()}
              >
                {conditionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label || o.value}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
        </div>

        {/* Section 5: Media Evidence Management */}
        <div className="space-y-6 pt-2 border-t border-border">
          {/* Video Evidence */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-600" />
                <span>Video Evidence (up to {MAX_MATCH_VIDEOS})</span>
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                {existingVideos.length + newVideoFiles.length} / {MAX_MATCH_VIDEOS} attached
              </span>
            </div>

            {/* Existing Videos List (Edit mode) */}
            {existingVideos.length > 0 && (
              <div className="mb-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">Current Videos:</p>
                <ul className="space-y-2">
                  {existingVideos.map((v, idx) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30 text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <Video className="w-4 h-4 text-success shrink-0" />
                        <span className="truncate">Video {idx + 1}</span>
                        <a
                          href={signedVideoUrls[v.id] || v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-600 hover:underline shrink-0 ml-1 font-bold"
                        >
                          (View Video)
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingVideo(v.id)}
                        className="text-danger hover:underline font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* New Video Upload Dropzone */}
            {existingVideos.length + newVideoFiles.length < MAX_MATCH_VIDEOS && (
              <label
                className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
                htmlFor="video-input"
              >
                <span className="text-sm font-bold text-muted-foreground">
                  + Add fight match recording (MP4, MOV, AVI, WebM, MKV)
                </span>
                <input
                  type="file"
                  id="video-input"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska"
                  multiple
                  disabled={existingVideos.length + newVideoFiles.length >= MAX_MATCH_VIDEOS}
                  onChange={(e) => {
                    void handleVideoSelect(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            )}

            {/* Newly Selected Video Files */}
            {newVideoFiles.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {newVideoFiles.map((file, idx) => {
                  const pct = mediaUploadProgress[uploadKey('video', file)];
                  return (
                    <li key={`${file.name}-${idx}`} className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs font-bold">
                      <div className="flex items-center justify-between">
                        <span className="truncate pr-2">
                          New Video {idx + 1}: {file.name}
                          {pct !== undefined ? ` — ${pct}%` : ''}
                        </span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setNewVideoFiles(newVideoFiles.filter((_, i) => i !== idx))}
                          className="text-danger hover:underline shrink-0 cursor-pointer disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                      {pct !== undefined && (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-200"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Photo Evidence */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>Match Photos (up to {MAX_MATCH_PHOTOS})</span>
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                {existingPhotos.length + newPhotoFiles.length} / {MAX_MATCH_PHOTOS} attached
              </span>
            </div>

            {/* Existing Photos List (Edit mode) */}
            {existingPhotos.length > 0 && (
              <div className="mb-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">Current Photos:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {existingPhotos.map((p, idx) => (
                    <div
                      key={p.id}
                      className="relative rounded-md border border-border overflow-hidden bg-muted group p-1"
                    >
                      <img
                        src={signedPhotoUrls[p.id] || p.url}
                        alt={`Match photo ${idx + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingPhoto(p.id)}
                        className="mt-1.5 w-full py-1 text-xs font-bold text-danger hover:bg-rose-500/10 rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Photo Upload Dropzone */}
            {existingPhotos.length + newPhotoFiles.length < MAX_MATCH_PHOTOS && (
              <label
                className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
                htmlFor="photo-input"
              >
                <span className="text-sm font-bold text-muted-foreground">+ Attach photos of this match</span>
                <input
                  type="file"
                  id="photo-input"
                  accept="image/*"
                  multiple
                  disabled={existingPhotos.length + newPhotoFiles.length >= MAX_MATCH_PHOTOS}
                  onChange={(e) => {
                    void handlePhotoSelect(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            )}

            {/* Newly Selected Photo Files */}
            {newPhotoFiles.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {newPhotoFiles.map((file, idx) => {
                  const pct = mediaUploadProgress[uploadKey('photo', file)];
                  return (
                    <li key={`${file.name}-${idx}`} className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs font-bold">
                      <div className="flex items-center justify-between">
                        <span className="truncate pr-2">
                          New Photo {idx + 1}: {file.name}
                          {pct !== undefined ? ` — ${pct}%` : ''}
                        </span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setNewPhotoFiles(newPhotoFiles.filter((_, i) => i !== idx))}
                          className="text-danger hover:underline shrink-0 cursor-pointer disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                      {pct !== undefined && (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all duration-200"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 -mx-6 -mb-6 p-4 sm:p-5 bg-card/95 backdrop-blur-sm border-t border-border rounded-b-lg flex items-center justify-between gap-4 z-10">
          <button
            type="button"
            onClick={() => handleCancel(onSuccessRedirect)}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg border border-border font-bold text-sm text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>
              {saving
                ? mode === 'add'
                  ? 'Saving Record...'
                  : 'Updating Record...'
                : mode === 'add'
                ? 'Save Match Record'
                : 'Update Match Record'}
            </span>
          </button>
        </div>
      </form>

      {/* Discard Confirmation Dialog */}
      {showDiscardDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 id="discard-title" className="text-lg font-black text-foreground">
              Unsaved Changes
            </h3>
            <p className="text-sm text-muted-foreground font-semibold leading-relaxed">
              You have unsaved changes on this match record. Are you sure you want to leave? All entered information will be discarded.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardDialog(false)}
                className="px-4 py-2 rounded-md border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold transition-colors cursor-pointer shadow-sm"
              >
                Discard &amp; Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
