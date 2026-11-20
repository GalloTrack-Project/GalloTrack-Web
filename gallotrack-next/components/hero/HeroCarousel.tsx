'use client';

import React, { useCallback, useEffect, useState, type FocusEvent } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { useT } from '@/lib/i18n';
import { HERO_IMAGES, type HeroImageConfig } from '@/lib/hero-config';

interface HeroCarouselProps {
  images?: HeroImageConfig[];
  autoPlayIntervalMs?: number;
  className?: string;
}

export function HeroCarousel({
  images = HERO_IMAGES,
  autoPlayIntervalMs = 6000,
  className = '',
}: HeroCarouselProps) {
  const t = useT();
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const nextSlide = useCallback(() => {
    setActiveIndex((previous) => (previous + 1) % images.length);
  }, [images.length]);

  const previousSlide = useCallback(() => {
    setActiveIndex((previous) => (previous - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(media.matches);
    const handleChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    if (images.length <= 1 || isPaused || interactionPaused || reduceMotion || autoPlayIntervalMs <= 0) {
      return;
    }
    const timer = window.setInterval(nextSlide, autoPlayIntervalMs);
    return () => window.clearInterval(timer);
  }, [autoPlayIntervalMs, images.length, interactionPaused, isPaused, nextSlide, reduceMotion]);

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setInteractionPaused(false);
    }
  };

  if (images.length === 0) return null;

  const activeImage = images[activeIndex] || images[0];
  const hasMultipleImages = images.length > 1;
  const isGalleryPaused = isPaused || reduceMotion;

  return (
    <section
      aria-label={t('landing.heroGallery')}
      className={`w-full min-w-0 ${className}`}
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={handleBlur}
    >
      <div className="border-white/80 shadow-primary/15 dark:border-white/30 relative aspect-[4/3] w-full overflow-hidden rounded-3xl border-2 shadow-2xl">
        {images.map((image, index) => {
          const isActive = index === activeIndex;
          const failed = failedImages[image.id];

          return (
            <div
              key={image.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${
                isActive ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
              }`}
            >
              {failed ? (
                <div
                  data-testid={`hero-fallback-${image.id}`}
                  className="from-primary/10 via-accent-soft to-brand-orange/25 flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-br p-6 text-center"
                >
                  <span className="bg-background ring-border inline-flex h-16 w-16 items-center justify-center rounded-2xl p-2 shadow-md ring-1">
                    <Logo variant="mark" size="lg" />
                  </span>
                  <span className="text-foreground text-sm font-bold break-words">
                    {t('landing.photoUnavailable')}
                  </span>
                </div>
              ) : (
                <div className="relative h-full w-full">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 90vw, 560px"
                    className="object-cover object-center select-none"
                    onError={() =>
                      setFailedImages((previous) => ({ ...previous, [image.id]: true }))
                    }
                  />
                  <div className="from-sidebar/55 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
                </div>
              )}
            </div>
          );
        })}

        <div className="absolute inset-x-3 bottom-3 z-30 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="bg-sidebar/90 text-sidebar-foreground max-w-full rounded-xl px-3 py-2 shadow-lg backdrop-blur-sm">
            <p className="text-xs leading-snug font-bold break-words sm:text-sm">
              {activeImage.caption}
            </p>
          </div>

          {hasMultipleImages && (
            <div className="bg-sidebar/90 text-sidebar-foreground flex shrink-0 flex-wrap items-center gap-1 rounded-xl p-1 shadow-lg backdrop-blur-sm">
              <button
                type="button"
                onClick={previousSlide}
                aria-label={t('landing.photoPrevious')}
                className="hover:bg-sidebar-active focus-visible:ring-sidebar-foreground inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>

              <div
                role="tablist"
                aria-label={t('landing.heroGallery')}
                className="flex items-center"
              >
                {images.map((image, index) => {
                  const isCurrent = index === activeIndex;
                  return (
                    <button
                      key={`dot-${image.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      aria-label={t('landing.photoShow', {
                        index: index + 1,
                        caption: image.caption,
                      })}
                      tabIndex={isCurrent ? 0 : -1}
                      onClick={() => setActiveIndex(index)}
                      className="focus-visible:ring-sidebar-foreground inline-flex h-11 w-6 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span
                        className={`block h-2.5 w-2.5 rounded-full border border-white/70 transition-colors motion-reduce:transition-none ${
                          isCurrent ? 'bg-white' : 'bg-transparent'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={nextSlide}
                aria-label={t('landing.photoNext')}
                className="hover:bg-sidebar-active focus-visible:ring-sidebar-foreground inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setIsPaused((previous) => !previous)}
                aria-label={isGalleryPaused ? t('landing.photoPlay') : t('landing.photoPause')}
                className="hover:bg-sidebar-active focus-visible:ring-sidebar-foreground inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
              >
                {isGalleryPaused ? (
                  <Play className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Pause className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default HeroCarousel;
