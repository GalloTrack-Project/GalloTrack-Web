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
        className="p-2.5 px-3 pr-8 border border-input-border dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 focus:border-emerald-500 transition-all shadow-sm cursor-pointer min-w-[200px]"
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
        <Globe className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as AppLanguage)}
          aria-label={t('header.languageSwitcher')}
          className="bg-transparent border border-border/80 rounded px-2 py-1 text-xs font-bold text-foreground cursor-pointer focus:border-accent focus:outline-none max-w-[8.5rem] lg:max-w-none"
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
      className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md border border-border bg-muted/50 hover:bg-muted text-[11px] sm:text-xs font-bold text-foreground transition-colors cursor-pointer select-none min-h-[44px] shrink-0 ${className}`}
    >
      <Globe className="w-3.5 h-3.5 text-accent shrink-0 hidden sm:block" aria-hidden="true" />
      <span className="whitespace-nowrap">{currentOption?.nativeName ?? language.toUpperCase()}</span>
      {isBeta(language) && (
        <span className="text-[9px] sm:text-xs uppercase font-mono px-0.5 sm:px-1 py-0.5 rounded bg-amber-500/20 text-warning font-black leading-none shrink-0">
          {t('common.beta')}
        </span>
      )}
    </button>
  );
}
