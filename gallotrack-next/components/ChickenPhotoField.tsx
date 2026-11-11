'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Camera, CircleAlert } from 'lucide-react';
import PhotoUploader from '@/components/PhotoUploader';
import { Badge, Button } from '@/components/ui';
import {
  CHICKEN_PHOTO_SETUP_MESSAGE,
  processChickenPhoto,
  resolveChickenPhotoUrl,
  validateChickenPhotoFile,
  type ChickenPhotoCrop,
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
}: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [pendingPreview, setPendingPreview] = useState('');
  const [pendingMeta, setPendingMeta] = useState<PendingMeta | null>(null);
  const [resolvedThumb, setResolvedThumb] = useState<string | null>(null);
  const [resolvedFull, setResolvedFull] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<ChickenPhotoCrop | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreview('');
      setPendingMeta(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

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

  const resetCrop = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl('');
    setSourceFile(null);
    setArea(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const cancelCrop = () => {
    resetCrop();
    setPendingMeta(null);
    setError(null);
  };

  const pickFile = (file: File | null | undefined) => {
    if (!file) return;
    const validation = validateChickenPhotoFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    resetCrop();
    setPendingMeta({ name: file.name, size: file.size });
    const url = URL.createObjectURL(file);
    setSourceFile(file);
    setSourceUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
  };

  const applyCrop = async () => {
    if (!sourceFile) return;
    setProcessing(true);
    setError(null);
    try {
      const processed = await processChickenPhoto(sourceFile, area);
      onPendingChange({ full: processed.full, thumbnail: processed.thumbnail });
      resetCrop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The photo could not be processed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = () => {
    setError(null);
    setPendingMeta(null);
    resetCrop();
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
  const previewSrc = showPending
    ? pendingPreview
    : hasExisting
      ? existingThumb || existingFull
      : null;
  const value = previewSrc ? {
    previewSrc,
    fullSrc: showPending ? pendingPreview : existingFull || existingThumb,
    fileName: showPending
      ? pending?.name || 'chicken-photo.webp'
      : `${name.trim() || 'Chicken'} photo`,
    fileSize: showPending ? pending?.size ?? null : null,
    statusLabel: showPending ? 'Ready to save' : 'Saved photo',
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

      {sourceFile ? (
        <div className="space-y-3" data-testid="chicken-photo-crop">
          <div className="relative mx-auto h-48 w-full max-w-xs overflow-hidden rounded-md bg-slate-900 sm:h-56">
            <Cropper
              image={sourceUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area: Area, pixels: Area) =>
                setArea({ x: pixels.x, y: pixels.y, width: pixels.width, height: pixels.height })
              }
            />
          </div>
          <p className="text-center text-sm font-medium text-muted-foreground">
            Drag to reposition. Use the slider to zoom.
          </p>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Photo zoom"
            className="w-full cursor-pointer accent-emerald-600"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void applyCrop()}
              loading={processing}
              disabled={processing}
              className="h-11 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Use photo
            </Button>
            <Button
              variant="secondary"
              onClick={cancelCrop}
              disabled={processing}
              className="h-11 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Cancel crop
            </Button>
          </div>

          {processing ? (
            <div className="space-y-1.5">
              <p aria-live="polite" className="text-sm font-semibold text-muted-foreground">
                Processing photo…
              </p>
              <div
                role="progressbar"
                aria-label="Photo processing progress"
                aria-valuetext="Processing photo"
                className="bg-muted h-2 overflow-hidden rounded-full"
              >
                <div className="h-full w-1/3 animate-pulse rounded-full bg-emerald-600" />
              </div>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              aria-live="assertive"
              className="text-danger flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <PhotoUploader
          value={value}
          onChange={pickFile}
          onRemove={handleRemove}
          disabled={!canEdit}
          error={shownError}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onCancelUpload={onCancelUpload}
          onRetry={uploadFailed && !uploading ? retryUpload : undefined}
          alt={alt}
          statusText={statusText}
          testId="chicken-photo-dropzone"
        />
      )}
    </section>
  );
}
