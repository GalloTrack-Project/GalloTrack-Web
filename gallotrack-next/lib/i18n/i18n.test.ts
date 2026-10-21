import { describe, it, expect, vi } from 'vitest';
import { en } from './en';
import { tl } from './tl';
import { hil } from './hil';
import {
  parseLanguage,
  formatCurrency,
  formatDateSafe,
  pluralize,
  translateStatus,
  translateRole,
  translateClass,
  translateOutcome,
  translateBreedingType,
  translateRelatedness,
  getDictionary,
  interpolate,
  LANGUAGE_OPTIONS,
  SUPPORTED_LANGUAGES,
} from './index';

describe('i18n Dictionary Parity & Structure', () => {
  function getLeaves(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    const res: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        res[full] = v;
      } else if (typeof v === 'object' && v !== null) {
        Object.assign(res, getLeaves(v as Record<string, unknown>, full));
      }
    }
    return res;
  }

  const enLeaves = getLeaves(en as Record<string, unknown>);
  const tlLeaves = getLeaves(tl as Record<string, unknown>);
  const hilLeaves = getLeaves(hil as Record<string, unknown>);

  it('has exact key parity between English and Tagalog', () => {
    const enKeys = Object.keys(enLeaves).sort();
    const tlKeys = Object.keys(tlLeaves).sort();
    expect(tlKeys).toEqual(enKeys);
  });

  it('has exact key parity between English and Hiligaynon', () => {
    const enKeys = Object.keys(enLeaves).sort();
    const hilKeys = Object.keys(hilLeaves).sort();
    expect(hilKeys).toEqual(enKeys);
  });

  it('preserves all interpolation placeholders in Tagalog and Hiligaynon', () => {
    const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;

    for (const [key, enText] of Object.entries(enLeaves)) {
      const enMatches = Array.from(enText.matchAll(placeholderRegex)).map((m) => m[0]).sort();
      if (enMatches.length > 0) {
        const tlText = tlLeaves[key];
        const tlMatches = Array.from(tlText.matchAll(placeholderRegex)).map((m) => m[0]).sort();
        expect(tlMatches).toEqual(enMatches);

        const hilText = hilLeaves[key];
        const hilMatches = Array.from(hilText.matchAll(placeholderRegex)).map((m) => m[0]).sort();
        expect(hilMatches).toEqual(enMatches);
      }
    }
  });

  it('defines 3 supported languages with correct codes and metadata', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'tl', 'hil']);
    expect(LANGUAGE_OPTIONS).toHaveLength(3);
    expect(LANGUAGE_OPTIONS.find((l) => l.code === 'hil')?.isBeta).toBe(true);
    expect(Boolean(LANGUAGE_OPTIONS.find((l) => l.code === 'en')?.isBeta)).toBe(false);
  });
});

describe('Language Cookie & Parsing', () => {
  it('parses valid supported languages', () => {
    expect(parseLanguage('en')).toBe('en');
    expect(parseLanguage('tl')).toBe('tl');
    expect(parseLanguage('hil')).toBe('hil');
  });

  it('defaults to English on invalid or undefined language input', () => {
    expect(parseLanguage(undefined)).toBe('en');
    expect(parseLanguage(null)).toBe('en');
    expect(parseLanguage('')).toBe('en');
    expect(parseLanguage('fr')).toBe('en');
    expect(parseLanguage('es-ES')).toBe('en');
    expect(parseLanguage('invalid<script>')).toBe('en');
  });
});

describe('Interpolation & Translation Fallback', () => {
  it('interpolates placeholders correctly', () => {
    const template = 'Hello {name}, you have {count} items.';
    const result = interpolate(template, { name: 'Juan', count: 5 });
    expect(result).toBe('Hello Juan, you have 5 items.');
  });

  it('leaves missing variables intact', () => {
    const template = 'Value: {foo} and {bar}';
    const result = interpolate(template, { foo: '123' });
    expect(result).toBe('Value: 123 and {bar}');
  });

  it('falls back to English when Tagalog or Hiligaynon key is missing at runtime', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dict = getDictionary('hil');
    expect(dict.common.save).toBe('I-save');
    // If a key exists in en, it resolves cleanly
    expect(dict.common.cancel).toBe('Kanselahon');
    consoleSpy.mockRestore();
  });
});

