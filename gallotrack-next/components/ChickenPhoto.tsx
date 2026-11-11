'use client';

import React, { useEffect, useState } from 'react';
import ChickenIcon from '@/components/ChickenIcon';
import { Modal } from '@/components/ui';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { resolveChickenPhotoUrl } from '@/lib/chicken-photo';
import { thumbUrl } from '@/lib/media-format';
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
  const [fullSrc, setFullSrc] = useState<string | null>(photoPath ? null : imageUrl || null);
  const [thumbSrc, setThumbSrc] = useState<string | null>(
    photoThumbPath || photoPath ? null : imageUrl ? thumbUrl(imageUrl, size * 2) : null,
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);

    if (photoPath) {
      resolveChickenPhotoUrl(photoPath).then((url) => {
        if (active) setFullSrc(url);
      });
    } else {
      setFullSrc(imageUrl || null);
    }

    const thumbPath = photoThumbPath || photoPath;
    if (thumbPath) {
      resolveChickenPhotoUrl(thumbPath).then((url) => {
        if (active) setThumbSrc(url || imageUrl || null);
      });
    } else {
      setThumbSrc(imageUrl ? thumbUrl(imageUrl, size * 2) : null);
    }

    return () => {
      active = false;
    };
  }, [photoPath, photoThumbPath, imageUrl, size]);

  const alt = code ? `${name} (${formatBirdCodeForDisplay(code)})` : name;
  const displaySrc = fit === 'contain' ? fullSrc || thumbSrc : thumbSrc;
  const placeholder = fallback ?? (
    <ChickenIcon className="text-muted-foreground h-1/2 w-1/2" />
  );
  const canInteract = interactive && showLightbox && Boolean(thumbSrc || fullSrc) && !failed;

  const openLightbox = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    if (!canInteract) return;
    if ('currentTarget' in event && event.currentTarget instanceof HTMLElement) {
      event.currentTarget.focus();
    }
    setLightboxOpen(true);
  };

  const body = !displaySrc || failed ? (
    <span
      className={cn(
        'flex h-full w-full items-center justify-center overflow-hidden',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {placeholder}
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
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt={alt}
        width={size}
        height={size}
        loading={eager ? 'eager' : 'lazy'}
        className={cn('h-full w-full', fit === 'contain' ? 'object-contain' : 'object-cover', imgClassName)}
        style={fit === 'cover' ? { objectPosition: '50% 30%' } : undefined}
        onError={() => setFailed(true)}
      />
    </span>
  );

  return (
    <>
      {body}
      {lightboxOpen && fullSrc && (
        <Modal
          open
          onClose={() => setLightboxOpen(false)}
          title={alt}
          description="Chicken photo"
          className="max-w-4xl"
        >
          <div className="bg-muted/40 flex max-h-[80vh] items-center justify-center overflow-hidden rounded-lg p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullSrc}
              alt={alt}
              className="max-h-[76vh] w-auto max-w-full object-contain"
            />
          </div>
        </Modal>
      )}
    </>
  );
}
