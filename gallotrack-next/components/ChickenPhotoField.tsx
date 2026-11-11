'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import PhotoUploader from '@/components/PhotoUploader';
import { Badge } from '@/components/ui';
import {
  CHICKEN_PHOTO_SETUP_MESSAGE,
  processChickenPhoto,
  resolveChickenPhotoUrl,
  validateChickenPhotoFile,
} from '@/lib/chicken-photo';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';

type Props = {
  name: string;
  code?: string | null;
  imageUrl?: string | null;
  photoPath?: string | null;
  photoThumbPath?: string | null;
  pendingFile: File | null;
  pendingThumbnail: File | null;
  removed?: boolean;
  uploading?: boolean;
  uploadProgress?: number;
  uploadError?: string | null;
  canEdit?: boolean;
  onPendingChange: (files: { full: File; thumbnail: File } | null) => void;
  onRemove: () => void;
  onCancelUpload?: () => void;
  /** Reports client-side resize/thumbnail processing so forms can block submit. */
  onProcessingChange?: (processing: boolean) => void;
};

type PendingMeta = {
  name: string;
  size: number;
};

export default function ChickenPhotoField({
  name,
  code,
  imageUrl,
  photoPath,
  photoThumbPath,
  pendingFile,
  pendingThumbnail,
  removed = false,
  uploading = false,
  uploadProgress = 0,
  uploadError,
  canEdit = true,
  onPendingChange,
  onRemove,
  onCancelUpload,
  onProcessingChange,
}: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const processToken = useRef(0);
  const [localPreview, setLocalPreview] = useState('');
  const [pendingPreview, setPendingPreview] = useState('');
  const [pendingMeta, setPendingMeta] = useState<PendingMeta | null>(null);
  const [resolvedThumb, setResolvedThumb] = useState<string | null>(null);
  const [resolvedFull, setResolvedFull] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const processingChangeRef = useRef(onProcessingChange);

  useEffect(() => {
    processingChangeRef.current = onProcessingChange;
  }, [onProcessingChange]);

  useEffect(() => {
    return () => processingChangeRef.current?.(false);
  }, []);

  useEffect(() => {
    if (!localPreview) return;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreview('');
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  useEffect(() => {
    if (!pendingFile && !localPreview && !processing) {
      setPendingMeta(null);
    }
  }, [pendingFile, localPreview, processing]);

  useEffect(() => {
    if (!pendingFile && !processing && localPreview) {
      setLocalPreview('');
    }
  }, [pendingFile, processing, localPreview]);

  useEffect(() => {
    let active = true;

    if (photoThumbPath || photoPath) {
      void resolveChickenPhotoUrl(photoThumbPath || photoPath).then((url) => {
        if (active) setResolvedThumb(url);
      });
    }
    if (photoPath) {
      void resolveChickenPhotoUrl(photoPath).then((url) => {
        if (active) setResolvedFull(url);
      });
    }

    return () => {
      active = false;
    };
  }, [photoPath, photoThumbPath]);

  const pickFile = (file: File | null | undefined) => {
    if (!file) return;
    const validation = validateChickenPhotoFile(file);
    if (validation) {
      setError(validation);
      return;
    }

    const token = processToken.current + 1;
    processToken.current = token;
    setError(null);
    onPendingChange(null);
    setPendingMeta({ name: file.name, size: file.size });
    setLocalPreview(URL.createObjectURL(file));
    setProcessing(true);
    onProcessingChange?.(true);

    void processChickenPhoto(file)
      .then((processed) => {
        if (processToken.current !== token) return;
        onPendingChange({ full: processed.full, thumbnail: processed.thumbnail });
        setProcessing(false);
        onProcessingChange?.(false);
      })
      .catch((err) => {
        if (processToken.current !== token) return;
        setProcessing(false);
        onProcessingChange?.(false);
        setError(err instanceof Error ? err.message : 'The photo could not be processed.');
        setLocalPreview('');
        setPendingMeta(null);
      });
  };

  const cancelProcessing = () => {
    processToken.current += 1;
    setProcessing(false);
    onProcessingChange?.(false);
    setError(null);
    setPendingMeta(null);
    setLocalPreview('');
    onPendingChange(null);
  };

  const handleRemove = () => {
    processToken.current += 1;
    setProcessing(false);
    onProcessingChange?.(false);
    setError(null);
    setPendingMeta(null);
    setLocalPreview('');
    onPendingChange(null);
    onRemove();
  };

  const retryUpload = () => {
    setError(null);
    const form = sectionRef.current?.closest('form');
    if (form && typeof form.requestSubmit === 'function') form.requestSubmit();
  };

  const existingThumb = resolvedThumb || imageUrl || null;
  const existingFull = resolvedFull || imageUrl || null;
  const hasExisting = Boolean(photoPath || imageUrl) && !removed;
  const uploadFailed = Boolean(uploadError && uploadError !== CHICKEN_PHOTO_SETUP_MESSAGE);
  const shownError = error
    || (uploadError
      ? uploadError === CHICKEN_PHOTO_SETUP_MESSAGE
        ? CHICKEN_PHOTO_SETUP_MESSAGE
        : 'Upload failed. Please try again.'
      : null);

  const alt = useMemo(() => {
    const label = name.trim() || 'Chicken photo';
    return code ? `${label} (${formatBirdCodeForDisplay(code)})` : label;
  }, [name, code]);

  const pending = pendingFile ? {
    name: pendingMeta?.name || pendingFile.name,
    size: pendingMeta?.size ?? pendingFile.size,
  } : null;
  const showPending = Boolean(pendingFile && pendingThumbnail && pendingPreview);
  const previewSrc = localPreview
    || (showPending
      ? pendingPreview
      : hasExisting
        ? existingThumb || existingFull
        : '');
  const value = previewSrc ? {
    previewSrc,
    fullSrc: localPreview || (showPending ? pendingPreview : existingFull || existingThumb),
    fileName: processing || showPending
      ? pending?.name || 'chicken-photo.webp'
      : `${name.trim() || 'Chicken'} photo`,
    fileSize: processing || showPending ? pending?.size ?? null : null,
    statusLabel: processing ? 'Processing photo…' : showPending ? 'Ready to save' : 'Saved photo',
  } : null;

  const statusText = !canEdit
    ? 'You do not have permission to change this photo.'
    : removed
      ? 'Photo will be removed when you save.'
      : null;

  return (
    <section
      ref={sectionRef}
      className="dark:bg-muted/50 dark:border-border space-y-3 rounded-lg border border-slate-200/40 bg-slate-50/50 p-4"
      aria-labelledby="chicken-photo-heading"
      data-testid="chicken-photo-field"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4
          id="chicken-photo-heading"
          className="flex items-center gap-1.5 text-xs font-black tracking-widest text-emerald-700 uppercase dark:text-emerald-300"
        >
          <Camera className="h-3.5 w-3.5" aria-hidden="true" /> Photo
        </h4>
        <Badge variant="neutral" size="sm" aria-label="Optional field">
          Optional
        </Badge>
      </div>

      <PhotoUploader
        value={value}
        onChange={pickFile}
        onRemove={handleRemove}
        disabled={!canEdit}
        error={shownError}
        uploading={uploading}
        processing={processing}
        uploadProgress={uploadProgress}
        onCancelUpload={processing ? cancelProcessing : onCancelUpload}
        onRetry={uploadFailed && !uploading && !processing ? retryUpload : undefined}
        alt={alt}
        statusText={statusText}
        testId="chicken-photo-dropzone"
      />
    </section>
  );
}
