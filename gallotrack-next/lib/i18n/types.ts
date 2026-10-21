import type { TranslationSchema } from './en';

export type AppLanguage = 'en' | 'tl' | 'hil';

export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = ['en', 'tl', 'hil'] as const;

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

export const LANGUAGE_COOKIE = 'gt-lang';

/**
 * Constant controlling the Beta marker next to Hiligaynon.
 * Per requirement, this disappears only when explicitly set to false after manual review.
 */
export const HILIGAYNON_BETA = true;

export interface LanguageOption {
  code: AppLanguage;
  name: string;
  nativeName: string;
  isBeta?: boolean;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog' },
  { code: 'hil', name: 'Hiligaynon', nativeName: 'Hiligaynon', isBeta: HILIGAYNON_BETA },
] as const;

/**
 * Recursively maps a canonical literal schema to require all keys with string leaf values.
 * Missing keys in Tagalog or Hiligaynon will fail compilation.
 */
type DeepStringify<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string;
};

/**
 * Translation dictionary contract.
 * Any language dictionary (Tagalog, Hiligaynon) MUST satisfy this contract.
 * If any key is missing or invalid, TypeScript will raise a compile-time error.
 */
export type AppTranslations = DeepStringify<TranslationSchema>;

// Helper to construct dot-separated paths for nested keys
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationSchema>;
