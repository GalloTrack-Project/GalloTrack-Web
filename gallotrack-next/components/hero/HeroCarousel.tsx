'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type TouchEvent,
} from 'react';
import Image from 'next/image';
import { Camera, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { useT } from '@/lib/i18n';
import { HERO_SLIDES, type HeroSlide } from '@/lib/hero-slides';

interface HeroCarouselProps {
  slides?: HeroSlide[];
  autoPlayIntervalMs?: number;
  className?: string;
}

export function HeroCarousel({
  slides = HERO_SLIDES,
  autoPlayIntervalMs = 5000,
  className = '',
}: HeroCarouselProps) {
  const t = useT();
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setActiveIndex((previous) => (previous + 1) % slides.length);
  }, [slides.length]);

  const previousSlide = useCallback(() => {
    setActiveIndex((previous) => (previous - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(media.matches);
    const handleChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    if (
      slides.length <= 1 ||
      isPaused ||
      interactionPaused ||
      reduceMotion ||
      autoPlayIntervalMs <= 0
    ) {
      return;
    }
    const timer = window.setInterval(nextSlide, autoPlayIntervalMs);
    return () => window.clearInterval(timer);
  }, [autoPlayIntervalMs, slides.length, interactionPaused, isPaused, nextSlide, reduceMotion]);

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setInteractionPaused(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      previousSlide();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nextSlide();
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) previousSlide();
    else nextSlide();
  };

  if (slides.length === 0) return null;

  const activeSlide = slides[activeIndex] || slides[0];
  const hasMultipleSlides = slides.length > 1;
  const isGalleryPaused = isPaused || reduceMotion;
  const activeCaption = t(activeSlide.captionKey);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('landing.heroGallery')}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`w-full min-w-0 ${className}`}
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={handleBlur}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border-[6px] border-white bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          const failed = failedImages[slide.id];

          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${slides.length}`}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-[400ms] motion-reduce:transition-none ${
                isActive ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
              }`}
            >
              {failed ? (
                <div
                  data-testid={`hero-fallback-${slide.id}`}
                  className="from-primary/10 via-accent-soft to-brand-orange/25 flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-br p-6 pb-24 text-center"
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
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    draggable={false}
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 90vw, 560px"
                    className="object-cover select-none"
                    style={{ objectPosition: slide.objectPosition ?? 'center 35%' }}
                    onError={() =>
                      setFailedImages((previous) => ({ ...previous, [slide.id]: true }))
                    }
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                </div>
              )}
            </div>
          );
        })}

        <div className="absolute inset-x-3 bottom-3 z-30 flex flex-wrap items-end justify-between gap-2">
          <div
            aria-live="polite"
            className="max-w-full rounded-full bg-black/55 px-3.5 py-2 shadow-lg backdrop-blur-md"
          >
            <p
              key={activeIndex}
              className="flex min-w-0 items-center gap-2 text-xs leading-snug font-semibold text-white sm:text-sm"
              style={{ animation: 'fadeIn 250ms ease-out' }}
            >
              <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{activeCaption}</span>
            </p>
          </div>

          {hasMultipleSlides && (
            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-0.5 rounded-full bg-black/55 p-1 text-white shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={previousSlide}
                onKeyDown={handleKeyDown}
                aria-label={t('landing.photoPrevious')}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none motion-reduce:transition-none"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>

              <div
                role="tablist"
                aria-label={t('landing.heroGallery')}
                className="flex items-center"
              >
                {slides.map((slide, index) => {
                  const isCurrent = index === activeIndex;
                  const caption = t(slide.captionKey);
                  return (
                    <button
                      key={`dot-${slide.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      aria-label={t('landing.photoShow', {
                        index: index + 1,
                        caption,
                      })}
                      tabIndex={isCurrent ? 0 : -1}
                      onClick={() => setActiveIndex(index)}
                      onKeyDown={handleKeyDown}
                      className="inline-flex h-11 w-6 cursor-pointer items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    >
                      <span
                        className={`block h-2.5 w-2.5 rounded-full border border-white/70 transition-colors motion-reduce:transition-none ${
                          isCurrent ? 'bg-[#C8102E]' : 'bg-white'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={nextSlide}
                onKeyDown={handleKeyDown}
                aria-label={t('landing.photoNext')}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none motion-reduce:transition-none"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setIsPaused((previous) => !previous)}
                onKeyDown={handleKeyDown}
                aria-label={isGalleryPaused ? t('landing.photoPlay') : t('landing.photoPause')}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none motion-reduce:transition-none"
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
