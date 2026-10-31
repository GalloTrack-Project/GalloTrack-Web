'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { HERO_IMAGES, type HeroImageConfig } from '@/lib/hero-config';

interface HeroCarouselProps {
  images?: HeroImageConfig[];
  autoPlayIntervalMs?: number;
  className?: string;
  showThumbnails?: boolean;
  showCaption?: boolean;
}

export function HeroCarousel({
  images = HERO_IMAGES,
  autoPlayIntervalMs = 6000,
  className = '',
  showThumbnails = true,
  showCaption = true,
}: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Optional subtle autoplay, paused on hover
  useEffect(() => {
    if (images.length <= 1 || isPaused || autoPlayIntervalMs <= 0) return;
    const timer = setInterval(nextSlide, autoPlayIntervalMs);
    return () => clearInterval(timer);
  }, [images.length, isPaused, autoPlayIntervalMs, nextSlide]);

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const activeImage = images[activeIndex] || images[0];

  return (
    <section
      aria-label="Farm showcase gallery"
      className={`flex flex-col gap-3 w-full ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Primary viewport with strict 4/3 aspect ratio to prevent layout shift */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-emerald-500/30 bg-muted/40 shadow-xl shadow-black/20 dark:shadow-black/50 group">
        {images.map((img, idx) => {
          const isActive = idx === activeIndex;
          const isErrored = failedImages[img.id];

          return (
            <div
              key={img.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
              aria-hidden={!isActive}
            >
              {isErrored ? (
                // Fallback UI when image cannot be loaded
                <div
                  data-testid={`hero-fallback-${img.id}`}
                  className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/60 text-muted-foreground p-6 text-center"
                >
                  <svg
                    className="w-16 h-16 text-emerald-500/60 mb-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                    />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider text-card-foreground">
                    {img.alt}
                  </span>
                  <span className="text-[10px] mt-1 text-muted-foreground">
                    Image preview unavailable
                  </span>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                    priority={idx === 0}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    className="object-cover object-center select-none"
                    onError={() => handleImageError(img.id)}
                  />
                  {/* Subtle lighting gradient overlay for theme integration & legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                </div>
              )}
            </div>
          );
        })}

        {/* Carousel overlay badges & caption */}
        {showCaption && activeImage && (
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between gap-2 pointer-events-none">
            <div className="bg-black/65 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 max-w-[80%]">
              <p className="text-[11px] font-bold text-white tracking-wide truncate">
                {activeImage.alt}
              </p>
              {activeImage.credit && activeImage.credit.trim().length > 0 && (
                <p className="text-[9px] text-white/70 font-medium tracking-wide">
                  Photo: {activeImage.credit}
                </p>
              )}
            </div>

            {/* Slide indicator pill */}
            <div className="bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono font-bold text-emerald-400">
              {activeIndex + 1} / {images.length}
            </div>
          </div>
        )}

        {/* Navigation arrows (shown when more than 1 image exists) */}
        {images.length > 1 && (
          <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 hover:bg-emerald-600 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 transition-all cursor-pointer shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 hover:bg-emerald-600 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 transition-all cursor-pointer shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Thumbnail Strip */}
      {showThumbnails && images.length > 1 && (
        <div
          role="tablist"
          aria-label="Farm gallery thumbnails"
          className="flex items-center gap-2.5 overflow-x-auto py-1 px-0.5"
        >
          {images.map((img, idx) => {
            const isCurrent = idx === activeIndex;
            return (
              <button
                key={`thumb-${img.id}`}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-label={`View ${img.alt}`}
                onClick={() => setActiveIndex(idx)}
                className={`relative aspect-[4/3] w-20 sm:w-24 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'border-emerald-500 ring-2 ring-emerald-500/40 scale-[1.03] shadow-md shadow-emerald-500/20'
                    : 'border-border/60 hover:border-emerald-500/50 opacity-70 hover:opacity-100'
                }`}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="96px"
                  className="object-cover object-center select-none"
                />
                {isCurrent && (
                  <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default HeroCarousel;
