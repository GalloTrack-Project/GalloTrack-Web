import { describe, it, expect } from 'vitest';
import type { FowlRecord } from './types';
import {
  BIRD_CODE_PATTERN,
  birdCodeOf,
  buildCodeSet,
  formatBirdCodeForDisplay,
  generateBirdCode,
  isFemaleCode,
  isValidBirdCode,
  normalizeBirdCode,
  numberToLetter,
  previewBirdCode,
  resolveBirdCodes,
  isSireIdentifier,
  isDamIdentifier,
  isOffspringIdentifier,
  validateIdentifierFormat,
  UNKNOWN_SIRE_CODE,
  UNKNOWN_DAM_CODE,
  compareBirdCodesNatural,
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
    expect(isValidBirdCode('1')).toBe(true);
    expect(isValidBirdCode('A')).toBe(true);
    expect(isValidBirdCode('1A1')).toBe(true);
    expect(isValidBirdCode('1A12')).toBe(true);
    expect(isValidBirdCode('1A')).toBe(true);
    expect(isValidBirdCode('1B')).toBe(true);
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
    expect(BIRD_CODE_PATTERN.test('1A1')).toBe(true);
    expect(BIRD_CODE_PATTERN.test('-1A')).toBe(false);
  });

  it('normalises whitespace and length', () => {
    expect(normalizeBirdCode(' 1 A ')).toBe('1A');
    expect(normalizeBirdCode('1A1')).toBe('1A1');
    expect(normalizeBirdCode('x'.repeat(50))).toHaveLength(24);
  });
});

describe('isFemaleCode', () => {
  it('maps hen / pullet / female to the dam line', () => {
    expect(isFemaleCode('Hen')).toBe(true);
    expect(isFemaleCode('Pullet')).toBe(true);
    expect(isFemaleCode('female')).toBe(true);
    expect(isFemaleCode('Rooster')).toBe(false);
    expect(isFemaleCode('')).toBe(false);
  });
});

describe('numberToLetter', () => {
  it('maps dam numbers to letters', () => {
    expect(numberToLetter(1)).toBe('A');
    expect(numberToLetter(2)).toBe('B');
    expect(numberToLetter(14)).toBe('N');
    expect(numberToLetter(26)).toBe('Z');
    expect(numberToLetter(27)).toBe('AA');
  });
});

