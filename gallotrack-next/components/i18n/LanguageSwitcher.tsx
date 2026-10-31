'use client';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLanguage, type AppLanguage } from '@/lib/i18n';
import { cn } from '@/components/ui/utils';

/**
 * Settings > Preferences full language selector.
 * Displays:
 *  - English
 *  - Tagalog
 *  - Hiligaynon (Beta)
 */
export function LanguageSelect({ className = '' }: { className?: string }) {
  const { language, setLanguage, languages, isBeta, t } = useLanguage();

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        id="app-language-select"
        value={language}
        onChange={(e) => setLanguage(e.target.value as AppLanguage)}
        aria-label={t('preferences.languageFieldLabel')}
        className="border-input-border min-w-[200px] cursor-pointer rounded-md border bg-white p-2.5 px-3 pr-8 text-sm font-semibold text-slate-700 shadow-sm transition-all focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
            {isBeta(lang.code) ? ` (${t('common.beta')})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Shared language picker used by the dashboard/admin top bar, the public
 * navbar, auth screens, footer, and 404 page.
 *
 * The button only opens the menu; the language changes when an option is
 * selected. State and persistence come from LanguageProvider (gt-lang cookie).
 */
export function CompactLanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, setLanguage, languages, isBeta, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusOnOpenRef = useRef<number | null>(null);

  const currentOption = languages.find((option) => option.code === language);
  const activeIndex = languages.findIndex((option) => option.code === language);

  const openMenu = (focusIndex: number | null = null) => {
    focusOnOpenRef.current = focusIndex;
    setOpen(true);
  };

  const closeMenu = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  // Move focus into the menu when it opens (first item or the active one).
  useEffect(() => {
    if (!open) return;
    const index = focusOnOpenRef.current ?? (activeIndex >= 0 ? activeIndex : 0);
    focusOnOpenRef.current = null;
    itemRefs.current[index]?.focus();
  }, [open, activeIndex]);

  // Outside click / touch closes the menu and returns focus to the button.
  useEffect(() => {
    if (!open) return;

    const handleOutside = (event: Event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === 'ArrowDown' || event.key === 'Home') {
      event.preventDefault();
      if (open) itemRefs.current[0]?.focus();
      else openMenu(0);
    } else if (event.key === 'ArrowUp' || event.key === 'End') {
      event.preventDefault();
      if (open) itemRefs.current[languages.length - 1]?.focus();
      else openMenu(languages.length - 1);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(current - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
    }
  };

  const selectLanguage = (code: AppLanguage) => {
    setLanguage(code);
    closeMenu(true);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn('relative inline-block', className)}
      onBlur={handleBlur}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t('header.languageSwitcher')}: ${currentOption?.nativeName ?? language.toUpperCase()}`}
        title={`${t('header.languageSwitcher')}: ${currentOption?.nativeName}`}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={handleButtonKeyDown}
        className="border-border bg-muted/50 hover:bg-muted text-foreground focus-visible:ring-accent focus-visible:ring-offset-card inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-bold transition-colors select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-2.5"
      >
        <Globe className="text-accent h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden whitespace-nowrap md:inline">
          {currentOption?.nativeName ?? language.toUpperCase()}
        </span>
        {isBeta(language) && (
          <span className="text-warning hidden shrink-0 rounded bg-amber-500/20 px-0.5 py-0.5 font-mono text-xs leading-none font-black uppercase md:inline sm:px-1">
            {t('common.beta')}
          </span>
        )}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform duration-150',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      <div
        id={menuId}
        role="menu"
        aria-label={t('header.languageSwitcher')}
        hidden={!open}
        className="border-border bg-card text-card-foreground absolute right-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-md border p-1 shadow-lg shadow-black/10 dark:shadow-black/40"
      >
        {languages.map((lang, index) => {
          const isActive = lang.code === language;

          return (
            <button
              key={lang.code}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              tabIndex={-1}
              onClick={() => selectLanguage(lang.code)}
              onKeyDown={handleMenuKeyDown}
              className={cn(
                'focus-visible:ring-accent flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none',
                isActive
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium',
              )}
            >
              <span className="flex items-center gap-2">
                <span>{lang.nativeName}</span>
                {isBeta(lang.code) && (
                  <span className="text-warning rounded bg-amber-500/20 px-1 py-0.5 font-mono text-xs leading-none font-black uppercase">
                    {t('common.beta')}
                  </span>
                )}
              </span>
              {isActive && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
