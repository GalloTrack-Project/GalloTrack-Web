import { describe, it, expect } from 'vitest';
import type { FowlRecord } from './types';
import {
  BIRD_CODE_PATTERN,
  birdCodeOf,
  buildCodeSet,
  generateBirdCode,
  isFemaleCode,
  isValidBirdCode,
  normalizeBirdCode,
  previewBirdCode,
  resolveBirdCodes,
  suffixForGender,
} from './bird-code';

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bloodline_pct: 100,
    ...partial,
  }) as FowlRecord;

describe('validation', () => {
  it('accepts the adviser coding scheme', () => {
    expect(isValidBirdCode('1A')).toBe(true);
    expect(isValidBirdCode('2B')).toBe(true);
    expect(isValidBirdCode('1Ax1B')).toBe(true);
    expect(isValidBirdCode('1Ax1B-2')).toBe(true);
    expect(isValidBirdCode('A-1')).toBe(true);
  });

  it('rejects empty and unsafe codes', () => {
    expect(isValidBirdCode('')).toBe(false);
    expect(isValidBirdCode('   ')).toBe(false);
    expect(isValidBirdCode('/1A')).toBe(false);
    expect(isValidBirdCode('1A/B')).toBe(false);
    expect(isValidBirdCode('a'.repeat(25))).toBe(false);
  });

  it('matches the documented pattern', () => {
    expect(BIRD_CODE_PATTERN.test('1Ax1B')).toBe(true);
    expect(BIRD_CODE_PATTERN.test('-1A')).toBe(false);
  });

  it('normalises whitespace and length', () => {
    expect(normalizeBirdCode(' 1 A ')).toBe('1A');
    expect(normalizeBirdCode('1Ax1B')).toBe('1Ax1B');
    expect(normalizeBirdCode('x'.repeat(50))).toHaveLength(24);
  });
});

describe('suffixForGender', () => {
  it('maps roosters to A (sire) and hens to B (dam)', () => {
    expect(suffixForGender('Rooster')).toBe('A');
    expect(suffixForGender('Hen')).toBe('B');
    expect(suffixForGender('Pullet')).toBe('B');
    expect(suffixForGender('')).toBe('A');
    expect(isFemaleCode('female')).toBe(true);
    expect(isFemaleCode('male')).toBe(false);
  });
});

describe('generateBirdCode', () => {
  it('starts foundation birds at 1A / 1B', () => {
    expect(generateBirdCode({ gender: 'Rooster', taken: new Set() })).toBe('1A');
    expect(generateBirdCode({ gender: 'Hen', taken: new Set() })).toBe('1B');
  });

  it('increments the sequence per suffix', () => {
    expect(generateBirdCode({ gender: 'Rooster', taken: buildCodeSet(['1A']) })).toBe('2A');
    expect(generateBirdCode({ gender: 'Hen', taken: buildCodeSet(['1A', '1B', '2B']) })).toBe('3B');
  });

  it('does not consume the other suffix sequence', () => {
    expect(generateBirdCode({ gender: 'Hen', taken: buildCodeSet(['1A', '2A', '3A']) })).toBe('1B');
  });

  it('combines parent codes for offspring (1A x 1B -> 1Ax1B)', () => {
    expect(generateBirdCode({ sireCode: '1A', damCode: '1B', taken: new Set() })).toBe('1Ax1B');
  });

  it('appends -2 for the next clutch mate of the same pair', () => {
    const taken = buildCodeSet(['1Ax1B']);
    expect(generateBirdCode({ sireCode: '1A', damCode: '1B', taken })).toBe('1Ax1B-2');
    const taken2 = buildCodeSet(['1Ax1B', '1Ax1B-2']);
    expect(generateBirdCode({ sireCode: '1A', damCode: '1B', taken: taken2 })).toBe('1Ax1B-3');
  });

  it('falls back to the sequence when a parent has no code', () => {
    expect(generateBirdCode({ sireCode: '1A', damCode: null, taken: buildCodeSet(['1A']), gender: 'Hen' })).toBe('1B');
  });

  it('is case-insensitive when checking collisions', () => {
    expect(generateBirdCode({ gender: 'Rooster', taken: buildCodeSet(['1a']) })).toBe('2A');
  });
});

describe('resolveBirdCodes', () => {
  it('keeps stored codes and fills the gaps', () => {
    const fowls = [
      bird({ id: 1, name: 'Alpha', bird_code: '7A' }),
      bird({ id: 2, name: 'Beta', gender: 'Hen' }),
    ];
    const codes = resolveBirdCodes(fowls);
    expect(codes.get('1')).toBe('7A');
    expect(codes.get('2')).toBe('1B');
  });

  it('assigns codes to parents before their offspring', () => {
    const fowls = [
      bird({ id: 3, name: 'Chick', sire: 'Sire One', dam: 'Dam One' }),
      bird({ id: 1, name: 'Sire One' }),
      bird({ id: 2, name: 'Dam One', gender: 'Hen' }),
    ];
    const codes = resolveBirdCodes(fowls);
    expect(codes.get('1')).toBe('1A');
    expect(codes.get('2')).toBe('1B');
    expect(codes.get('3')).toBe('1Ax1B');
  });

  it('never emits duplicate codes', () => {
    const fowls = [
      bird({ id: 1, name: 'A', bird_code: '1A' }),
      bird({ id: 2, name: 'B', bird_code: '1A' }),
      bird({ id: 3, name: 'C' }),
      bird({ id: 4, name: 'D' }),
    ];
    const codes = Array.from(resolveBirdCodes(fowls).values());
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('works on an empty registry', () => {
    expect(resolveBirdCodes([]).size).toBe(0);
  });
});

describe('birdCodeOf', () => {
  it('prefers the stored code', () => {
    const fowls = [bird({ id: 1, name: 'A', bird_code: '9A' })];
    expect(birdCodeOf(fowls[0], fowls)).toBe('9A');
  });

  it('derives one when missing', () => {
    const fowls = [bird({ id: 1, name: 'A' })];
    expect(birdCodeOf(fowls[0], fowls)).toBe('1A');
  });

  it('returns empty for no fowl', () => {
    expect(birdCodeOf(null, [])).toBe('');
  });
});

describe('previewBirdCode', () => {
  const fowls = [
    bird({ id: 1, name: 'Sire One', bird_code: '1A' }),
    bird({ id: 2, name: 'Dam One', gender: 'Hen', bird_code: '1B' }),
  ];

  it('previews the offspring combination code', () => {
    expect(previewBirdCode({ gender: 'Rooster', sireName: 'Sire One', damName: 'Dam One', fowls })).toBe('1Ax1B');
  });

  it('previews a sequence code when no parents are picked', () => {
    expect(previewBirdCode({ gender: 'Hen', fowls })).toBe('2B');
    expect(previewBirdCode({ gender: 'Rooster', fowls })).toBe('2A');
  });

  it('avoids codes already taken', () => {
    const codes = resolveBirdCodes([...fowls, bird({ id: 3, name: 'Kid', sire: 'Sire One', dam: 'Dam One' })]);
    const taken = buildCodeSet(Array.from(codes.values()));
    expect(previewBirdCode({ gender: 'Rooster', sireName: 'Sire One', damName: 'Dam One', fowls, taken })).toBe(
      '1Ax1B-2'
    );
  });
});
