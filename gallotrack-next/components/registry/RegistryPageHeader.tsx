'use client';

import { Dna, Plus } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import { useT } from '@/lib/i18n';

export default function RegistryPageHeader({
  onOpenBreeds,
  onRegister,
  registerActive,
}: {
  onOpenBreeds: () => void;
  onRegister: () => void;
  registerActive: boolean;
}) {
  const t = useT();

  return (
    <section className="border-border from-background via-accent-soft/35 to-brand-orange/20 relative overflow-hidden rounded-[24px] border bg-gradient-to-r px-5 py-6 shadow-lg shadow-primary/5 sm:px-7 sm:py-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] lg:block">
        <svg
          className="h-full w-full"
          viewBox="0 0 760 240"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <circle cx="610" cy="54" r="34" fill="var(--warning)" opacity="0.35" />
          <path
            d="M300 152C390 112 478 119 560 144C646 170 714 168 790 144V240H300V152Z"
            fill="var(--brand-orange)"
            opacity="0.3"
          />
          <path
            d="M344 174C438 143 530 150 612 172C690 192 744 190 804 175V242H344V174Z"
            fill="var(--brand-red)"
            opacity="0.28"
          />
          <g fill="var(--sidebar-end)" opacity="0.32">
            <path d="M548 191V139M548 153L516 129M548 161L581 134" stroke="var(--sidebar-end)" strokeWidth="5" strokeLinecap="round" />
            <circle cx="512" cy="124" r="24" />
            <circle cx="535" cy="104" r="19" />
            <circle cx="584" cy="127" r="22" />
            <path d="M654 133H736V188H654V133ZM676 188V156H714V188H676Z" />
            <path d="M644 137L695 105L746 137" stroke="var(--sidebar-end)" strokeWidth="6" strokeLinecap="round" />
            <path d="M604 192V168M628 193V166M652 194V167M676 195V168" stroke="var(--sidebar-end)" strokeWidth="3" strokeLinecap="round" />
          </g>
          <g className="text-brand-red" opacity="0.68">
            <path d="M578 118C590 96 616 91 629 103C635 88 654 87 660 101C673 97 684 107 679 119C672 133 654 136 640 128C632 141 611 139 605 126C594 134 582 129 578 118Z" fill="currentColor" />
            <path d="M552 119L531 126L553 132Z" fill="var(--brand-gold)" />
            <circle cx="645" cy="106" r="3.5" fill="var(--background)" />
          </g>
        </svg>
      </div>

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="bg-sidebar text-sidebar-foreground flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-xl shadow-primary/20 ring-4 ring-white/50 sm:h-[70px] sm:w-[70px]">
            <ChickenIcon className="h-8 w-8 text-white" />
          </span>
          <div className="min-w-0">
            <h1 className="text-foreground text-[clamp(1.65rem,3vw,2.15rem)] leading-tight font-black tracking-tight break-words">
              {t('registry.title')}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm font-medium break-words sm:text-base">
              {t('registry.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5 lg:pr-2">
          <button
            type="button"
            onClick={onOpenBreeds}
            className="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Dna className="text-brand-red h-4 w-4" aria-hidden="true" />
            {t('registry.breedsBtn')}
          </button>
          <button
            type="button"
            onClick={onRegister}
            className={`from-sidebar to-sidebar-active focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r px-5 text-sm font-black text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
              registerActive ? 'ring-2 ring-brand-gold/60' : ''
            }`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {registerActive ? t('registry.viewRegistryBtn') : t('registry.registerChickenBtn')}
          </button>
        </div>
      </div>
    </section>
  );
}
