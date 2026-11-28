'use client';

import React from 'react';
import { Bird, Plus, TrendingUp, Trophy, type LucideIcon } from 'lucide-react';

export type StepTone = 'red' | 'orange';

type StepCardProps = {
  number: string;
  tone: StepTone;
  icon: LucideIcon;
  title: string;
  description: string;
  revealed: boolean;
  delayMs: number;
};

function StepIllustration({
  number,
  tone,
  icon: Icon,
}: Pick<StepCardProps, 'number' | 'tone' | 'icon'>) {
  const accent = tone === 'red' ? 'text-brand-red' : 'text-brand-orange';
  const soft = tone === 'red' ? 'bg-accent-soft' : 'bg-brand-orange/15';

  if (number === '01') {
    return (
      <div className={`relative flex h-28 w-28 items-center justify-center rounded-full ${soft}`}>
        <Icon className={`h-16 w-16 ${accent}`} strokeWidth={1.5} aria-hidden="true" />
        <span className="bg-card ring-border absolute flex h-10 w-10 items-center justify-center rounded-full shadow-sm ring-1">
          <Bird className={`h-6 w-6 ${accent}`} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <span className="bg-brand-red text-primary-foreground absolute top-1 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card shadow-md">
          <Plus className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        </span>
      </div>
    );
  }

  if (number === '02') {
    return (
      <div className={`relative flex h-28 w-28 items-center justify-center rounded-full ${soft}`}>
        <Bird className={`absolute top-1 h-12 w-12 ${accent}`} strokeWidth={1.6} aria-hidden="true" />
        <Icon
          className="text-muted-foreground absolute top-10 h-16 w-16"
          strokeWidth={1.4}
          aria-hidden="true"
        />
        <span className="bg-card ring-border absolute bottom-1 left-2 flex h-9 w-9 items-center justify-center rounded-full shadow-sm ring-1">
          <Bird className="text-brand-orange h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="bg-card ring-border absolute right-2 bottom-1 flex h-9 w-9 items-center justify-center rounded-full shadow-sm ring-1">
          <Bird className="text-brand-orange h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
    );
  }

  if (number === '03') {
    return (
      <div className={`relative flex h-28 w-28 items-center justify-center rounded-full ${soft}`}>
        <Icon className={`h-16 w-16 ${accent}`} strokeWidth={1.5} aria-hidden="true" />
        <Trophy
          className="text-warning absolute right-1 bottom-2 h-10 w-10 drop-shadow-sm"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className={`relative flex h-28 w-28 items-center justify-center rounded-full ${soft}`}>
      <Icon className={`h-16 w-16 ${accent}`} strokeWidth={1.5} aria-hidden="true" />
      <TrendingUp
        className="text-brand-red bg-card ring-border absolute top-1 right-0 h-10 w-10 rounded-full p-1.5 shadow-sm ring-1"
        strokeWidth={2.2}
        aria-hidden="true"
      />
      <Trophy
        className="text-warning absolute right-1 bottom-1 h-8 w-8"
        strokeWidth={1.8}
        aria-hidden="true"
      />
    </div>
  );
}

export default function StepCard({
  number,
  tone,
  icon,
  title,
  description,
  revealed,
  delayMs,
}: StepCardProps) {
  const isRed = tone === 'red';
  const badgeClass = isRed
    ? 'bg-sidebar text-sidebar-foreground'
    : 'bg-sidebar-active text-sidebar-active-foreground';
  const accentBar = isRed ? 'bg-brand-red' : 'bg-brand-orange';
  const watermark = isRed ? 'text-brand-red' : 'text-brand-orange';

  return (
    <div
      className={`h-full ${revealed ? 'landing-step-in' : 'opacity-0'}`}
      style={revealed ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <article className="group border-border bg-card hover:shadow-primary/15 relative flex h-full min-w-0 flex-col rounded-3xl border px-5 pt-12 pb-8 text-center shadow-xl shadow-primary/5 transition-all duration-[250ms] ease-out hover:-translate-y-1.5 hover:shadow-2xl motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
        >
          <svg
            className={`absolute -top-5 -right-5 h-28 w-28 rotate-12 opacity-[0.07] ${watermark}`}
            viewBox="0 0 120 120"
            fill="none"
          >
            <path
              d="M94 13C65 16 40 35 25 62C15 80 10 100 12 111C26 106 40 97 52 86C76 65 92 40 94 13Z"
              fill="currentColor"
            />
            <path
              d="M86 31C73 49 58 66 42 81C34 89 26 96 17 101"
              stroke="var(--card)"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M65 62C75 65 84 63 91 57M48 78C57 80 64 77 69 72"
              stroke="var(--card)"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.65"
            />
          </svg>
        </div>

        <span
          className={`absolute -top-5 left-5 inline-flex h-12 min-w-12 items-center justify-center rounded-full px-3 text-sm font-black tracking-wide shadow-lg ${badgeClass}`}
        >
          {number}
        </span>

        <div className="mx-auto mb-5 flex h-28 items-center justify-center">
          <StepIllustration number={number} tone={tone} icon={icon} />
        </div>

        <h3 className="text-foreground text-xl leading-tight font-black tracking-tight break-words">
          {title}
        </h3>
        <p className="text-muted-foreground mx-auto mt-3 max-w-[18rem] text-sm leading-relaxed font-medium break-words">
          {description}
        </p>

        <span
          aria-hidden="true"
          className={`absolute right-5 bottom-0 left-5 h-1.5 rounded-t-full ${accentBar}`}
        />
      </article>
    </div>
  );
}
