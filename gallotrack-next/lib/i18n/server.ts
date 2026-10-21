import {
  type AppLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
} from './types';

/**
 * Validates a language code against supported values; safely defaults to 'en'.
 * Safe to run on server and client.
 */
export function sanitizeLanguage(val: unknown): AppLanguage {
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(trimmed as AppLanguage)) {
      return trimmed as AppLanguage;
    }
  }
  return DEFAULT_LANGUAGE;
}

export const parseLanguage = sanitizeLanguage;

/**
 * Reads language from a server cookie store (e.g. Next.js App Router cookies() in layout.tsx or headers).
 * Safe for server components.
 */
export function getLanguageFromCookies(
  cookieStore?: { get: (name: string) => { value?: string } | undefined } | null
): AppLanguage {
  if (!cookieStore) return DEFAULT_LANGUAGE;
  try {
    const cookie = cookieStore.get(LANGUAGE_COOKIE);
    return sanitizeLanguage(cookie?.value);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
