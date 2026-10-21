'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  ArrowLeft,
  Trash2,
  Video,
  Image as ImageIcon,
  AlertCircle,
  Calendar,
  Swords,
  Sliders,
  Trophy,
  Upload,
} from 'lucide-react';
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
import { filterAllowedColumns } from '@/lib/schema-contract';
import type { FowlRecord, MatchRecord } from '@/lib/types';

function SelectChevron() {
  return (
    <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
      <div className="border-muted-foreground h-2 w-2 -translate-y-[2px] rotate-45 border-r-2 border-b-2" />
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
  onSuccessRedirect = '/profiling?tab=matchForm',
}: MatchRecordFormProps) {
  const router = useRouter();
  const { fowls, birdCodes, fetchDatabaseResources } = useFowl();
  const { rows } = useRegistryOptions();
  const settings = useUserSettings();

  // Validate and determine initial fowl ID + preselect warning message
  const { initialFowlIdValue, initialPreselectWarning } = useMemo(() => {
    if (mode === 'add' && initialFowlId != null) {
      const found = fowls.find((f) => f.id === initialFowlId);
      if (!found) {
        return {
          initialFowlIdValue: null,
          initialPreselectWarning: `Chicken #${initialFowlId} was not found in your registry. Please select an active rooster from the list.`,
        };
      }
      if (found.status !== 'Active') {
        return {
          initialFowlIdValue: null,
          initialPreselectWarning: `"${found.name}" is marked as ${found.status}. Only active roosters can be selected for new match records.`,
        };
      }
      if (!isMale(found.gender)) {
        return {
          initialFowlIdValue: null,
          initialPreselectWarning: `"${found.name}" is female (${found.gender || 'Hen'}). Only male roosters can be entered in competitive matches.`,
        };
      }
      return {
        initialFowlIdValue: found.id,
        initialPreselectWarning: null,
      };
    }

    if (initialFowlId != null) {
      return { initialFowlIdValue: initialFowlId, initialPreselectWarning: null };
    }

    if (initialRecord) {
      // In edit mode: use the stored fowl_id directly. Never auto-attach by name.
      if (initialRecord.fowl_id != null)
        return { initialFowlIdValue: initialRecord.fowl_id, initialPreselectWarning: null };
      // fowl_id is null → historical match; no auto-attach.
    }

    return { initialFowlIdValue: null, initialPreselectWarning: null };
  }, [mode, initialFowlId, initialRecord, fowls]);

  const initialFormState: FormState = useMemo(
    () => ({
      fowlId: initialFowlIdValue,
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
    }),
    [initialRecord, initialFowlIdValue],
  );

  const [form, setForm] = useState<FormState>(initialFormState);
  const [preselectWarning, setPreselectWarning] = useState<string | null>(initialPreselectWarning);

  // True when editing a match that has no linked chicken in the DB.
  // In this mode: fowlId is not required, entry_name is shown read-only,
  // and the user may optionally link a chicken.
  const isHistoricalMatch = mode === 'edit' && (initialRecord?.fowl_id ?? null) === null;
  // Whether the user has chosen to link a chicken to this historical match
  const [linkChickenId, setLinkChickenId] = useState<number | null>(null);

  useEffect(() => {
    setPreselectWarning(initialPreselectWarning);
    if (initialPreselectWarning) {
      setForm((prev) => ({ ...prev, fowlId: null }));
    }
  }, [initialPreselectWarning]);

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
  // Legacy single-video column (match.video_url). It is preserved on save and
  // only cleared when the user explicitly removes it.
  const [legacyVideoRemoved, setLegacyVideoRemoved] = useState(false);
  const legacyVideoUrl =
    mode === 'edit' &&
    typeof initialRecord?.video_url === 'string' &&
    initialRecord.video_url.trim() !== ''
      ? initialRecord.video_url.trim()
      : null;

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
        const [signedV, signedP] = await Promise.all([signMediaUrls(vUrls), signMediaUrls(pUrls)]);
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
  const eventTypeIsCustom =
    form.eventType === '__custom__' || !eventValues.includes(form.eventType);
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
      setNewVideoFiles((prev) =>
        [...prev, ...accepted].slice(0, MAX_MATCH_VIDEOS - existingVideos.length),
      );
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
      setNewPhotoFiles((prev) =>
        [...prev, ...accepted].slice(0, MAX_MATCH_PHOTOS - existingPhotos.length),
      );
    }
  };

  const handleDeleteExistingVideo = async (rowId: number) => {
    if (
      !window.confirm(
        'Delete this video from the match? This will remove the video file permanently.',
      )
    )
      return;
    const res = await mediaService.deleteMatchMedia('video', rowId);
    if (res.error) {
      toastMessage(res.error, 'error');
    } else {
      toastMessage('Video removed successfully.', 'success');
      setExistingVideos((prev) => prev.filter((v) => v.id !== rowId));
    }
  };

  const handleDeleteExistingPhoto = async (rowId: number) => {
    if (
      !window.confirm(
        'Delete this photo from the match? This will remove the photo file permanently.',
      )
    )
      return;
    const res = await mediaService.deleteMatchMedia('photo', rowId);
    if (res.error) {
      toastMessage(res.error, 'error');
    } else {
      toastMessage('Photo removed successfully.', 'success');
      setExistingPhotos((prev) => prev.filter((p) => p.id !== rowId));
    }
  };

  const handleRemoveLegacyVideo = () => {
    if (
      !window.confirm(
        'Remove this video from the match? The video file and its link will be cleared on save.',
      )
    )
      return;
    setLegacyVideoRemoved(true);
    toastMessage('Legacy video will be removed when you save.', 'success');
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    // fowlId required in add mode always; in edit mode only for non-historical matches.
    if (!isHistoricalMatch && !form.fowlId) {
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
    if (form.date) {
      const matchDate = new Date(form.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (matchDate > today) {
        errs.date = 'Match date cannot be in the future.';
      }
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
    if (saving) return;
    setSaveError(null);

    const errs: Record<string, string> = {};
    // fowlId required in add mode, or in edit mode when the match already has a linked chicken.
    if (!isHistoricalMatch && !form.fowlId) {
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
    if (form.date) {
      const matchDate = new Date(form.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (matchDate > today) {
        errs.date = 'Match date cannot be in the future.';
      }
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
      const activeUserId = (await supabase.auth.getUser()).data.user?.id;
      if (!activeUserId) throw new Error('Active session user ID not detected.');

      // Resolve fowl snapshot for the payload.
      // For historical matches the user may optionally link a chicken this save;
      // if they didn't choose one, preserve the existing entry_name/breed/fowl_id.
      let resolvedFowlId: number | null;
      let resolvedEntryName: string;
      let resolvedBreed: string;

      if (isHistoricalMatch) {
        if (linkChickenId != null) {
          // User explicitly linked a chicken this session
          const linked = fowls.find((f) => f.id === linkChickenId);
          if (!linked) throw new Error('Linked chicken record could not be found.');
          resolvedFowlId = linked.id;
          resolvedEntryName = linked.name;
          resolvedBreed = linked.breed || 'Unknown';
        } else {
          // Keep the historical snapshot — do NOT overwrite fowl_id, entry_name, or breed
          resolvedFowlId = initialRecord?.fowl_id ?? null;
          resolvedEntryName = initialRecord?.entry_name ?? '';
          resolvedBreed = initialRecord?.breed ?? 'Unknown';
        }
      } else {
        const selectedFowl = fowls.find((f) => f.id === form.fowlId);
        if (!selectedFowl) throw new Error('Selected chicken record could not be found.');
        resolvedFowlId = selectedFowl.id;
        resolvedEntryName = selectedFowl.name;
        resolvedBreed = selectedFowl.breed || 'Unknown';
      }

      // 1. Upload new videos with progress
      const uploadedVideoUrls: string[] = [];
      const uploadedVideoPosters: (string | null)[] = [];
      for (const vFile of newVideoFiles) {
        const key = uploadKey('video', vFile);
        const vRes = await matchService.uploadMatchVideo(vFile, (pct) => {
          setMediaUploadProgress((prev) => ({ ...prev, [key]: pct }));
        });
        if (vRes.error) throw new Error(`Video upload failed: ${vRes.error}`);
        if (vRes.url) {
          uploadedVideoUrls.push(vRes.url);
          let posterUrl: string | null = null;
          try {
            const posterBlob = await captureVideoPoster(vFile);
            if (posterBlob) {
              const posterFile = new File(
                [posterBlob],
                `${vFile.name.replace(/\.[^.]+$/, '') || 'video'}-poster.jpg`,
                { type: 'image/jpeg' },
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
        if (pRes.error) throw new Error(`Photo upload failed: ${pRes.error}`);
        if (pRes.url) uploadedPhotoUrls.push(pRes.url);
      }

      // 3. Assemble database payload — only include fields in the schema contract.
      // fowl_id: only include it if we have a resolved value (don't send null to overwrite non-null).
      const rawMatchPayload: Record<string, unknown> = {
        user_id: activeUserId,
        date: form.date || new Date().toISOString().split('T')[0],
        entry_name: resolvedEntryName,
        breed: resolvedBreed,
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

      // Include fowl_id when we have a resolved one
      if (resolvedFowlId != null) {
        rawMatchPayload.fowl_id = resolvedFowlId;
      }

      // Only set video_url when a new video was uploaded
      if (uploadedVideoUrls.length > 0) {
        rawMatchPayload.video_url = uploadedVideoUrls[0];
      } else if (legacyVideoRemoved) {
        // Explicit user action only: clear the legacy single-video column.
        rawMatchPayload.video_url = null;
      }

      // Pass through the schema contract. Treat a dropped user-editable field as a visible error.
      const USER_EDITABLE_KEYS: ReadonlyArray<string> = [
        'date',
        'entry_name',
        'breed',
        'opponent',
        'opponent_breed',
        'opponent_bloodline',
        'opponent_birthdate',
        'location',
        'type',
        'derby_match_number',
        'outcome',
        'post_fight_condition',
        'side',
        'notes',
        'cock_count',
        'age_category',
        'event_type',
        'video_url',
      ];
      const filteredPayload = filterAllowedColumns('match', rawMatchPayload);
      const droppedKeys = Object.keys(rawMatchPayload).filter((k) => !(k in filteredPayload));
      const droppedEditable = droppedKeys.filter((k) => USER_EDITABLE_KEYS.includes(k));
      if (droppedEditable.length > 0) {
        console.warn(
          '[match-form] Dropped user-editable keys (schema mismatch):',
          droppedEditable.join(', '),
        );
        throw new Error(
          `The change could not be saved: the following fields are not recognised by the database schema: ${droppedEditable.join(', ')}. Contact support.`,
        );
      }

      let matchId: number;

      if (mode === 'add') {
        const result = await matchService.insertMatch(filteredPayload);
        if (result.error || !result.id)
          throw new Error(result.error || 'Failed to save match record.');
        matchId = result.id;
      } else {
        if (!initialRecord?.id) throw new Error('Missing match ID for edit.');
        matchId = initialRecord.id;
        const result = await matchService.updateMatch(matchId, filteredPayload);
        if (result.error) throw new Error(result.error);
      }

      // 4. Save newly uploaded media rows
      const existingVideoCount = existingVideos.length;
      for (let i = 0; i < uploadedVideoUrls.length; i++) {
        const vInsertRes = await mediaService.insertMatchVideo(
          matchId,
          uploadedVideoUrls[i],
          existingVideoCount + i + 1,
          uploadedVideoPosters[i] ?? null,
        );
        if (vInsertRes.error) throw new Error(`Failed to save video record: ${vInsertRes.error}`);
      }

      const existingPhotoCount = existingPhotos.length;
      for (let i = 0; i < uploadedPhotoUrls.length; i++) {
        const pInsertRes = await mediaService.insertMatchPhoto(
          matchId,
          uploadedPhotoUrls[i],
          existingPhotoCount + i + 1,
        );
        if (pInsertRes.error) throw new Error(`Failed to save photo record: ${pInsertRes.error}`);
      }

      // 5. Invalidate & refresh everything that depends on matches
      await fetchDatabaseResources();

      toastMessage(
        mode === 'add' ? 'Match record logged successfully!' : 'Match record updated successfully!',
        'success',
      );

      // Redirect back to Match Logs
      router.push(onSuccessRedirect);
    } catch (err) {
      console.error('[match-form] Error saving match record:', err);
      const msg = err instanceof Error ? err.message : String(err);
      // Keep user input — do not navigate, do not clear the form
      setSaveError(msg);
      toastMessage(`Save failed: ${msg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectClass = (hasError?: boolean) =>
    `match-field h-11 sm:h-12 w-full cursor-pointer rounded-lg border ${
      hasError ? 'border-danger focus:border-danger' : 'border-input-border focus:border-success'
    } bg-white dark:bg-input px-3.5 sm:px-4 pr-10 text-sm sm:text-base font-semibold text-foreground transition-colors duration-150 focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)] min-h-[44px] scroll-mb-40`;

  const inputClass = (hasError?: boolean) =>
    `match-field h-11 sm:h-12 min-w-0 w-full rounded-lg border ${
      hasError ? 'border-danger focus:border-danger' : 'border-input-border focus:border-success'
    } bg-white dark:bg-input px-3.5 sm:px-4 text-sm sm:text-base font-semibold text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus:shadow-[0_0_0_3px_rgba(19,169,131,.12)] min-h-[44px] scroll-mb-40`;

  // Derive return label for breadcrumb
  const backLabel = useMemo(() => {
    const target = (onSuccessRedirect || '').toLowerCase();
    if (target.includes('tab=matchform') || target.includes('/match-logs')) return 'Match Logs';
    if (target.includes('/dashboard')) return 'Dashboard';
    if (target.includes('/lineage')) return 'Lineage Directory';
    if (target.includes('/profiling')) return 'Chicken Registry';
    return 'Match Logs';
  }, [onSuccessRedirect]);

  return (
    <div className="mx-auto w-full max-w-6xl scroll-pb-40 space-y-8 pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-4">
      {/* Breadcrumb & Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground flex items-center space-x-2 text-sm font-semibold sm:text-base"
      >
        <button
          type="button"
          onClick={() => handleCancel(onSuccessRedirect)}
          className="hover:text-foreground flex cursor-pointer items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>{backLabel}</span>
        </button>
        <ChevronRight className="text-muted-foreground/60 h-4 w-4" />
        <span className="text-foreground font-bold">
          {mode === 'add' ? 'Add Match Record' : 'Edit Match Record'}
        </span>
      </nav>

      {/* Header */}
      <div className="border-border flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground flex items-center gap-2.5 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
            <span>⚔️</span>
            <span>{mode === 'add' ? 'Add Match Record' : 'Edit Match Record'}</span>
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium sm:text-base">
            {mode === 'add'
              ? 'Log a new competitive fight performance encounter with official verification'
              : `Updating match record #${initialRecord?.id ?? ''} · ${initialRecord?.entry_name || 'Chicken'}`}
          </p>
        </div>
      </div>

      {/* Save Error Banner */}
      {saveError && (
        <div
          role="alert"
          className="text-danger flex items-start gap-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 sm:p-5"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm sm:text-base">
            <strong className="block font-bold">Save Failed</strong>
            <span>{saveError}</span>
          </div>
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="match-form-scroll bg-card border-border space-y-8 rounded-xl border p-6 shadow-sm sm:space-y-10 sm:p-8 lg:p-10"
      >
        {/* Section 1: Match Details */}
        <section className="space-y-4">
          <div className="border-border border-b pb-3">
            <h2 className="text-foreground flex items-center gap-2 text-base font-black sm:text-lg">
              <Calendar className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Match Details</span>
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium sm:text-sm">
              Select your rooster entry, match date, event type, and arena location
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            <div>
              {isHistoricalMatch ? (
                /* Historical match: show recorded name read-only, offer optional link */
                <>
                  <div className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm">
                    Chicken Entry (Historical Record)
                  </div>
                  <div className="border-input-border bg-muted/40 flex min-h-[44px] items-center gap-2 rounded-lg border px-3.5 py-3">
                    <span className="text-foreground text-sm font-bold sm:text-base">
                      {initialRecord?.entry_name || '—'}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      Historical entry (no profile linked)
                    </span>
                  </div>
                  {/* Optional: link to a current chicken */}
                  <div className="mt-3">
                    <label
                      className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wider uppercase"
                      htmlFor="link-chicken-id"
                    >
                      Link to a chicken <span className="font-normal normal-case">(optional)</span>
                    </label>
                    <div className="relative">
                      <select
                        id="link-chicken-id"
                        value={linkChickenId ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setLinkChickenId(val);
                        }}
                        className={selectClass()}
                      >
                        <option value="">— Keep as historical (unlinked) —</option>
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
                    {linkChickenId != null && (
                      <p className="mt-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Saving will link this match to the selected chicken and update the recorded
                        name.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                /* Normal (linked) mode */
                <>
                  <label
                    className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm"
                    htmlFor="fowlId"
                  >
                    Select Local Chicken Entry <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="fowlId"
                      value={form.fowlId ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setPreselectWarning(null);
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
                  {preselectWarning && (
                    <div
                      role="status"
                      className="text-warning mt-1.5 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs font-semibold"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{preselectWarning}</span>
                    </div>
                  )}
                  {errors.fowlId && (
                    <p
                      id="err-fowlId"
                      role="alert"
                      className="text-danger mt-1.5 text-xs font-semibold sm:text-sm"
                    >
                      {errors.fowlId}
                    </p>
                  )}
                </>
              )}
            </div>

            <div>
              <label
                className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm"
                htmlFor="match-date"
              >
                Match Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                id="match-date"
                value={form.date}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, date: e.target.value }));
                  if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
                }}
                className={inputClass(!!errors.date)}
                required
                aria-invalid={!!errors.date}
                aria-describedby={errors.date ? 'err-date' : undefined}
              />
              {errors.date && (
                <p
                  id="err-date"
                  role="alert"
                  className="text-danger mt-1.5 text-xs font-semibold sm:text-sm"
                >
                  {errors.date}
                </p>
              )}
            </div>

            <div>
              <label
                className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm"
                htmlFor="arena-location-hub"
              >
                Arena Location Hub{' '}
                {settings.match_location_required && <span className="text-danger">*</span>}
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
                placeholder={
                  settings.match_location_required
                    ? 'Select or type arena...'
                    : 'Select or type arena (optional)...'
                }
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
                <p
                  id="err-location"
                  role="alert"
                  className="text-danger mt-1.5 text-xs font-semibold sm:text-sm"
                >
                  {errors.matchLocation}
                </p>
              )}
            </div>

            <div>
              <label
                className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm"
                htmlFor="event-type"
              >
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
                  className={`${inputClass(!!errors.eventType)} mt-2.5`}
                  aria-invalid={!!errors.eventType}
                  aria-describedby={errors.eventType ? 'err-event' : undefined}
                />
              )}
              {errors.eventType && (
                <p
                  id="err-event"
                  role="alert"
                  className="text-danger mt-1.5 text-xs font-semibold sm:text-sm"
                >
                  {errors.eventType}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Opponent */}
        <section className="space-y-4">
          <div className="border-border border-b pb-3">
            <h2 className="text-foreground flex items-center gap-2 text-base font-black sm:text-lg">
              <Swords className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Opponent</span>
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium sm:text-sm">
              Record identity and breed classification of the challenger entry
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            <div className="sm:col-span-1 lg:col-span-2">
              <label
                className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm"
                htmlFor="opponent-entry-identity"
              >
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
                <p
                  id="err-opponent"
                  role="alert"
                  className="text-danger mt-1.5 text-xs font-semibold sm:text-sm"
                >
                  {errors.opponentName}
                </p>
              )}
            </div>

            <div>
              <label
                className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm"
                htmlFor="opponent-breed-rasa"
              >
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
          </div>
        </section>

        {/* Section 3: Match Configuration */}
        <section className="space-y-4">
          <div className="border-border border-b pb-3">
            <h2 className="text-foreground flex items-center gap-2 text-base font-black sm:text-lg">
              <Sliders className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Match Configuration</span>
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium sm:text-sm">
              Specify fight structure, chicken class, and strategic combat observations
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            <div>
              <label
                className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm"
                htmlFor="number-of-cocks"
              >
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
                  className={`${inputClass()} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                />
                <span className="bg-muted text-muted-foreground flex h-11 shrink-0 items-center rounded-lg px-4 py-3 text-xs font-bold sm:h-12 sm:text-sm">
                  cocks
                </span>
              </div>
            </div>

            <div>
              <label
                className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm"
                htmlFor="chicken-class"
              >
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
                  <option value="Open">Open</option>
                </select>
                <SelectChevron />
              </div>
            </div>

            {form.cockCount > 0 && (
              <div className="flex flex-col justify-end sm:col-span-2 lg:col-span-1">
                <div className="flex h-11 items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 sm:h-12">
                  <span className="bg-success h-2.5 w-2.5 shrink-0 animate-pulse rounded-full" />
                  <span className="text-success shrink-0 text-xs font-bold tracking-wider uppercase">
                    Live Preview:
                  </span>
                  <span className="text-foreground truncate text-xs font-extrabold sm:text-sm">
                    {buildPreview()}
                  </span>
                </div>
              </div>
            )}

            {/* Notes: Spanning full width of its row */}
            <div className="col-span-full">
              <label
                className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm"
                htmlFor="match-notes"
              >
                Notes
              </label>
              <input
                type="text"
                id="match-notes"
                value={form.matchNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, matchNotes: e.target.value }))}
                placeholder="e.g., Aggressive high fly start, solid footing, deep cutting finish"
                maxLength={300}
                className={inputClass()}
              />
            </div>
          </div>
        </section>

        {/* Section 4: Result */}
        <section className="space-y-4">
          <div className="border-border border-b pb-3">
            <h2 className="text-foreground flex items-center gap-2 text-base font-black sm:text-lg">
              <Trophy className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Result</span>
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium sm:text-sm">
              Official fight verdict and post-encounter physical health status
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            <div>
              <label
                className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm"
                htmlFor="fight-outcome"
              >
                Fight Outcome <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <select
                  id="fight-outcome"
                  value={form.matchOutcome}
                  onChange={(e) => setForm((prev) => ({ ...prev, matchOutcome: e.target.value }))}
                  className="h-11 min-h-[44px] w-full cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-3.5 pr-10 text-sm font-black text-amber-900 sm:h-12 sm:px-4 sm:text-base dark:border-amber-700/80 dark:bg-amber-950/40 dark:text-amber-200"
                  required
                >
                  <option value="Win">WIN</option>
                  <option value="Loss">LOSS</option>
                  <option value="Draw">DRAW</option>
                </select>
                <SelectChevron />
              </div>
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <label
                className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase sm:text-sm"
                htmlFor="post-fight-condition"
              >
                Post-Fight Condition
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
        </section>

        {/* Section 5: Media Evidence Management (Full Width) */}
        <section className="space-y-6 pt-2">
          <div className="border-border border-b pb-3">
            <h2 className="text-foreground flex items-center gap-2 text-base font-black sm:text-lg">
              <Video className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Media</span>
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium sm:text-sm">
              Attach official fight video recordings and high-resolution photo documentation
            </p>
          </div>

          <div className="space-y-6">
            {/* Video Evidence */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-wider uppercase sm:text-sm">
                  <Video className="h-4 w-4 text-emerald-600" />
                  <span>Video Evidence (up to {MAX_MATCH_VIDEOS})</span>
                </span>
                <span className="text-muted-foreground text-xs font-semibold sm:text-sm">
                  {existingVideos.length + newVideoFiles.length} / {MAX_MATCH_VIDEOS} attached
                </span>
              </div>

              {/* Legacy single-video column (match.video_url) with no match_videos row.
                  Kept visible so the user can see it and remove it deliberately. */}
              {mode === 'edit' && legacyVideoUrl && existingVideos.length === 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Current Videos:
                  </p>
                  <ul className="space-y-2">
                    <li
                      className="border-border bg-muted/30 flex items-center justify-between rounded-lg border p-3.5 text-xs font-semibold sm:text-sm"
                      data-testid="legacy-video-row"
                    >
                      <div className="flex min-w-0 items-center gap-2.5 truncate pr-2">
                        <Video className="text-success h-4 w-4 shrink-0" />
                        <span className="truncate font-bold">Video 1</span>
                        <a
                          href={legacyVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 shrink-0 text-xs font-bold text-emerald-600 hover:underline sm:text-sm dark:text-emerald-400"
                        >
                          (View Video)
                        </a>
                      </div>
                      {legacyVideoRemoved ? (
                        <span className="text-muted-foreground shrink-0 text-xs font-bold">
                          Will be removed on save
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRemoveLegacyVideo}
                          className="text-danger flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-bold hover:underline sm:text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Remove</span>
                        </button>
                      )}
                    </li>
                  </ul>
                </div>
              )}

              {/* Existing Videos List (Edit mode) */}
              {existingVideos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Current Videos:
                  </p>
                  <ul className="space-y-2">
                    {existingVideos.map((v, idx) => (
                      <li
                        key={v.id}
                        className="border-border bg-muted/30 flex items-center justify-between rounded-lg border p-3.5 text-xs font-semibold sm:text-sm"
                      >
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <Video className="text-success h-4 w-4 shrink-0" />
                          <span className="truncate font-bold">Video {idx + 1}</span>
                          <a
                            href={signedVideoUrls[v.id] || v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 shrink-0 text-xs font-bold text-emerald-600 hover:underline sm:text-sm dark:text-emerald-400"
                          >
                            (View Video)
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingVideo(v.id)}
                          className="text-danger flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-bold hover:underline sm:text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
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
                  className="border-border bg-muted/20 hover:bg-muted/40 flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors sm:h-28"
                  htmlFor="video-input"
                >
                  <div className="text-muted-foreground flex items-center gap-2 text-sm font-bold sm:text-base">
                    <Upload className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5 dark:text-emerald-400" />
                    <span>+ Add fight match recording</span>
                  </div>
                  <span className="text-muted-foreground mt-1 text-xs font-medium">
                    MP4, MOV, AVI, WebM, MKV up to 50MB
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
                <ul className="space-y-2">
                  {newVideoFiles.map((file, idx) => {
                    const pct = mediaUploadProgress[uploadKey('video', file)];
                    return (
                      <li
                        key={`${file.name}-${idx}`}
                        className="border-border bg-muted/40 rounded-lg border px-4 py-3 text-xs font-bold sm:text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate pr-2">
                            New Video {idx + 1}: {file.name}
                            {pct !== undefined ? ` — ${pct}%` : ''}
                          </span>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              setNewVideoFiles(newVideoFiles.filter((_, i) => i !== idx))
                            }
                            className="text-danger shrink-0 cursor-pointer hover:underline disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                        {pct !== undefined && (
                          <div className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full">
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-wider uppercase sm:text-sm">
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                  <span>Match Photos (up to {MAX_MATCH_PHOTOS})</span>
                </span>
                <span className="text-muted-foreground text-xs font-semibold sm:text-sm">
                  {existingPhotos.length + newPhotoFiles.length} / {MAX_MATCH_PHOTOS} attached
                </span>
              </div>

              {/* Existing Photos List (Edit mode) */}
              {existingPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Current Photos:
                  </p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {existingPhotos.map((p, idx) => (
                      <div
                        key={p.id}
                        className="border-border bg-muted group relative overflow-hidden rounded-lg border p-1.5"
                      >
                        <img
                          src={signedPhotoUrls[p.id] || p.url}
                          alt={`Match attachment ${idx + 1}`}
                          className="h-28 w-full rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingPhoto(p.id)}
                          className="text-danger mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition-colors hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
                  className="border-border bg-muted/20 hover:bg-muted/40 flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors sm:h-28"
                  htmlFor="photo-input"
                >
                  <div className="text-muted-foreground flex items-center gap-2 text-sm font-bold sm:text-base">
                    <Upload className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5 dark:text-emerald-400" />
                    <span>+ Attach photos of this match</span>
                  </div>
                  <span className="text-muted-foreground mt-1 text-xs font-medium">
                    JPG, PNG, WebP up to 10MB
                  </span>
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
                <ul className="space-y-2">
                  {newPhotoFiles.map((file, idx) => {
                    const pct = mediaUploadProgress[uploadKey('photo', file)];
                    return (
                      <li
                        key={`${file.name}-${idx}`}
                        className="border-border bg-muted/40 rounded-lg border px-4 py-3 text-xs font-bold sm:text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate pr-2">
                            New Photo {idx + 1}: {file.name}
                            {pct !== undefined ? ` — ${pct}%` : ''}
                          </span>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              setNewPhotoFiles(newPhotoFiles.filter((_, i) => i !== idx))
                            }
                            className="text-danger shrink-0 cursor-pointer hover:underline disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                        {pct !== undefined && (
                          <div className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full">
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
        </section>

        {/* Clear bottom spacer so form content is never hidden behind the sticky bar */}
        <div className="h-4 sm:h-6" />

        {/* Action bar.
            - Below lg: sticky to the bottom of the viewport, fully opaque, with a
              top border and shadow, kept INSIDE the page container (no negative
              margins) and padded for the iOS safe-area inset.
            - lg and up: static, at the end of the form, so it never covers a field. */}
        <div className="bg-card border-border sticky bottom-0 z-30 flex items-center justify-between gap-3 border-t pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:gap-4 sm:pt-5 lg:static lg:border-t-0 lg:bg-transparent lg:pt-6 lg:pb-0 lg:shadow-none dark:shadow-[0_-4px_16px_rgba(0,0,0,0.35)]">
          <button
            type="button"
            onClick={() => handleCancel(onSuccessRedirect)}
            disabled={saving}
            className="border-border text-foreground hover:bg-muted h-auto min-h-[44px] min-w-0 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm leading-tight font-bold transition-colors disabled:opacity-50 sm:px-6 sm:text-base"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex h-auto min-h-[44px] min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm leading-tight font-extrabold text-white shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-7 sm:text-base"
          >
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            <span className="min-w-0 break-words">
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
          className="animate-fadeIn fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="bg-card border-border w-full max-w-md space-y-4 rounded-lg border p-6 shadow-xl">
            <h3 id="discard-title" className="text-foreground text-lg font-black">
              Unsaved Changes
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed font-semibold">
              You have unsaved changes on this match record. Are you sure you want to leave? All
              entered information will be discarded.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardDialog(false)}
                className="border-border text-foreground hover:bg-muted cursor-pointer rounded-md border px-4 py-2 text-sm font-bold transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="cursor-pointer rounded-md bg-rose-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-rose-700"
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
