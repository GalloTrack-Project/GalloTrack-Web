'use client';

import React, { useId, useRef, useState } from 'react';
import {
  CircleAlert,
  ImagePlus,
  Maximize2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { Button, Modal, Spinner, cn } from '@/components/ui';

export type PhotoUploaderValue = {
  previewSrc: string;
  fullSrc?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  statusLabel?: string | null;
};

type Props = {
  value: PhotoUploaderValue | null;
  onChange: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
  error?: string | null;
  uploading?: boolean;
  uploadProgress?: number;
  onCancelUpload?: () => void;
  onRetry?: () => void;
  alt: string;
  statusText?: string | null;
  testId?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.max(1, Math.round(bytes))} B`;
}

function imageFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;

  const file = Array.from(data.files ?? []).find((item) => item.type.startsWith('image/'));
  if (file) return file;

  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      return item.getAsFile();
    }
  }
  return null;
}

export default function PhotoUploader({
  value,
  onChange,
  onRemove,
  disabled = false,
  error,
  uploading = false,
  uploadProgress = 0,
  onCancelUpload,
  onRetry,
  alt,
  statusText,
  testId,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragDepth = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const progress = Math.max(0, Math.min(100, Math.round(uploadProgress)));
  const canInteract = !disabled && !uploading;
  const hasValue = Boolean(value?.previewSrc);

  const openPicker = () => {
    if (!canInteract) return;
    inputRef.current?.click();
  };

  const acceptFile = (file: File | null | undefined) => {
    if (!file || !canInteract) return;
    setConfirmRemove(false);
    onChange(file);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!canInteract) return;
    dragDepth.current += 1;
    setDragActive(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!canInteract) return;
    event.dataTransfer.dropEffect = 'copy';
    if (!dragActive) setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!canInteract) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (!canInteract) return;
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!canInteract) return;
    const file = imageFromClipboard(event.clipboardData);
    if (!file) return;
    event.preventDefault();
    acceptFile(file);
  };

  return (
    <div className="space-y-2.5">
      <div
        role="group"
        aria-label="Photo upload"
        data-testid={testId}
        className={cn(
          'relative overflow-hidden rounded-lg border-2 transition-colors duration-150',
          dragActive
            ? 'border-dashed border-emerald-600 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/40'
            : hasValue
              ? 'border-solid border-slate-300 bg-card dark:border-border dark:bg-card'
              : 'border-dashed border-slate-300 bg-slate-50/70 hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-border dark:bg-muted/30 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20',
          error && !dragActive && 'border-rose-300 dark:border-rose-800',
          disabled && 'cursor-not-allowed opacity-70',
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        data-drag-active={dragActive ? 'true' : undefined}
      >
        {hasValue && value ? (
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={`View larger photo of ${alt}`}
              className="group relative h-24 w-24 shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-border bg-muted focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value.previewSrc} alt={alt} className="h-full w-full object-cover" />
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100"
              >
                <Maximize2 className="h-5 w-5 drop-shadow" />
              </span>
              {uploading ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white">
                  <Spinner className="h-5 w-5" />
                  <span className="text-xs font-bold tabular-nums">{progress}%</span>
                </span>
              ) : null}
            </button>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-bold text-foreground">
                {value.fileName || 'Photo'}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium text-muted-foreground">
                {typeof value.fileSize === 'number' ? (
                  <span>{formatFileSize(value.fileSize)}</span>
                ) : null}
                {value.statusLabel ? <span>{value.statusLabel}</span> : null}
              </div>

              {canInteract ? (
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <Button
                    variant="secondary"
                    className="h-11 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    onClick={openPicker}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Replace
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 text-danger hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    onClick={() => setConfirmRemove(true)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              ) : null}

              {confirmRemove ? (
                <div
                  role="group"
                  aria-label="Confirm photo removal"
                  className="mt-1 flex flex-col gap-2 rounded-md border border-rose-200 bg-rose-50 p-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-rose-900/60 dark:bg-rose-950/40"
                >
                  <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                    Remove this photo?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      className="h-11 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                      onClick={() => {
                        setConfirmRemove(false);
                        onRemove();
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-11 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                      onClick={() => setConfirmRemove(false)}
                    >
                      Keep
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            disabled={!canInteract}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className="flex min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[inherit] px-4 py-7 text-center transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed"
          >
            <span
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
            >
              <ImagePlus className="h-6 w-6" />
            </span>
            <span className="text-sm font-bold text-foreground">
              {dragActive ? 'Drop photo to upload' : 'Click to upload or drag and drop'}
            </span>
            <span id={hintId} className="text-sm font-medium text-muted-foreground">
              JPG, PNG or WebP, up to 5 MB
            </span>
          </button>
        )}

        {dragActive ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-[inherit] bg-emerald-50/95 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-200"
          >
            <UploadCloud className="h-8 w-8" />
            <p className="text-sm font-bold">Drop photo to upload</p>
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={`Choose a photo for ${alt}`}
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          acceptFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {uploading ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-foreground">
            <span aria-live="polite">Uploading photo… {progress}%</span>
            {onCancelUpload ? (
              <button
                type="button"
                onClick={onCancelUpload}
                className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-bold text-danger underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Cancel
              </button>
            ) : null}
          </div>
          <div
            role="progressbar"
            aria-label="Photo upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>
        </div>
      ) : null}

      {statusText ? (
        <p aria-live="polite" className="text-sm font-semibold text-muted-foreground">
          {statusText}
        </p>
      ) : null}

      {error ? (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-danger dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-2">
            <p>{error}</p>
            {onRetry ? (
              <Button
                variant="secondary"
                className="h-11 border-rose-200 bg-white text-danger hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-rose-900 dark:bg-card dark:text-rose-200 dark:hover:bg-rose-950/60"
                onClick={onRetry}
                disabled={!canInteract}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {lightboxOpen && value?.previewSrc ? (
        <Modal
          open
          onClose={() => setLightboxOpen(false)}
          title={alt}
          description="Photo preview"
          className="max-w-4xl"
        >
          <div className="bg-muted/40 flex max-h-[80vh] items-center justify-center overflow-hidden rounded-lg p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.fullSrc || value.previewSrc}
              alt={alt}
              className="max-h-[76vh] w-auto max-w-full object-contain"
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
