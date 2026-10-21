'use client';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Command } from 'lucide-react';
import { Modal } from '@/components/ui';
import { cn } from '@/components/ui/utils';
import { HighlightText } from '@/components/ui/HighlightText';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import ChickenIcon from '@/components/ChickenIcon';
import type { FowlRecord } from '@/lib/types';
import {
  OWNER_NAV,
  ADMIN_NAV,
  OWNER_QUICK_ACTIONS,
  ADMIN_QUICK_ACTIONS,
  type QuickAction,
} from '@/lib/nav-manifest';
import {
  matchSearchItems,
  matchBirds,
  birdSearchHint,
  type SearchableItem,
} from '@/lib/nav-search';
import { resolveBirdCodes } from '@/lib/bird-code';

type PageActionItem = SearchableItem & {
  section: 'Pages' | 'Actions';
  icon: ComponentType<{ className?: string }>;
};

type BirdItem = {
  id: string;
  section: 'Chickens';
  label: string;
  hint: string;
  href: '';
  icon: ComponentType<{ className?: string }>;
  fowl: FowlRecord;
};

type PaletteItem = PageActionItem | BirdItem;

export function buildSearchResults(isAdmin: boolean): PageActionItem[] {
  const nav = isAdmin ? ADMIN_NAV : OWNER_NAV;
  const actions: QuickAction[] = isAdmin ? ADMIN_QUICK_ACTIONS : OWNER_QUICK_ACTIONS;
  return [
    ...nav.map((item) => ({
      id: `page:${item.href}`,
      section: 'Pages' as const,
      label: item.label,
      hint: item.href,
      href: item.href,
      icon: item.icon,
    })),
    ...actions.map((action) => ({
      id: `action:${action.id}`,
      section: 'Actions' as const,
      label: action.label,
      hint: action.hint,
      href: action.href,
      icon: ArrowRight,
    })),
  ];
}

export default function GlobalSearch({ triggerClassName }: { triggerClassName?: string }) {
  const router = useRouter();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isAdmin = auth.isAdmin;
  const fowl = useFowl();
  const ui = useUI();
  const allItems = useMemo(() => buildSearchResults(isAdmin), [isAdmin]);
  const pageActionResults = useMemo(() => matchSearchItems(allItems, query), [allItems, query]);
  const birdCodes = useMemo(() => resolveBirdCodes(fowl.fowls), [fowl.fowls]);
  const results = useMemo<PaletteItem[]>(() => {
    const pages = pageActionResults.filter((item) => item.section === 'Pages');
    const actions = pageActionResults.filter((item) => item.section === 'Actions');
    // Admin palette stays page/action only - no bird data.
    const birds: BirdItem[] = isAdmin
      ? []
      : matchBirds(fowl.fowls, query).map((bird) => ({
          id: `bird:${bird.id}`,
          section: 'Chickens' as const,
          label: bird.name,
          hint: birdSearchHint(bird, birdCodes),
          href: '' as const,
          icon: ChickenIcon,
          fowl: bird,
        }));
    return [...pages, ...birds, ...actions];
  }, [pageActionResults, fowl.fowls, birdCodes, query, isAdmin]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          setQuery('');
          setActiveIndex(0);
          setOpen(true);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function openDialog() {
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  }

  useEffect(() => {
    // Runs after Modal's own focus effect, landing focus in the input.
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const option = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    option?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, results]);

  function go(item: PaletteItem) {
    setOpen(false);
    if ('fowl' in item) {
      ui.setSelectedFowlForDetails(item.fowl);
    } else {
      router.push(item.href);
    }
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[activeIndex];
      if (item) go(item);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label="Search"
        title="Search (Ctrl+K)"
        className={cn(
          'border-border bg-muted text-muted-foreground hover:border-accent/50 hover:bg-muted/60 hover:text-accent flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 shadow-2xs transition-colors duration-150',
          triggerClassName,
        )}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden text-sm font-medium lg:inline">Search</span>
        <kbd className="border-border bg-background text-muted-foreground hidden items-center gap-0.5 rounded-sm border px-1.5 py-0.5 font-mono text-xs font-semibold lg:inline-flex">
          <Command className="h-2.5 w-2.5" aria-hidden="true" />K
        </kbd>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Search"
        description={
          isAdmin
            ? 'Jump to a page or run a quick action'
            : 'Jump to a page, chicken, or quick action'
        }
        icon={<Search className="h-4 w-4" aria-hidden="true" />}
        iconClassName="border-accent/30 bg-accent/10 text-accent"
        className="max-w-xl"
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onInputKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls="global-search-listbox"
          aria-activedescendant={
            results[activeIndex] ? `global-search-option-${activeIndex}` : undefined
          }
          aria-label="Search"
          placeholder="Search pages, chickens, and actions..."
          autoComplete="off"
          className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-accent/50 w-full rounded-sm border px-3 py-2.5 text-sm focus:ring-2 focus:outline-none"
        />

        {results.length === 0 ? (
          <p role="status" className="text-muted-foreground py-6 text-center text-sm">
            No results for “{query}”.
          </p>
        ) : (
          <div
            ref={listRef}
            id="global-search-listbox"
            role="listbox"
            aria-label="Search results"
            className="-mx-1 max-h-[45vh] overflow-y-auto"
          >
            {(['Pages', 'Chickens', 'Actions'] as const).map((section) => {
              const sectionItems = results.filter((item) => item.section === section);
              if (sectionItems.length === 0) return null;
              return (
                <div key={section} role="group" aria-label={section}>
                  <p
                    role="presentation"
                    className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-black tracking-widest uppercase"
                  >
                    {section}
                  </p>
                  {sectionItems.map((item) => {
                    const index = results.indexOf(item);
                    const isActive = index === activeIndex;
                    const Icon = item.icon;
                    return (
                      // Options are activated from the combobox input (Arrow
                      // keys + Enter); clicking mirrors cmdk-style palettes.
                      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                      <div
                        key={item.id}
                        id={`global-search-option-${index}`}
                        role="option"
                        aria-selected={isActive}
                        data-active={isActive}
                        tabIndex={-1}
                        onClick={() => go(item)}
                        onMouseMove={() => setActiveIndex(index)}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors duration-100',
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground hover:bg-muted/60',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground',
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <HighlightText
                            text={item.label}
                            query={query}
                            className="font-semibold"
                          />
                          {item.hint ? (
                            <span
                              className={cn(
                                'block truncate text-xs',
                                isActive ? 'text-accent-foreground/80' : 'text-muted-foreground',
                              )}
                            >
                              {item.hint}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
}
