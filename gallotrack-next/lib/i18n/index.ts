'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { en } from './en';
import { tl } from './tl';
import { hil } from './hil';
import {
  type AppLanguage,
  type AppTranslations,
  type TranslationKey,
  type LanguageOption,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  LANGUAGE_OPTIONS,
  HILIGAYNON_BETA,
} from './types';
import * as formatters from './formatters';

export * from './types';
export * from './formatters';

export const DICTIONARIES: Record<AppLanguage, AppTranslations> = {
  en,
  tl,
  hil,
};

import { sanitizeLanguage } from './server';

export * from './server';

export const getDictionary = (lang: AppLanguage = DEFAULT_LANGUAGE) => DICTIONARIES[lang] || DICTIONARIES.en;

/**
 * Writes the language cookie in client-side document.cookie.
 */
export function setLanguageCookie(lang: AppLanguage): void {
  if (typeof document === 'undefined') return;
  const oneYearSeconds = 31536000;
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=${oneYearSeconds}; SameSite=Lax`;
  document.documentElement.lang = lang;
}

// Track warning logs to avoid spamming dev console
const warnedKeys = new Set<string>();

/**
 * Resolves a dot-delimited translation path (e.g. 'common.save') on a nested dictionary object.
 */
function resolvePath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Replaces `{paramName}` placeholders with provided param values.
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    return key in params ? String(params[key]) : match;
  });
}

/**
 * Core translation function with fallback to English and dev-only warning.
 */
export function translate(
  key: TranslationKey,
  lang: AppLanguage = DEFAULT_LANGUAGE,
  params?: Record<string, string | number>
): string {
  const targetDict = DICTIONARIES[lang] || DICTIONARIES.en;
  let text = resolvePath(targetDict as unknown as Record<string, unknown>, key);

  if (!text) {
    // Missing key in target language: fallback to English
    text = resolvePath(DICTIONARIES.en as unknown as Record<string, unknown>, key);

    if (process.env.NODE_ENV !== 'production' && lang !== 'en') {
      const warnKey = `${lang}:${key}`;
      if (!warnedKeys.has(warnKey)) {
        warnedKeys.add(warnKey);
        console.warn(`[i18n] Missing translation for key "${key}" in language "${lang}", falling back to English.`);
      }
    }
  }

  if (!text) {
    // If key missing even in English, return raw key
    return key;
  }

  return interpolate(text, params);
}

/**
 * Server-safe helper to get a bound translation function for a specific language.
 */
export function getTranslations(lang: AppLanguage = DEFAULT_LANGUAGE) {
  return {
    t: (key: TranslationKey, params?: Record<string, string | number>) => translate(key, lang, params),
    lang,
    formatDate: (d: Date | string | number | null | undefined, options?: formatters.DateFormatOptions) =>
      formatters.formatDate(d, lang, options),
    formatNumber: (n: number, options?: Intl.NumberFormatOptions) => formatters.formatNumber(n, lang, options),
    formatCurrency: (a: number, decimals?: number) => formatters.formatCurrency(a, lang, decimals),
    formatPercent: (p: number, decimals?: number) => formatters.formatPercent(p, lang, decimals),
    pluralize: (count: number, singular: string, plural: string) => formatters.pluralize(count, singular, plural, lang),
  };
}

/* -------------------------------------------------------------------------- */
/* Domain label translators (separating canonical database values from UI)    */
/* -------------------------------------------------------------------------- */

export function translateStatus(status: string | null | undefined, lang: AppLanguage = 'en'): string {
  if (!status) return '—';
  const s = status.trim().toLowerCase();
  switch (s) {
    case 'active':
      return translate('domain.statusActive', lang);
    case 'archived':
      return translate('domain.statusArchived', lang);
    case 'deceased':
      return translate('domain.statusDeceased', lang);
    case 'sold':
      return translate('domain.statusSold', lang);
    case 'quarantined':
      return translate('domain.statusQuarantined', lang);
    default:
      return status;
  }
}

export function translateClass(cls: string | null | undefined, lang: AppLanguage = 'en'): string {
  if (!cls) return '—';
  const c = cls.trim().toLowerCase();
  switch (c) {
    case 'cock':
      return translate('domain.classCock', lang);
    case 'stag':
      return translate('domain.classStag', lang);
    case 'open':
      return translate('domain.classOpen', lang);
    default:
      return cls;
  }
}

export function translateRole(role: string | null | undefined, lang: AppLanguage = 'en'): string {
  if (!role) return '—';
  const r = role.trim().toLowerCase();
  switch (r) {
    case 'sire':
      return translate('domain.roleSire', lang);
    case 'dam':
      return translate('domain.roleDam', lang);
    case 'offspring':
      return translate('domain.roleOffspring', lang);
    default:
      return role;
  }
}

export function translateOutcome(outcome: string | null | undefined, lang: AppLanguage = 'en'): string {
  if (!outcome) return '—';
  const o = outcome.trim().toLowerCase();
  switch (o) {
    case 'win':
      return translate('domain.outcomeWin', lang);
    case 'loss':
      return translate('domain.outcomeLoss', lang);
    case 'draw':
      return translate('domain.outcomeDraw', lang);
    case 'no contest':
      return translate('domain.outcomeNoContest', lang);
    default:
      return outcome;
  }
}

export function translateBreedingType(type: string | null | undefined, lang: AppLanguage = 'en'): string {
  if (!type) return '—';
  const t = type.trim().toLowerCase();
  switch (t) {
    case 'purebred':
      return translate('domain.breedingPurebred', lang);
    case 'crossbred':
      return translate('domain.breedingCrossbred', lang);
    case 'unverified':
      return translate('domain.breedingUnverified', lang);
    default:
      // 'Outcross' is NOT a breeding type: it belongs to the relatedness dimension
      // (Close Breeding / Line Breeding / Outcross). Unknown values pass through.
      return type;
  }
}

/**
 * Translates a relatedness classification (Close Breeding / Line Breeding / Outcross).
 * These are separate from breeding types (Purebred / Crossbred / Unverified Lineage).
 */
export function translateRelatedness(type: string | null | undefined, lang: AppLanguage = 'en'): string {
  if (!type) return '—';
  switch (type.trim().toLowerCase()) {
    case 'close':
      return translate('domain.relatednessClose', lang);
    case 'line':
      return translate('domain.relatednessLine', lang);
    case 'outcross':
      return translate('domain.relatednessOutcross', lang);
    case 'unknown':
      return translate('domain.relatednessUnknown', lang);
    default:
      return type;
  }
}

/* -------------------------------------------------------------------------- */
/* React Context and Hook                                                     */
/* -------------------------------------------------------------------------- */

export interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  languages: readonly LanguageOption[];
  isBeta: (lang: AppLanguage) => boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export interface LanguageProviderProps {
  initialLanguage?: AppLanguage;
  children: React.ReactNode;
}

export function LanguageProvider({ initialLanguage = DEFAULT_LANGUAGE, children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<AppLanguage>(initialLanguage);
  const [prevInitial, setPrevInitial] = useState<AppLanguage>(initialLanguage);

  // Sync state if initialLanguage changes across server route navigations
  if (initialLanguage !== prevInitial) {
    setPrevInitial(initialLanguage);
    if (initialLanguage && SUPPORTED_LANGUAGES.includes(initialLanguage)) {
      setLanguageState(initialLanguage);
    }
  }

  // Keep <html lang="..."> attribute in sync on client
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((newLang: AppLanguage) => {
    const valid = sanitizeLanguage(newLang);
    setLanguageState(valid);
    setLanguageCookie(valid);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return translate(key, language, params);
    },
    [language]
  );

  const isBeta = useCallback((lang: AppLanguage) => {
    return lang === 'hil' && HILIGAYNON_BETA;
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      languages: LANGUAGE_OPTIONS,
      isBeta,
    }),
    [language, setLanguage, t, isBeta]
  );

  return React.createElement(LanguageContext.Provider, { value }, children);
}

export type UseTHook = ((key: TranslationKey, params?: Record<string, string | number>) => string) & {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  language: AppLanguage;
};

/**
 * Hook to access the current language translation function `t(key, params)`.
 * Can be called directly as `const t = useT(); t('key')` or destructured as `const { t } = useT();`.
 */
export function useT(): UseTHook {
  const ctx = useContext(LanguageContext);
  const fn = ctx
    ? ctx.t
    : (key: TranslationKey, params?: Record<string, string | number>) => translate(key, DEFAULT_LANGUAGE, params);

  const lang = ctx ? ctx.language : DEFAULT_LANGUAGE;
  const callable = (key: TranslationKey, params?: Record<string, string | number>) => fn(key, params);

  return Object.assign(callable, {
    t: fn,
    language: lang,
  });
}

/**
 * Hook to access full language controls: { language, setLanguage, t, languages, isBeta }.
 */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key: TranslationKey, params?: Record<string, string | number>) => translate(key, DEFAULT_LANGUAGE, params),
      languages: LANGUAGE_OPTIONS,
      isBeta: (lang: AppLanguage) => lang === 'hil' && HILIGAYNON_BETA,
    };
  }
  return ctx;
}
