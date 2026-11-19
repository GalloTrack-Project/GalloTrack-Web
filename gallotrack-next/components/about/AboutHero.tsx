'use client';

import Image from 'next/image';
import { Feather, GraduationCap } from 'lucide-react';
import { HERO_IMAGES } from '@/lib/hero-config';
import { useT } from '@/lib/i18n';
import AboutRooster from './AboutRooster';
import InfoCard from './InfoCard';

export default function AboutHero() {
  const t = useT();
  const farmImage = HERO_IMAGES.find((image) => image.id === 'farm-2') ?? HERO_IMAGES[1];
  const title = t('landing.aboutTitle');
  const [titleBefore, titleAfter] = title.split('GalloTrack');
  const description = t('landing.aboutDescription');
  const projectName = 'ISUFST CICI Capstone Project';
  const [descriptionBefore, descriptionAfter] = description.split(projectName);

  return (
    <section className="from-background via-background to-accent-soft/40 relative overflow-x-clip bg-gradient-to-br pt-8 pb-12 sm:pt-12 lg:pt-14">
      <div
        aria-hidden="true"
        className="text-brand-orange/10 pointer-events-none absolute -top-6 right-0 h-72 w-72 rotate-12 sm:h-96 sm:w-96"
      >
        <Feather className="h-full w-full" strokeWidth={0.7} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-6 xl:gap-10">
          <div className="relative min-h-[24rem] sm:min-h-[30rem] lg:col-span-5 lg:min-h-[42rem]">
            <div
              aria-hidden="true"
              className="bg-accent-soft/50 absolute -left-16 bottom-10 h-[82%] w-[125%] overflow-hidden rounded-[48%_52%_45%_55%/58%_45%_55%_42%] sm:-left-24 lg:-left-28 lg:bottom-0 lg:h-[92%]"
            >
              <Image
                src={farmImage.src}
                alt=""
                fill
                sizes="(max-width: 1023px) 100vw, 44vw"
                className="object-cover object-center opacity-70 blur-[2px]"
              />
              <div className="from-background absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
            </div>

            <svg
              aria-hidden="true"
              className="absolute -left-10 bottom-4 h-36 w-[34rem] max-w-none text-brand-orange/60 sm:-left-16 sm:h-44"
              viewBox="0 0 640 220"
              fill="none"
            >
              <path
                d="M-40 180C96 122 202 118 306 152C410 186 504 196 642 142V226H-40V180Z"
                fill="var(--brand-orange)"
                opacity="0.5"
              />
              <path
                d="M-40 205C104 158 224 156 338 188C442 218 540 216 648 180V228H-40V205Z"
                fill="var(--brand-red)"
                opacity="0.9"
              />
            </svg>

            <div className="absolute -bottom-4 left-1/2 w-[min(36rem,120%)] max-w-none -translate-x-1/2 sm:left-1/2 lg:-left-36 lg:-bottom-8 lg:w-[min(38rem,135%)] lg:translate-x-0 xl:-left-44">
              <div className="about-hero-rooster">
                <AboutRooster
                  label={t('landing.aboutRoosterAlt')}
                  className="drop-shadow-[0_24px_28px_rgba(67,20,7,0.22)] h-auto w-full"
                />
              </div>
            </div>
          </div>

          <div className="about-hero-copy relative z-20 min-w-0 lg:col-span-7 lg:pl-6 xl:pl-10">
            <div className="border-brand-red/20 bg-brand-red/15 text-brand-red inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black tracking-wide">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              <span className="break-words">{t('landing.aboutBadge')}</span>
            </div>

            <h1 className="text-foreground mt-5 text-[clamp(2.7rem,5.8vw,4.5rem)] leading-[1.02] font-black tracking-tight break-words">
              {titleBefore}
              <span className="text-brand-red">GalloTrack</span>
              {titleAfter}
            </h1>

            <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-relaxed font-medium break-words sm:text-lg">
              {descriptionBefore}
              <strong className="text-foreground font-extrabold">{projectName}</strong>
              {descriptionAfter}
            </p>

            <span
              aria-hidden="true"
              className="bg-brand-orange mt-6 block h-2 w-[7rem] rounded-full"
            />

            <InfoCard className="mt-8 lg:mt-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
