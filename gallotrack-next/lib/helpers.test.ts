import { describe, it, expect } from 'vitest';
import {
  isMale,
  isFemale,
  cleanPct,
  isFoundationStock,
  generationOfName,
  generationPurity,
  generationInfo,
  getAgeParts,
  getAgeLabel,
  getAgeExact,
} from './helpers';
import type { FowlRecord } from './types';

describe('isMale', () => {
  it('returns true for male variants', () => {
    expect(isMale('rooster')).toBe(true);
    expect(isMale('Cock')).toBe(true);
    expect(isMale('STAG')).toBe(true);
    expect(isMale('male')).toBe(true);
  });

  it('returns false for non-male', () => {
    expect(isMale('hen')).toBe(false);
    expect(isMale('female')).toBe(false);
    expect(isMale('')).toBe(false);
    expect(isMale(undefined)).toBe(false);
  });
});

describe('isFemale', () => {
  it('returns true for female variants', () => {
    expect(isFemale('hen')).toBe(true);
    expect(isFemale('Pullet')).toBe(true);
    expect(isFemale('FEMALE')).toBe(true);
  });

  it('returns false for non-female', () => {
    expect(isFemale('rooster')).toBe(false);
    expect(isFemale('')).toBe(false);
    expect(isFemale(undefined)).toBe(false);
  });
});

describe('cleanPct', () => {
  it('returns valid percentage', () => {
    expect(cleanPct(50)).toBe(50);
    expect(cleanPct('75')).toBe(75);
  });

  it('caps at 100', () => {
    expect(cleanPct(150)).toBe(100);
  });

  it('returns 0 for invalid', () => {
    expect(cleanPct(NaN)).toBe(0);
    expect(cleanPct(-5)).toBe(0);
    expect(cleanPct(0)).toBe(0);
  });
});

describe('isFoundationStock', () => {
  it('detects foundation stock', () => {
    expect(isFoundationStock('Foundation Stock')).toBe(true);
    expect(isFoundationStock('foundation stock')).toBe(true);
    expect(isFoundationStock('FOUNDATION STOCK')).toBe(true);
  });

  it('rejects non-foundation', () => {
    expect(isFoundationStock('Sweater')).toBe(false);
    expect(isFoundationStock('')).toBe(false);
  });
});

describe('generationOfName', () => {
  const fowls: FowlRecord[] = [
    { id: 1, name: 'Alpha', sire: '', dam: '', gender: 'male' } as FowlRecord,
    { id: 2, name: 'Beta', sire: 'Alpha', dam: '', gender: 'male' } as FowlRecord,
    { id: 3, name: 'Gamma', sire: 'Beta', dam: 'Alpha', gender: 'female' } as FowlRecord,
  ];

  it('returns 0 for foundation stock', () => {
    expect(generationOfName('Foundation Stock', fowls, new Map(), new Set())).toBe(0);
  });

  it('returns 0 for unknown', () => {
    expect(generationOfName('Unknown', fowls, new Map(), new Set())).toBe(0);
  });

  it('returns 0 for root with no parents in list', () => {
    expect(generationOfName('Alpha', fowls, new Map(), new Set())).toBe(0);
  });

  it('computes generation for child', () => {
    expect(generationOfName('Beta', fowls, new Map(), new Set())).toBe(1);
  });

  it('computes generation for grandchild', () => {
    expect(generationOfName('Gamma', fowls, new Map(), new Set())).toBe(2);
  });
});

describe('generationPurity', () => {
  it('returns 100 for generation 0', () => {
    expect(generationPurity(0)).toBe(100);
  });

  it('returns increasing purity for higher generations', () => {
    const g1 = generationPurity(1);
    const g2 = generationPurity(2);
    expect(g1).toBeGreaterThan(0);
    expect(g1).toBeLessThan(100);
    expect(g2).toBeGreaterThan(g1);
  });
});

describe('generationInfo', () => {
  it('returns foundation info', () => {
    const info = generationInfo(0);
    expect(info.short).toBe('F0');
    expect(info.label).toBe('Base Stock');
  });

  it('returns correct info for F1', () => {
    const info = generationInfo(1);
    expect(info.short).toBe('F1');
    expect(info.label).toContain('First Cross');
  });
});

describe('getAgeParts', () => {
  it('returns null for invalid input', () => {
    expect(getAgeParts(null)).toBe(null);
    expect(getAgeParts('')).toBe(null);
    expect(getAgeParts('invalid')).toBe(null);
  });

  it('parses valid birthdate', () => {
    const parts = getAgeParts('2025-01-01');
    expect(parts).not.toBe(null);
    expect(parts!.months).toBeGreaterThanOrEqual(0);
  });
});
