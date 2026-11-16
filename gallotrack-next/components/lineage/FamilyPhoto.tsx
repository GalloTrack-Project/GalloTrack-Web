'use client';

import React, { useEffect, useRef, useState } from 'react';
import ChickenPhoto from '@/components/ChickenPhoto';
import { useT } from '@/lib/i18n';
import { cn } from '@/components/ui/utils';
import type { FowlRecord } from '@/lib/types';

type FamilyPhotoProps = {
  fowl: Pick<FowlRecord, 'id' | 'name' | 'bird_code' | 'chicken_code' | 'birth_code' | 'image_url' | 'photo_path' | 'photo_thumb_path'> & {
    code?: string | null;
  };
  size: number;
  shape?: 'square' | 'round';
  className?: string;
  onViewProfile?: () => void;
};

function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

/**
 * Lazy family avatar: keeps the shared ChickenPhoto thumbnail logic, but only
 * mounts it when the row is near the viewport. The fixed placeholder keeps the
 * table/card layout stable before the resolver and image run.
 */
export default function FamilyPhoto({
  fowl,
  size,
  shape = 'round',
  className,
  onViewProfile,
}: FamilyPhotoProps) {
  const t = useT();
  const holderRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const node = holderRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '160px 0px', threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  const radius = shape === 'square' ? 'rounded-lg' : 'rounded-full';
  const frame = cn(
    'flex shrink-0 items-center justify-center border border-border bg-muted/40',
    radius,
    className,
  );

  if (!visible) {
    return (
      <span
        ref={holderRef}
        aria-hidden="true"
        className={cn(frame, 'font-mono text-[10px] font-black text-muted-foreground select-none')}
        style={{ width: size, height: size }}
      >
        {initialsOf(fowl.name)}
      </span>
    );
  }

  const code =
    fowl.code ||
    fowl.bird_code ||
    fowl.chicken_code ||
    fowl.birth_code ||
    '';

  return (
    <span ref={holderRef} className="inline-flex shrink-0" style={{ width: size, height: size }}>
      <ChickenPhoto
        name={fowl.name}
        code={code}
        imageUrl={fowl.image_url}
        photoPath={fowl.photo_path}
        photoThumbPath={fowl.photo_thumb_path}
        size={size}
        shape={shape}
        fit="cover"
        className={frame}
        imgAlt={`Photo of ${fowl.name}`}
        photoAriaLabel={t('registry.viewPhotoOf', { name: fowl.name })}
        onViewProfile={onViewProfile}
        viewProfileLabel={t('registry.viewProfile')}
        fallback={
          <span
            title={t('registry.noPhoto')}
            className="flex h-full w-full items-center justify-center font-mono text-[10px] font-black text-muted-foreground select-none"
          >
            {initialsOf(fowl.name)}
          </span>
        }
      />
    </span>
  );
}
