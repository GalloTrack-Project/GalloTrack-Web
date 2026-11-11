'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import { Modal } from '@/components/ui';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { clearChickenPhotoUrlCache, resolveChickenPhotoUrl } from '@/lib/chicken-photo';
import { thumbUrl } from '@/lib/media-format';
import { useT } from '@/lib/i18n';
import { cn } from '@/components/ui/utils';

type Props = {
  name: string;
  code?: string | null;
  imageUrl?: string | null;
  photoPath?: string | null;
  photoThumbPath?: string | null;
  size?: number;
  className?: string;
  imgClassName?: string;
  fallback?: React.ReactNode;
  interactive?: boolean;
  showLightbox?: boolean;
  eager?: boolean;
  fit?: 'cover' | 'contain';
};

export default function ChickenPhoto({
  name,
  code,
  imageUrl,
  photoPath,
  photoThumbPath,
  size = 40,
  className,
  imgClassName,
  fallback,
  interactive = true,
  showLightbox = true,
  eager = false,
  fit = 'cover',
}: Props) {
  const { t } = useT();
  const hasPhoto = Boolean(imageUrl || photoPath || photoThumbPath);
  const thumbPath = photoThumbPath || photoPath;
  const [fullSrc, setFullSrc] = useState<string | null>(null);
  const [thumbSrc, setThumbSrc] = useState<string | null>(
    thumbPath ? null : imageUrl ? thumbUrl(imageUrl, size * 2) : null,
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [thumbResolving, setThumbResolving] = useState(Boolean(thumbPath));
  const [fullResolving, setFullResolving] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  // Lists only need the thumbnail. Resolve the full image lazily for contain
  // views (details) or when the lightbox opens.
  useEffect(() => {
    let active = true;
    setFailed(false);
    setThumbSrc(null);

    if (thumbPath) {
      setThumbResolving(true);
      void resolveChickenPhotoUrl(thumbPath).then((url) => {
        if (!active) return;
        setThumbSrc(url || imageUrl || null);
        setThumbResolving(false);
      });
    } else {
      setThumbResolving(false);
      setThumbSrc(imageUrl ? thumbUrl(imageUrl, size * 2) : null);
    }

    return () => {
      active = false;
    };
  }, [thumbPath, imageUrl, size, retryNonce]);

  useEffect(() => {
    if (!(fit === 'contain' || lightboxOpen)) return;
    if (fullSrc) return;

    let active = true;
    const path = photoPath || thumbPath;
    if (path) {
      setFullResolving(true);
      void resolveChickenPhotoUrl(path).then((url) => {
        if (!active) return;
        setFullSrc(url || imageUrl || null);
        setFullResolving(false);
      });
    } else {
      setFullSrc(imageUrl || null);
    }

    return () => {
      active = false;
    };
  }, [fit, lightboxOpen, fullSrc, photoPath, thumbPath, imageUrl, retryNonce]);

  const alt = code ? `${name} (${formatBirdCodeForDisplay(code)})` : name;
  const displaySrc = fit === 'contain' ? fullSrc || thumbSrc : thumbSrc;
  const resolving = thumbResolving || ((fit === 'contain' || lightboxOpen) && fullResolving);
  const unavailable = hasPhoto && (failed || (!displaySrc && !resolving));
  const loading = hasPhoto && !displaySrc && !unavailable;
  const placeholder = fallback ?? (
    <ChickenIcon className="text-muted-foreground h-1/2 w-1/2" />
  );
  const canInteract = interactive && showLightbox && Boolean(displaySrc) && !unavailable;

  const retry = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    clearChickenPhotoUrlCache();
    setFailed(false);
    setFullSrc(null);
    setThumbSrc(null);
    setRetryNonce((value) => value + 1);
  };

  const openLightbox = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    if (!canInteract) return;
    if ('currentTarget' in event && event.currentTarget instanceof HTMLElement) {
      event.currentTarget.focus();
    }
    setLightboxOpen(true);
  };

  const frameClass = cn(
    'flex h-full w-full items-center justify-center overflow-hidden text-center',
    className,
  );
  const frameStyle = { width: size, height: size };

  const body = !hasPhoto ? (
    <span className={frameClass} style={frameStyle}>
      {placeholder}
    </span>
  ) : unavailable ? (
    size >= 80 ? (
      <span className={cn(frameClass, 'flex-col gap-1 border border-border bg-muted/40 p-1')} style={frameStyle}>
        <span className="text-[10px] leading-tight font-bold break-words text-muted-foreground">
          {t('registry.cardPhotoUnavailable')}
        </span>
        <button
          type="button"
          onClick={retry}
          aria-label={t('registry.retryPhoto')}
          className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md border border-border bg-background px-1.5 text-[10px] font-black tracking-wide text-foreground uppercase transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          {t('registry.retryPhoto')}
        </button>
      </span>
    ) : (
      <span className={cn(frameClass, 'border border-border bg-muted/40')} style={frameStyle}>
        <button
          type="button"
          onClick={retry}
          aria-label={`${t('registry.cardPhotoUnavailable')}. ${t('registry.retryPhoto')}`}
          title={`${t('registry.cardPhotoUnavailable')}. ${t('registry.retryPhoto')}`}
          className="flex h-full w-full cursor-pointer items-center justify-center text-warning focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          <AlertTriangle className="h-1/2 w-1/2" aria-hidden="true" />
        </button>
      </span>
    )
  ) : loading ? (
    <span className={frameClass} style={frameStyle}>
      <span
        role="status"
        aria-label={t('registry.cardPhotoUnavailable')}
        className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-muted-foreground"
      />
    </span>
  ) : (
    <span
      role={canInteract ? 'button' : undefined}
      tabIndex={canInteract ? 0 : undefined}
      aria-label={canInteract ? `View photo of ${alt}` : undefined}
      onClick={canInteract ? openLightbox : (event) => event.stopPropagation()}
      onKeyDown={
        canInteract
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openLightbox(event);
              }
            }
          : undefined
      }
      className={cn(
        'block shrink-0 overflow-hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70',
        canInteract && 'cursor-zoom-in',
        className,
      )}
      style={frameStyle}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc ?? undefined}
        alt={alt}
        width={size}
        height={size}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={cn('h-full w-full', fit === 'contain' ? 'object-contain' : 'object-cover', imgClassName)}
        style={fit === 'cover' ? { objectPosition: '50% 30%' } : undefined}
        onError={() => setFailed(true)}
      />
    </span>
  );

  const lightboxSrc = fullSrc || thumbSrc;

  return (
    <>
      {body}
      {lightboxOpen && hasPhoto && (
        <Modal
          open
          onClose={() => setLightboxOpen(false)}
          title={alt}
          description="Chicken photo"
          className="max-w-4xl"
        >
          <div className="bg-muted/40 flex max-h-[80vh] items-center justify-center overflow-hidden rounded-lg p-2">
            {lightboxSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={lightboxSrc}
                alt={alt}
                className="max-h-[76vh] w-auto max-w-full object-contain"
              />
            ) : (
              <span className="flex h-40 items-center justify-center">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-muted-foreground" />
              </span>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

