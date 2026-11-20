'use client';

import React, { useRef } from 'react';
import { Egg, FileText } from 'lucide-react';
import { CockIcon, HenIcon } from '@/components/icons/FowlSexIcons';
import type { ProfilingSubTab } from '@/lib/types';
import { useT } from '@/lib/i18n';

export interface MainRegistryTabItem {
  id: 'males' | 'females' | 'offspring' | 'matchForm';
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  count?: number;
}

interface RegistryNavProps {
  currentTab: ProfilingSubTab;
  onSelectTab: (tab: ProfilingSubTab) => void;
  counts: {
    males: number;
    females: number;
    offspring: number;
    sireMaterial?: number;
  };
}

export default function RegistryNav({ currentTab, onSelectTab, counts }: RegistryNavProps) {
  const { t } = useT();

  // 4 MAIN TABS in strict order requested:
  // Cocks | Hens | Offspring | Match Logs
  const tabs: MainRegistryTabItem[] = [
    {
      id: 'males',
      label: t('registry.tabMales'),
      shortLabel: t('registry.tabMalesShort'),
      icon: <CockIcon className="h-4 w-4 shrink-0" />,
      count: counts.males,
    },
    {
      id: 'females',
      label: t('registry.tabFemales'),
      shortLabel: t('registry.tabFemalesShort'),
      icon: <HenIcon className="h-4 w-4 shrink-0" />,
      count: counts.females,
    },
    {
      id: 'offspring',
      label: t('registry.tabOffspring'),
      shortLabel: t('registry.tabOffspringShort'),
      icon: <Egg className="h-4 w-4 shrink-0" />,
      count: counts.offspring,
    },
    {
      id: 'matchForm',
      label: t('registry.tabMatches'),
      shortLabel: t('registry.tabMatchesShort'),
      icon: <FileText className="h-4 w-4 shrink-0" />,
    },
  ];

  const desktopRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const mobileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // WAI-ARIA tablist roving keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number, isMobile = false) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight' || (!isMobile && e.key === 'ArrowDown')) {
      e.preventDefault();
      targetIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || (!isMobile && e.key === 'ArrowUp')) {
      e.preventDefault();
      targetIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      targetIndex = tabs.length - 1;
    }

    if (targetIndex >= 0) {
      const nextTab = tabs[targetIndex];
      onSelectTab(nextTab.id);
      const targetMap = isMobile ? mobileRefs.current : desktopRefs.current;
      targetMap.get(nextTab.id)?.focus();
    }
  };

  return (
    <>
      {/* 
        DESKTOP & TABLET VIEW (md and up):
        - Clean underline tabs.
        - No filled pill background, no boxed container with heavy border.
        - Active tab: bold text, brand color (emerald-600), 2-3px bottom border.
        - Inactive tabs: muted gray with subtle hover state.
        - Same active color for every tab (emerald-600).
        - Thin divider line running under the whole tab row.
      */}
      <div className="bg-card border-border hidden w-full rounded-2xl border p-1.5 shadow-md md:block">
        <div
          role="tablist"
          aria-label={t('registry.navAria')}
          className="flex flex-wrap items-center gap-1"
        >
          {tabs.map((tab, idx) => {
            const isSelected = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) desktopRefs.current.set(tab.id, el);
                  else desktopRefs.current.delete(tab.id);
                }}
                type="button"
                role="tab"
                id={`registry-tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`registry-tabpanel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelectTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, idx, false)}
                className={`group focus-visible:ring-ring focus-visible:ring-offset-card inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-extrabold shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span
                  className={isSelected ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}
                >
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-black transition-colors ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 
        MOBILE FIXED BOTTOM NAVIGATION (< md):
        - Fixed bottom navigation bar with icon + short label.
        - Minimum 44px+ touch targets.
        - Count badge as a clean small dot or subtle count badge.
        - Stays above the global app nav when active, accessible & thumb-friendly.
      */}
      <div className="bg-card/95 border-border fixed right-0 bottom-16 left-0 z-40 border-t px-2 py-1 shadow-lg backdrop-blur-md md:hidden">
        <div
          role="tablist"
          aria-label={t('registry.mobileNavAria')}
          className="grid items-center gap-1"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab, idx) => {
            const isSelected = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) mobileRefs.current.set(tab.id, el);
                  else mobileRefs.current.delete(tab.id);
                }}
                type="button"
                role="tab"
                id={`registry-mobile-tab-${tab.id}`}
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelectTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, idx, true)}
                className={`relative flex min-h-[48px] cursor-pointer flex-col items-center justify-center rounded-md px-1 py-1 transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-extrabold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="relative">
                  {tab.icon}
                  {typeof tab.count === 'number' && (
                    <span
                      className={`absolute -top-1.5 -right-3 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-xs leading-none font-black ${
                        isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-muted text-muted-foreground border-border border'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </div>
                <span className="mt-1 max-w-full truncate text-xs font-bold tracking-tight">
                  {tab.shortLabel}
                </span>
                {isSelected && (
                  <span
                    className="absolute bottom-0 h-0.5 w-8 rounded-full bg-emerald-600"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