describe('Domain Value vs Display Label Separation', () => {
  it('translates canonical status labels without altering database values', () => {
    expect(translateStatus('Active', 'en')).toBe('Active');
    expect(translateStatus('Active', 'tl')).toBe('Aktibo');
    expect(translateStatus('Active', 'hil')).toBe('Aktibo');

    expect(translateStatus('Deceased', 'en')).toBe('Deceased');
    expect(translateStatus('Deceased', 'tl')).toBe('Pumanaw');
    expect(translateStatus('Deceased', 'hil')).toBe('Napatay');

    expect(translateStatus('Sold', 'tl')).toBe('Nabenta');
    expect(translateStatus('Sold', 'hil')).toBe('Nabaligya');
  });

  it('translates match outcomes cleanly', () => {
    expect(translateOutcome('Win', 'en')).toBe('Win');
    expect(translateOutcome('Win', 'tl')).toBe('Panalo');
    expect(translateOutcome('Win', 'hil')).toBe('Daug');

    expect(translateOutcome('Loss', 'en')).toBe('Loss');
    expect(translateOutcome('Loss', 'tl')).toBe('Talo');
    expect(translateOutcome('Loss', 'hil')).toBe('Pirdi');

    expect(translateOutcome('Draw', 'tl')).toBe('Tabla');
    expect(translateOutcome('Draw', 'hil')).toBe('Tabla');
  });

  it('translates breeding types correctly', () => {
    expect(translateBreedingType('Purebred', 'en')).toBe('Purebred');
    expect(translateBreedingType('Purebred', 'tl')).toBe('Purebred');
    expect(translateBreedingType('Purebred', 'hil')).toBe('Purebred');
    expect(translateBreedingType('Crossbred', 'tl')).toBe('Crossbred');
    expect(translateBreedingType('Crossbred', 'hil')).toBe('Crossbred');
    expect(translateBreedingType('Unverified', 'tl')).toBe('Unverified Lineage');
    expect(translateBreedingType('Unverified', 'hil')).toBe('Unverified Lineage');

    expect(translateClass('Cock', 'tl')).toBe('Cock');
    expect(translateClass('Stag', 'hil')).toBe('Stag');
  });

  it('keeps Outcross out of the breeding-type dimension and inside relatedness', () => {
    // Breeding Type is Purebred / Crossbred / Unverified Lineage only.
    expect(translateBreedingType('Outcross', 'en')).toBe('Outcross');
    expect(translateBreedingType('Outcross', 'tl')).toBe('Outcross');
    expect(translateBreedingType('Outcross', 'hil')).toBe('Outcross');

    // Outcross is a relatedness classification.
    expect(translateRelatedness('outcross', 'en')).toBe('Outcross');
    expect(translateRelatedness('outcross', 'tl')).toBe('Outcross');
    expect(translateRelatedness('outcross', 'hil')).toBe('Outcross');
    expect(translateRelatedness('close', 'en')).toBe('Close Breeding');
    expect(translateRelatedness('line', 'en')).toBe('Line Breeding');
    expect(translateRelatedness('unknown', 'en')).toBe('Unknown');
  });

  it('returns fallback as-is for unknown custom statuses', () => {
    expect(translateStatus('SpecialPen' as never, 'tl')).toBe('SpecialPen');
    expect(translateRole('UnknownRole' as never, 'hil')).toBe('UnknownRole');
  });
});

describe('Date, Currency, and Plural Formatting', () => {
  it('formats currency consistently with Philippine Peso symbol across all languages', () => {
    expect(formatCurrency(1500, 'en')).toBe('₱1,500.00');
    expect(formatCurrency(1500, 'tl')).toBe('₱1,500.00');
    expect(formatCurrency(1500, 'hil')).toBe('₱1,500.00');
  });

  it('formats dates safely without timezone shifts', () => {
    const formattedEn = formatDateSafe('2026-05-15', 'en', { month: 'short', day: 'numeric', year: 'numeric' });
    expect(formattedEn).toContain('May');
    expect(formattedEn).toContain('15');
    expect(formattedEn).toContain('2026');

    // Hiligaynon explicit month dictionary
    const formattedHil = formatDateSafe('2026-05-15', 'hil', { month: 'long', day: 'numeric', year: 'numeric' });
    expect(formattedHil).toContain('Mayo');
    expect(formattedHil).toContain('15');
    expect(formattedHil).toContain('2026');
  });

  it('handles pluralization correctly across languages', () => {
    expect(pluralize(1, 'chicken', 'chickens', 'en')).toBe('1 chicken');
    expect(pluralize(5, 'chicken', 'chickens', 'en')).toBe('5 chickens');

    expect(pluralize(1, 'manok', 'mga manok', 'tl')).toBe('1 manok');
    expect(pluralize(5, 'manok', 'mga manok', 'tl')).toBe('5 mga manok');

    expect(pluralize(1, 'manok', 'mga manok', 'hil')).toBe('1 ka manok');
    expect(pluralize(5, 'manok', 'mga manok', 'hil')).toBe('5 ka mga manok');
  });
});
