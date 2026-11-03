'use client';

import React, { useEffect, useRef, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import ChickenPhoto from '@/components/ChickenPhoto';
import {
  CHICKEN_PHOTO_SETUP_MESSAGE,
  processChickenPhoto,
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
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [pendingPreview, setPendingPreview] = useState('');
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<ChickenPhotoCrop | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  const resetCrop = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl('');
    setSourceFile(null);
    setArea(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
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

  const hasExisting = Boolean(photoPath || imageUrl) && !removed;
  const previewSrc = sourceUrl || pendingPreview;
  const canUpload = canEdit && !uploading;
  const shownError = error || (uploadError
    ? (uploadError === CHICKEN_PHOTO_SETUP_MESSAGE ? CHICKEN_PHOTO_SETUP_MESSAGE : uploadError)
    : null);

  return (
    <section
      className="dark:bg-muted/50 dark:border-border space-y-3 rounded-lg border border-slate-200/40 bg-slate-50/50 p-4"
      aria-labelledby="chicken-photo-heading"
      data-testid="chicken-photo-field"
    >
      <div className="flex items-center justify-between gap-2">
        <h4
          id="chicken-photo-heading"
          className="flex items-center gap-1 border-b pb-1 text-xs font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-300"
        >
          <Camera className="h-3.5 w-3.5" /> Photo
        </h4>
        {photoPath || imageUrl ? (
          <span className="text-muted-foreground text-[10px] font-bold uppercase">
            Square preview
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className="border-border relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border bg-white shadow-inner dark:bg-card"
          onDragOver={(event) => {
            if (canUpload) event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!canUpload) return;
            pickFile(event.dataTransfer.files?.[0]);
          }}
          data-testid="chicken-photo-dropzone"
        >
          {sourceFile ? (
            <div className="absolute inset-0">
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
          ) : previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt={`Preview of ${name}`} className="h-full w-full object-cover" />
          ) : hasExisting ? (
            <ChickenPhoto
              name={name}
              code={code}
              imageUrl={imageUrl}
              photoPath={photoPath}
              photoThumbPath={photoThumbPath}
              size={128}
              className="h-full w-full rounded-none"
              fallback={<ImagePlus className="text-muted-foreground h-8 w-8" />}
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-1.5 text-center text-xs font-bold">
              <ImagePlus className="h-7 w-7" />
              <span>No photo</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-muted-foreground text-xs font-semibold">
            JPG, PNG or WebP · max 5 MB. Photos are resized to 1600px and saved with a 256px
            thumbnail.
          </p>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              {sourceFile ? (
                <>
                  <button
                    type="button"
                    onClick={() => void applyCrop()}
                    disabled={processing}
                    className="focus-visible:ring-ring inline-flex h-10 cursor-pointer items-center rounded-md bg-emerald-600 px-3 text-xs font-black text-white transition-colors hover:bg-emerald-700 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processing ? 'Processing…' : 'Use photo'}
                  </button>
                  <button
                    type="button"
                    onClick={resetCrop}
                    disabled={processing}
                    className="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring inline-flex h-10 cursor-pointer items-center rounded-md border px-3 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                  >
                    Cancel crop
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={!canUpload}
                    aria-label={hasExisting ? `Replace photo for ${name}` : `Upload photo for ${name}`}
                    className="focus-visible:ring-ring inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-black text-white transition-colors hover:bg-emerald-700 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {hasExisting ? 'Replace' : 'Upload photo'}
                  </button>
                  {hasExisting ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        onRemove();
                      }}
                      disabled={!canUpload}
                      aria-label={`Remove photo for ${name}`}
                      className="border-border bg-card text-danger hover:bg-muted focus-visible:ring-ring inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs font-semibold">
              You do not have permission to change this photo.
            </p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label={`Choose a photo for ${name}`}
            onChange={(event) => {
              pickFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />

          {(uploading || processing) && (
            <div className="space-y-1">
              <div
                className="bg-muted h-2 overflow-hidden rounded-full"
                role="progressbar"
                aria-label="Photo upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploading ? Math.round(uploadProgress) : 0}
              >
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${uploading ? Math.max(4, uploadProgress) : 8}%` }}
                />
              </div>
              <p className="text-muted-foreground text-[11px] font-bold">
                {uploading ? `Uploading photo… ${Math.round(uploadProgress)}%` : 'Processing photo…'}
              </p>
            </div>
          )}

          {pendingFile && pendingThumbnail && !uploading ? (
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              New photo ready. Save the chicken to finish.
            </p>
          ) : null}

          {removed ? (
            <p className="text-muted-foreground text-xs font-bold">
              Photo will be removed when you save.
            </p>
          ) : null}

          {shownError ? (
            <p role="alert" className="text-danger text-xs font-bold">
              {shownError}
            </p>
          ) : null}
          {code ? (
            <p className="text-muted-foreground text-[11px] font-semibold">
              Alt text: {name} ({formatBirdCodeForDisplay(code)})
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