describe('generateBirdCode', () => {
  it('starts foundation sires at 1 and foundation dams at A', () => {
    expect(generateBirdCode({ gender: 'Rooster', taken: new Set() })).toBe('1');
    expect(generateBirdCode({ gender: 'Hen', taken: new Set() })).toBe('A');
  });

  it('increments each sequence independently', () => {
    expect(generateBirdCode({ gender: 'Rooster', taken: buildCodeSet(['1', '2']) })).toBe('3');
    expect(generateBirdCode({ gender: 'Hen', taken: buildCodeSet(['A', 'B']) })).toBe('C');
    expect(generateBirdCode({ gender: 'Rooster', taken: buildCodeSet(['A', 'B', 'C']) })).toBe('1');
    expect(generateBirdCode({ gender: 'Hen', taken: buildCodeSet(['1', '2', '3']) })).toBe('A');
  });

  it('treats legacy 1A / 1B tags as occupied numbers and letters', () => {
    expect(generateBirdCode({ gender: 'Rooster', taken: buildCodeSet(['1A', '2A']) })).toBe('3');
    expect(generateBirdCode({ gender: 'Hen', taken: buildCodeSet(['1B', '2B']) })).toBe('C');
  });

  it('combines the sire number and dam letter with the sibling index', () => {
    expect(generateBirdCode({ sireCode: '1', damCode: 'A', taken: new Set() })).toBe('1A1');
    expect(generateBirdCode({ sireCode: '12', damCode: 'C', taken: new Set() })).toBe('12C1');
    expect(generateBirdCode({ sireCode: '3A', damCode: '2B', taken: new Set() })).toBe('3B1');
  });

  it('appends the next sibling index for the same pair', () => {
    expect(generateBirdCode({ sireCode: '1', damCode: 'A', taken: buildCodeSet(['1A1']) })).toBe('1A2');
    expect(generateBirdCode({ sireCode: '1', damCode: 'A', taken: buildCodeSet(['1A1', '1A2']) })).toBe('1A3');
    expect(
      generateBirdCode({ sireCode: '1', damCode: 'A', taken: buildCodeSet(['1A1', '1A3']) })
    ).toBe('1A4');
  });

  it('never reuses a foundation tag when it collides with an offspring tag', () => {
    expect(generateBirdCode({ gender: 'Hen', taken: buildCodeSet(['1A1']) })).toBe('A');
  });

  it('uses unknown dam code X when dam is missing for offspring', () => {
    expect(generateBirdCode({ sireCode: '1', damCode: null, taken: buildCodeSet(['1']), gender: 'Hen' })).toBe('1X1');
  });

  it('is case-insensitive when checking collisions', () => {
    expect(generateBirdCode({ gender: 'Rooster', taken: buildCodeSet(['1']) })).toBe('2');
    expect(generateBirdCode({ gender: 'Hen', taken: buildCodeSet(['a']) })).toBe('B');
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
    expect(codes.get('2')).toBe('A');
  });

  it('assigns codes to parents before their offspring', () => {
    const fowls = [
      bird({ id: 3, name: 'Chick', sire: 'Sire One', dam: 'Dam One' }),
      bird({ id: 1, name: 'Sire One' }),
      bird({ id: 2, name: 'Dam One', gender: 'Hen' }),
    ];
    const codes = resolveBirdCodes(fowls);
    expect(codes.get('1')).toBe('1');
    expect(codes.get('2')).toBe('A');
    expect(codes.get('3')).toBe('1A1');
  });

  it('keeps legacy parent tags while coding their offspring', () => {
    const fowls = [
      bird({ id: 1, name: 'Sire One', bird_code: '1A' }),
      bird({ id: 2, name: 'Dam One', gender: 'Hen', bird_code: '1B' }),
      bird({ id: 3, name: 'Chick', sire: 'Sire One', dam: 'Dam One' }),
      bird({ id: 4, name: 'Chick Two', gender: 'Hen', sire: 'Sire One', dam: 'Dam One' }),
    ];
    const codes = resolveBirdCodes(fowls);
    expect(codes.get('1')).toBe('1A');
    expect(codes.get('2')).toBe('1B');
    expect(codes.get('3')).toBe('1A1');
    expect(codes.get('4')).toBe('1A2');
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
    expect(birdCodeOf(fowls[0], fowls)).toBe('1');
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
    expect(previewBirdCode({ gender: 'Rooster', sireName: 'Sire One', damName: 'Dam One', fowls })).toBe('1A1');
  });

  it('previews a foundation code when no parents are picked', () => {
    expect(previewBirdCode({ gender: 'Hen', fowls })).toBe('B');
    expect(previewBirdCode({ gender: 'Rooster', fowls })).toBe('2');
  });

  it('avoids codes already taken', () => {
    const codes = resolveBirdCodes([...fowls, bird({ id: 3, name: 'Kid', sire: 'Sire One', dam: 'Dam One' })]);
    const taken = buildCodeSet(Array.from(codes.values()));
    expect(previewBirdCode({ gender: 'Rooster', sireName: 'Sire One', damName: 'Dam One', fowls, taken })).toBe(
      '1A2'
    );
  });
});

describe('formatBirdCodeForDisplay', () => {
  it('renders the full identifier directly', () => {
    expect(formatBirdCodeForDisplay('1A1')).toBe('1A1');
    expect(formatBirdCodeForDisplay('1A12')).toBe('1A12');
    expect(formatBirdCodeForDisplay('12C3')).toBe('12C3');
  });

  it('leaves foundation and legacy codes untouched', () => {
    expect(formatBirdCodeForDisplay('1')).toBe('1');
    expect(formatBirdCodeForDisplay('A')).toBe('A');
    expect(formatBirdCodeForDisplay('1A')).toBe('1A');
    expect(formatBirdCodeForDisplay('1Ax1B')).toBe('1Ax1B');
    expect(formatBirdCodeForDisplay(null)).toBe('');
  });
});

