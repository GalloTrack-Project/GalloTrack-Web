import type { AppLanguage } from './types';

export const HIL_MONTHS: readonly string[] = [
  'Enero',
  'Pebrero',
  'Marso',
  'Abril',
  'Mayo',
  'Hunyo',
  'Hulyo',
  'Agosto',
  'Septyembre',
  'Oktubre',
  'Nobyembre',
  'Disyembre',
] as const;

export const HIL_WEEKDAYS: readonly string[] = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miyerkoles',
  'Huwebes',
  'Biyernes',
  'Sabado',
] as const;

export const TL_MONTHS: readonly string[] = [
  'Enero',
  'Pebrero',
  'Marso',
  'Abril',
  'Mayo',
  'Hunyo',
  'Hulyo',
  'Agosto',
  'Setyembre',
  'Oktubre',
  'Nobyembre',
  'Disyembre',
] as const;

/**
 * Maps application language code to a runtime-supported Intl locale.
 * 'hil' is mapped to 'fil-PH' for numbers and currency.
 */
export function getIntlLocale(lang: AppLanguage): string {
  switch (lang) {
    case 'tl':
      return 'fil-PH';
    case 'hil':
      return 'fil-PH'; // Standard Philippine number, currency, and date conventions
    case 'en':
    default:
      return 'en-PH';
  }
}

/**
 * Parses date inputs safely avoiding UTC-to-local timezone shifts.
 * Strings in 'YYYY-MM-DD' format are parsed into local midnight of that exact day.
 */
export function parseLocalDate(input: Date | string | number | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    // YYYY-MM-DD pattern: avoid new Date("YYYY-MM-DD") which parses as UTC midnight
    const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const d = new Date(year, month, day, 12, 0, 0); // Noon prevents any daylight savings shift
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export interface DateFormatOptions {
  month?: 'numeric' | '2-digit' | 'short' | 'long';
  day?: 'numeric' | '2-digit';
  year?: 'numeric' | '2-digit';
  weekday?: 'narrow' | 'short' | 'long';
}

/**
 * Formats a date using the appropriate locale and custom Hiligaynon month/weekday dictionary.
 */
export function formatDate(
  input: Date | string | number | null | undefined,
  lang: AppLanguage = 'en',
  options: DateFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  const d = parseLocalDate(input);
  if (!d) return '—';

  if (lang === 'hil') {
    const year = d.getFullYear();
    const monthIdx = d.getMonth();
    const day = d.getDate();
    const weekdayIdx = d.getDay();

    const monthName = HIL_MONTHS[monthIdx];
    const weekdayName = options.weekday ? HIL_WEEKDAYS[weekdayIdx] : '';

    if (options.month === 'long') {
      return weekdayName ? `${weekdayName}, ${monthName} ${day}, ${year}` : `${monthName} ${day}, ${year}`;
    }
    if (options.month === 'short') {
      const shortMonth = monthName.slice(0, 3);
      return weekdayName ? `${weekdayName.slice(0, 3)}, ${shortMonth} ${day}, ${year}` : `${shortMonth} ${day}, ${year}`;
    }
  }

  const intlLocale = getIntlLocale(lang);
  try {
    return new Intl.DateTimeFormat(intlLocale, options as Intl.DateTimeFormatOptions).format(d);
  } catch {
    return d.toISOString().split('T')[0];
  }
}

export const formatDateSafe = formatDate;

/**
 * Formats a number with locale-appropriate thousand separators and decimals.
 */
export function formatNumber(
  num: number,
  lang: AppLanguage = 'en',
  options?: Intl.NumberFormatOptions
): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const locale = getIntlLocale(lang);
  return new Intl.NumberFormat(locale, options).format(num);
}

/**
 * Formats a currency amount in Philippine Pesos (₱).
 */
export function formatCurrency(
  amount: number,
  lang: AppLanguage = 'en',
  decimals = 2
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₱0.00';
  const locale = getIntlLocale(lang);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `₱${formatted}`;
}

/**
 * Formats a percentage string (e.g. 75.5%).
 */
export function formatPercent(
  percent: number,
  lang: AppLanguage = 'en',
  decimals = 1
): string {
  if (percent === null || percent === undefined || isNaN(percent)) return '0%';
  const locale = getIntlLocale(lang);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(percent);
  return `${formatted}%`;
}

/**
 * Application-level pluralization helper that does not depend on Intl.PluralRules.
 * Handles English, Tagalog, and Hiligaynon plural structures safely.
 *
 * Example:
 *   pluralize(1, 'chicken', 'chickens', 'en') -> "1 chicken"
 *   pluralize(3, 'chicken', 'chickens', 'en') -> "3 chickens"
 *   pluralize(1, 'manok', 'mga manok', 'tl') -> "1 manok"
 *   pluralize(3, 'manok', 'mga manok', 'tl') -> "3 mga manok"
 *   pluralize(1, 'manok', 'mga manok', 'hil') -> "1 ka manok"
 *   pluralize(3, 'manok', 'mga manok', 'hil') -> "3 ka mga manok"
 */
export function pluralize(
  count: number,
  singular: string,
  plural: string,
  lang: AppLanguage = 'en'
): string {
  if (lang === 'hil') {
    if (count === 1) return `1 ka ${singular}`;
    return `${formatNumber(count, lang)} ka mga ${singular}`;
  }

  if (lang === 'tl') {
    if (count === 1) return `1 ${singular}`;
    return `${formatNumber(count, lang)} mga ${singular}`;
  }

  // English
  if (count === 1) return `1 ${singular}`;
  return `${formatNumber(count, lang)} ${plural}`;
}
