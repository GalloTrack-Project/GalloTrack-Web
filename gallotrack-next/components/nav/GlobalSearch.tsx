'use client';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Command } from 'lucide-react';
import { Modal } from '@/components/ui';
import { cn } from '@/components/ui/utils';
import { HighlightText } from '@/components/ui/HighlightText';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  OWNER_NAV,
  ADMIN_NAV,
  OWNER_QUICK_ACTIONS,
  ADMIN_QUICK_ACTIONS,
  type QuickAction,
} from '@/lib/nav-manifest';
import { matchSearchItems, type SearchableItem } from '@/lib/nav-search';

type ResultItem = SearchableItem & {
  section: 'Pages' | 'Actions';
  icon: ComponentType<{ className?: string }>;
};

export function buildSearchResults(isAdmin: boolean): ResultItem[] {
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
  const allItems = useMemo(() => buildSearchResults(isAdmin), [isAdmin]);
  const results = useMemo(() => matchSearchItems(allItems, query), [allItems, query]);

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

  function go(item: ResultItem) {
    setOpen(false);
    router.push(item.href);
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
          'flex h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-muted px-3 text-muted-foreground shadow-2xs transition-colors duration-150 hover:border-accent/50 hover:bg-muted/60 hover:text-accent cursor-pointer',
          triggerClassName,
        )}
      >
        <Search className="w-4 h-4" aria-hidden="true" />
        <span className="hidden lg:inline text-sm font-medium">Search</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-sm border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">
          <Command className="w-2.5 h-2.5" aria-hidden="true" />K
        </kbd>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Search"
        description="Jump to a page or run a quick action"
        icon={<Search className="w-4 h-4" aria-hidden="true" />}
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
          aria-activedescendant={results[activeIndex] ? `global-search-option-${activeIndex}` : undefined}
          aria-label="Search pages and actions"
          placeholder="Search pages and actions..."
          autoComplete="off"
          className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        />

        {results.length === 0 ? (
          <p role="status" className="py-6 text-center text-sm text-muted-foreground">
            No results for “{query}”.
          </p>
        ) : (
          <div
            ref={listRef}
            id="global-search-listbox"
            role="listbox"
            aria-label="Search results"
            className="max-h-[45vh] overflow-y-auto -mx-1"
          >
            {(['Pages', 'Actions'] as const).map((section) => {
              const sectionItems = results.filter((item) => item.section === section);
              if (sectionItems.length === 0) return null;
              return (
                <div key={section} role="group" aria-label={section}>
                  <p
                    role="presentation"
                    className="px-3 pb-1 pt-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground"
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
                          isActive ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted/60',
                        )}
                      >
                        <Icon
                          className={cn('w-4 h-4 shrink-0', isActive ? 'text-accent-foreground' : 'text-muted-foreground')}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <HighlightText text={item.label} query={query} className="font-semibold" />
                          {item.hint ? (
                            <span className={cn('block truncate text-xs', isActive ? 'text-accent-foreground/80' : 'text-muted-foreground')}>
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
