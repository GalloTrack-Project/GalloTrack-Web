import { describe, it, expect } from 'vitest';
import {
  isMale,
  isFemale,
  sexLabel,
  parentBreedOf,
  cleanPct,
  isFoundationStock,
  generationOfName,
  generationPurity,
  generationInfo,
  getAgeParts,
  calculatePairingStats,
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

describe('sexLabel', () => {
  it('returns Cock for males', () => {
    expect(sexLabel('Rooster')).toBe('Cock');
    expect(sexLabel('rooster')).toBe('Cock');
    expect(sexLabel('Cock')).toBe('Cock');
    expect(sexLabel('Stag')).toBe('Cock');
    expect(sexLabel('Male')).toBe('Cock');
    expect(sexLabel({ gender: 'Rooster' })).toBe('Cock');
  });

  it('returns Hen for females', () => {
    expect(sexLabel('Hen')).toBe('Hen');
    expect(sexLabel('HEN')).toBe('Hen');
    expect(sexLabel('Pullet')).toBe('Hen');
    expect(sexLabel('Female')).toBe('Hen');
    expect(sexLabel({ gender: 'Hen' })).toBe('Hen');
  });

  it('returns Unknown for everything else', () => {
    expect(sexLabel('')).toBe('Unknown');
    expect(sexLabel('Other')).toBe('Unknown');
    expect(sexLabel(undefined)).toBe('Unknown');
    expect(sexLabel(null)).toBe('Unknown');
    expect(sexLabel({})).toBe('Unknown');
  });
});

describe('parentBreedOf', () => {
  const fowls = [
    { name: 'Rex', breed: 'Kelso' },
    { name: 'Lady', breed: 'Hatch' },
  ];

  it('returns the breed of a registered parent (case-insensitive)', () => {
    expect(parentBreedOf('Rex', fowls)).toBe('Kelso');
    expect(parentBreedOf('  lady ', fowls)).toBe('Hatch');
  });

  it('returns empty for foundation stock, unknown, or blank names', () => {
    expect(parentBreedOf('Foundation Stock', fowls)).toBe('');
    expect(parentBreedOf('Unknown', fowls)).toBe('');
    expect(parentBreedOf('', fowls)).toBe('');
    expect(parentBreedOf(undefined, fowls)).toBe('');
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

describe('generationPurity (deprecated in favor of composition engine)', () => {
  it('returns legacy backcross formula values for historical compatibility', () => {
    expect(generationPurity(0)).toBe(100);
    const g1 = generationPurity(1);
    const g2 = generationPurity(2);
    expect(g1).toBe(50); // Legacy backcross formula (note: purebred F1 uses composition engine -> 100%)
    expect(g2).toBe(75);
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

describe('calculatePairingStats fowl_id isolation', () => {
  it('correctly attributes matches with fowl_id 7 to chicken id 7 and ignores matches with id 7 but fowl_id 9', () => {
    // Parent pairing produces offspring chicken with id: 7
    const fowls: FowlRecord[] = [
      {
        id: 7,
        name: 'Lucky Seven',
        sire: 'Sire King',
        dam: 'Dam Queen',
        gender: 'Male',
        breed: 'Kelso',
      } as FowlRecord,
    ];

    const matchHistory = [
      // Match 1: id: 101, fowl_id: 7 (Win for chicken 7) -> SHOULD BE COUNTED
      { id: 101, fowl_id: 7, entry_name: 'Lucky Seven', outcome: 'Win' },
      // Match 2: id: 102, fowl_id: 7 (Loss for chicken 7) -> SHOULD BE COUNTED
      { id: 102, fowl_id: 7, entry_name: 'Lucky Seven', outcome: 'Loss' },
      // Match 3: id: 7, fowl_id: 9 (Match id is 7, but fowl_id is 9!) -> MUST NOT BE COUNTED for chicken 7
      { id: 7, fowl_id: 9, entry_name: 'Other Bird Nine', outcome: 'Win' },
      // Match 4: id: 103, fowl_id: null (Orphan match with same name) -> MUST NOT BE COUNTED
      { id: 103, fowl_id: null, entry_name: 'Lucky Seven', outcome: 'Win' },
    ];

    const stats = calculatePairingStats(fowls, matchHistory);
    const pairing = stats.all.get('sire king|||dam queen');

    expect(pairing).toBeDefined();
    // Only the 2 matches with fowl_id: 7 should be counted
    expect(pairing?.totalFights).toBe(2);
    expect(pairing?.wins).toBe(1);
    expect(pairing?.losses).toBe(1);
    expect(pairing?.decided).toBe(2);
    expect(pairing?.winRate).toBe(50);
  });
});
