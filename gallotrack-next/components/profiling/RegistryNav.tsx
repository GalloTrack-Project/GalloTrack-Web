'use client';

import React, { useRef } from 'react';
import { Shield, Egg, FileText } from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import type { ProfilingSubTab } from '@/lib/types';

export interface MainRegistryTabItem {
  id: 'males' | 'females' | 'offspring' | 'matchForm' | 'sireMaterial';
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
    sireMaterial: number;
  };
}

export default function RegistryNav({ currentTab, onSelectTab, counts }: RegistryNavProps) {
  // 5 MAIN TABS in strict order requested:
  // Breeding Male | Breeding Female | Non-Breeding | Match Logs | Sire Material
  const tabs: MainRegistryTabItem[] = [
    {
      id: 'males',
      label: 'Breeding Male',
      shortLabel: 'Male',
      icon: <ChickenIcon className="w-4 h-4 shrink-0" />,
      count: counts.males,
    },
    {
      id: 'females',
      label: 'Breeding Female',
      shortLabel: 'Female',
      icon: <ChickenIcon className="w-4 h-4 shrink-0" />,
      count: counts.females,
    },
    {
      id: 'offspring',
      label: 'Non-Breeding',
      shortLabel: 'Non-Breeding',
      icon: <Egg className="w-4 h-4 shrink-0" />,
      count: counts.offspring,
    },
    {
      id: 'matchForm',
      label: 'Match Logs',
      shortLabel: 'Matches',
      icon: <FileText className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'sireMaterial',
      label: 'Sire Material',
      shortLabel: 'Sire Mat.',
      icon: <Shield className="w-4 h-4 shrink-0" />,
      count: counts.sireMaterial,
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
      <div className="hidden md:block w-full border-b border-border/70">
        <div
          role="tablist"
          aria-label="Chicken Registry Main Sections"
          className="flex items-center gap-1 sm:gap-2 -mb-px overflow-x-visible"
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
                className={`group relative inline-flex items-center gap-2 px-3 py-3 text-sm font-bold border-b-2 transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded-t-sm whitespace-nowrap ${
                  isSelected
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/80'
                }`}
              >
                <span className={`transition-colors ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full transition-colors ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
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
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-lg px-2 py-1">
        <div
          role="tablist"
          aria-label="Chicken Registry Mobile Navigation"
          className="grid grid-cols-5 items-center gap-1"
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
                className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-md transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isSelected
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50/50 dark:bg-emerald-950/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="relative">
                  {tab.icon}
                  {typeof tab.count === 'number' && (
                    <span
                      className={`absolute -top-1.5 -right-3 text-[10px] font-black px-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full leading-none ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold tracking-tight truncate max-w-full mt-1">
                  {tab.shortLabel}
                </span>
                {isSelected && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-emerald-600 rounded-full" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