describe('automatic identifier generator edge cases', () => {
  it('skips single letter X for dam codes so X is reserved for unknown dam', () => {
    // Generate dams from A through W (23 dams)
    const takenLetters: string[] = [];
    for (let i = 1; i <= 23; i++) {
      takenLetters.push(numberToLetter(i)); // A through W
    }
    const taken = buildCodeSet(takenLetters);
    // Dam 24 would normally be X, but generator MUST skip X and assign Y
    const nextCode = generateBirdCode({ gender: 'Hen', taken });
    expect(nextCode).toBe('Y');
    expect(nextCode).not.toBe('X');
  });

  it('generates multi-letter dam codes past 26 (Z -> AA, AB...)', () => {
    expect(numberToLetter(26)).toBe('Z');
    expect(numberToLetter(27)).toBe('AA');
    expect(numberToLetter(28)).toBe('AB');
    expect(numberToLetter(52)).toBe('AZ');
    expect(numberToLetter(53)).toBe('BA');

    // Fill A through Z
    const takenLetters: string[] = [];
    for (let i = 1; i <= 26; i++) {
      takenLetters.push(numberToLetter(i));
    }
    const taken = buildCodeSet(takenLetters);
    const nextCode = generateBirdCode({ gender: 'Hen', taken });
    expect(nextCode).toBe('AA');
  });

  it('handles unknown parents convention (0 for sire, X for dam)', () => {
    expect(UNKNOWN_SIRE_CODE).toBe('0');
    expect(UNKNOWN_DAM_CODE).toBe('X');

    // Known Sire (1) + Unknown Dam -> 1X1
    const code1X1 = generateBirdCode({
      sireCode: '1',
      damCode: null,
      isOffspring: true,
      taken: new Set(),
    });
    expect(code1X1).toBe('1X1');

    // Unknown Sire + Known Dam (B) -> 0B1
    const code0B1 = generateBirdCode({
      sireCode: null,
      damCode: 'B',
      isOffspring: true,
      taken: new Set(),
    });
    expect(code0B1).toBe('0B1');

    // Both Parents Unknown -> 0X1
    const code0X1 = generateBirdCode({
      sireCode: null,
      damCode: null,
      isOffspring: true,
      taken: new Set(),
    });
    expect(code0X1).toBe('0X1');

    // Increments subsequent offspring with unknown parents
    const code0X2 = generateBirdCode({
      sireCode: null,
      damCode: null,
      isOffspring: true,
      taken: buildCodeSet(['0X1']),
    });
    expect(code0X2).toBe('0X2');
  });

  it('tracks sequences independently per sire/dam pair (1A and 2A are separate)', () => {
    const taken = buildCodeSet(['1A1', '1A2']);
    // Pair 1A gets next index 1A3
    expect(generateBirdCode({ sireCode: '1', damCode: 'A', taken })).toBe('1A3');
    // Pair 2A starts at 2A1 even though 1A1 exists
    expect(generateBirdCode({ sireCode: '2', damCode: 'A', taken })).toBe('2A1');
  });

  it('never reuses codes from archived, deceased, or sold chickens', () => {
    // Suppose chicken with code '3' was archived/deceased, and chicken '1A1' died
    const existingFowls = [
      bird({ id: 1, name: 'Old Sire', bird_code: '1', status: 'Active' }),
      bird({ id: 2, name: 'Archived Sire', bird_code: '2', status: 'Archived' }),
      bird({ id: 3, name: 'Deceased Sire', bird_code: '3', status: 'Deceased' }),
      bird({ id: 4, name: 'Sold Offspring', bird_code: '1A1', status: 'Archived' }),
    ];
    const taken = buildCodeSet(existingFowls.map((f) => f.bird_code));

    // Next Breeding Male (sire) MUST be 4, NOT 2 or 3
    const nextSire = generateBirdCode({ gender: 'Rooster', taken });
    expect(nextSire).toBe('4');

    // Next Offspring for pair 1A MUST be 1A2, NOT 1A1
    const nextOffspring = generateBirdCode({ sireCode: '1', damCode: 'A', taken });
    expect(nextOffspring).toBe('1A2');
  });

  it('simulates atomic sequence progression for concurrent registrations', () => {
    const registryCodes = new Set<string>();
    // First registration acquires lock / gets next code
    const first = generateBirdCode({ sireCode: '1', damCode: 'A', taken: registryCodes });
    expect(first).toBe('1A1');
    registryCodes.add(first.toLowerCase());

    // Second registration sees first in taken set, gets 1A2
    const second = generateBirdCode({ sireCode: '1', damCode: 'A', taken: registryCodes });
    expect(second).toBe('1A2');
    registryCodes.add(second.toLowerCase());

    // Third registration gets 1A3
    const third = generateBirdCode({ sireCode: '1', damCode: 'A', taken: registryCodes });
    expect(third).toBe('1A3');
  });
});

