'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, PlusCircle } from 'lucide-react';
import { HERO_IMAGES } from '@/lib/hero-config';
import { useT } from '@/lib/i18n';
import RoosterHeadSilhouette from './RoosterHeadSilhouette';

export default function CtaBanner() {
  const t = useT();
  const bannerRef = useRef<HTMLElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(
    () => typeof window !== 'undefined' && !('IntersectionObserver' in window),
  );
  const farmImage = HERO_IMAGES.find((image) => image.id === 'farm-2') ?? HERO_IMAGES[1];
  const title = t('landing.ctaTitle');
  const [titleBefore, titleAfter] = title.split('GalloTrack');

  useEffect(() => {
    const banner = bannerRef.current;
    if (!banner || revealed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(banner);
    return () => observer.disconnect();
  }, [revealed]);

  useEffect(() => {
    const banner = bannerRef.current;
    const background = backgroundRef.current;
    if (
      !banner ||
      !background ||
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;

    let frame = 0;
    const update = () => {
      const rect = banner.getBoundingClientRect();
      const progress = (window.innerHeight / 2 - (rect.top + rect.height / 2)) * 0.05;
      background.style.setProperty(
        '--about-cta-parallax',
        `${Math.max(-16, Math.min(16, progress))}px`,
      );
      frame = 0;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <section
        ref={bannerRef}
        aria-labelledby="about-cta-title"
        className={`from-hero-start via-hero-mid to-sidebar-active text-sidebar-foreground relative overflow-hidden rounded-[28px] bg-gradient-to-br px-6 py-14 shadow-2xl shadow-primary/20 sm:px-10 sm:py-16 ${
          revealed ? 'landing-step-in' : 'opacity-0'
        }`}
      >
        <div ref={backgroundRef} aria-hidden="true" className="absolute inset-0">
          <Image
            src={farmImage.src}
            alt=""
            fill
            sizes="(max-width: 1279px) 100vw, 1280px"
            className="origin-right object-cover object-right opacity-45 saturate-75"
            style={{
              transform:
                'translate3d(0, var(--about-cta-parallax, 0px), 0) scale(1.08)',
            }}
          />
        </div>
        <div
          aria-hidden="true"
          className="from-sidebar-end/95 via-sidebar/88 to-sidebar-active/55 absolute inset-0 bg-gradient-to-r"
        />
        <RoosterHeadSilhouette className="text-sidebar-foreground/10 absolute -bottom-8 -left-8 h-56 w-56 rotate-[-8deg] sm:h-72 sm:w-72" />

        <svg
          aria-hidden="true"
          className="absolute -left-12 -bottom-8 h-36 w-[36rem] max-w-none text-brand-orange/45"
          viewBox="0 0 600 180"
          fill="none"
        >
          <path
            d="M-20 120C120 82 222 86 334 118C438 147 526 148 620 116V188H-20V120Z"
            fill="var(--brand-orange)"
            opacity="0.55"
          />
          <path
            d="M-20 145C120 110 232 112 344 140C450 166 540 166 624 142V190H-20V145Z"
            fill="var(--brand-red)"
            opacity="0.72"
          />
        </svg>

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2
            id="about-cta-title"
            className="text-[clamp(2rem,4.2vw,2.75rem)] leading-[1.08] font-black tracking-tight break-words text-white"
          >
            {titleBefore}
            <span className="text-brand-gold">GalloTrack</span>
            {titleAfter}
          </h2>
          <p className="text-sidebar-muted mt-4 max-w-2xl text-sm leading-relaxed font-medium break-words sm:text-base">
            {t('landing.ctaDescription')}
          </p>

          <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="/register"
              className="bg-sidebar-foreground text-sidebar focus-visible:ring-sidebar-foreground inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black shadow-lg transition-transform duration-[250ms] ease-out hover:-translate-y-0.5 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>{t('landing.ctaCreate')}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="border-sidebar-foreground text-sidebar-foreground hover:bg-sidebar-foreground/10 focus-visible:ring-sidebar-foreground inline-flex min-h-12 items-center justify-center rounded-full border-2 px-6 text-sm font-bold transition-all duration-[250ms] ease-out hover:-translate-y-0.5 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
            >
              {t('landing.login')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
