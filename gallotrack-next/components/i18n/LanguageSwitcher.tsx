'use client';
import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, type AppLanguage } from '@/lib/i18n';

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
 * Compact language switcher for public navbar, footer, auth headers, and dashboard topbar.
 * Compact button showing current language with accessible aria labels.
 */
export function CompactLanguageSwitcher({
  variant = 'button',
  className = '',
}: {
  variant?: 'button' | 'select';
  className?: string;
}) {
  const { language, setLanguage, languages, isBeta, t } = useLanguage();

  if (variant === 'select') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <Globe className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as AppLanguage)}
          aria-label={t('header.languageSwitcher')}
          className="border-border/80 text-foreground focus:border-accent max-w-[8.5rem] cursor-pointer rounded border bg-transparent px-2 py-1 text-xs font-bold focus:outline-none lg:max-w-none"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-card text-card-foreground">
              {lang.nativeName}
              {isBeta(lang.code) ? ` [${t('common.beta')}]` : ''}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Button cycle or toggle
  const nextLang: Record<AppLanguage, AppLanguage> = {
    en: 'tl',
    tl: 'hil',
    hil: 'en',
  };

  const handleCycle = () => {
    setLanguage(nextLang[language]);
  };

  const currentOption = languages.find((l) => l.code === language);

  return (
    <button
      type="button"
      onClick={handleCycle}
      aria-label={`${t('header.languageSwitcher')}: ${currentOption?.nativeName}`}
      title={`${t('header.languageSwitcher')}: ${currentOption?.nativeName}`}
      className={`border-border bg-muted/50 hover:bg-muted text-foreground inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-bold transition-colors select-none sm:px-2.5 ${className}`}
    >
      <Globe className="text-accent hidden h-3.5 w-3.5 shrink-0 sm:block" aria-hidden="true" />
      <span className="whitespace-nowrap">
        {currentOption?.nativeName ?? language.toUpperCase()}
      </span>
      {isBeta(language) && (
        <span className="text-warning shrink-0 rounded bg-amber-500/20 px-0.5 py-0.5 font-mono text-xs leading-none font-black uppercase sm:px-1">
          {t('common.beta')}
        </span>
      )}
    </button>
  );
}