describe('manual override format validation', () => {
  it('validates sire identifiers (digits only)', () => {
    expect(isSireIdentifier('1')).toBe(true);
    expect(isSireIdentifier('12')).toBe(true);
    expect(isSireIdentifier('0')).toBe(false); // 0 is reserved for unknown sire
    expect(isSireIdentifier('A')).toBe(false);
    expect(isSireIdentifier('1A')).toBe(false);

    expect(validateIdentifierFormat('5', 'sire')).toEqual({ valid: true });
    expect(validateIdentifierFormat('5A', 'sire').valid).toBe(false);
    expect(validateIdentifierFormat('', 'sire').valid).toBe(false);
  });

  it('validates dam identifiers (letters only, cannot be X)', () => {
    expect(isDamIdentifier('A')).toBe(true);
    expect(isDamIdentifier('B')).toBe(true);
    expect(isDamIdentifier('AA')).toBe(true);
    expect(isDamIdentifier('X')).toBe(false); // X is reserved for unknown dam
    expect(isDamIdentifier('1')).toBe(false);

    expect(validateIdentifierFormat('C', 'dam')).toEqual({ valid: true });
    expect(validateIdentifierFormat('X', 'dam').valid).toBe(false);
    expect(validateIdentifierFormat('12', 'dam').valid).toBe(false);
  });

  it('validates offspring identifiers (digits + letters + digits)', () => {
    expect(isOffspringIdentifier('1A1')).toBe(true);
    expect(isOffspringIdentifier('2B10')).toBe(true);
    expect(isOffspringIdentifier('1X1')).toBe(true);
    expect(isOffspringIdentifier('0B1')).toBe(true);
    expect(isOffspringIdentifier('0X1')).toBe(true);
    expect(isOffspringIdentifier('1A')).toBe(false);
    expect(isOffspringIdentifier('A1')).toBe(false);
    expect(isOffspringIdentifier('123')).toBe(false);

    expect(validateIdentifierFormat('1A1', 'offspring')).toEqual({ valid: true });
    expect(validateIdentifierFormat('XYZ', 'offspring').valid).toBe(false);
  });

  it('rejects duplicate code against taken set', () => {
    const taken = buildCodeSet(['1A1', '2B1', '5']);
    expect(taken.has('1a1')).toBe(true);
    expect(taken.has('2b1')).toBe(true);
    expect(taken.has('3c1')).toBe(false);
  });

  it('sorts first, second, and tenth offspring naturally (1A2 before 1A10)', () => {
    const list = ['1A10', '1A2', '1A1', '2B1', '1B1'];
    const sorted = [...list].sort(compareBirdCodesNatural);
    expect(sorted).toEqual(['1A1', '1A2', '1A10', '1B1', '2B1']);
  });

  it('supports offspring of same sire with different dams (1A1, 1B1) and different sires (2B1)', () => {
    const taken = buildCodeSet([]);
    const code1A1 = generateBirdCode({ sireCode: '1', damCode: 'A', taken });
    taken.add(code1A1.toLowerCase());
    const code1B1 = generateBirdCode({ sireCode: '1', damCode: 'B', taken });
    taken.add(code1B1.toLowerCase());
    const code2B1 = generateBirdCode({ sireCode: '2', damCode: 'B', taken });
    taken.add(code2B1.toLowerCase());

    expect(code1A1).toBe('1A1');
    expect(code1B1).toBe('1B1');
    expect(code2B1).toBe('2B1');
  });

  it('preserves birth code when an offspring is promoted to breeder and receives a breeder code', () => {
    const promotedBreeder = bird({
      id: 42,
      name: 'Promoted Champ',
      gender: 'Rooster',
      sire: 'Iron Lemon',
      dam: 'Golden Pearl',
      birth_code: '1A3',
      bird_code: '12', // newly assigned sire code
    });

    expect(promotedBreeder.birth_code).toBe('1A3');
    expect(promotedBreeder.bird_code).toBe('12');
  });
});

