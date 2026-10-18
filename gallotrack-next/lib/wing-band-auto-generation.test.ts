import { describe, it, expect } from 'vitest';
import type { FowlRecord } from './types';
import { previewBirdCode, buildCodeSet, resolveBirdCodes } from './bird-code';

const makeFowl = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bloodline_pct: 100,
    status: 'Active',
    ...partial,
  }) as FowlRecord;

describe('Unique Chicken Identifier Auto-Generation Logic', () => {
  it('Breeding Male (Sire): automatically assigns/suggests plain sequential numbers (1, 2, 3)', () => {
    const fowls: FowlRecord[] = [];
    // First foundation sire
    const sire1 = previewBirdCode({
      gender: 'Rooster',
      sireName: '',
      damName: '',
      fowls,
    });
    expect(sire1).toBe('1');

    // Existing sire with wing band '1'
    const farmWithSire1 = [makeFowl({ id: 1, name: 'Sire One', gender: 'Rooster', wing_band: '1', bird_code: '1' })];
    const takenWith1 = buildCodeSet(['1']);
    const sire2 = previewBirdCode({
      gender: 'Rooster',
      sireName: '',
      damName: '',
      fowls: farmWithSire1,
      taken: takenWith1,
    });
    expect(sire2).toBe('2');

    // Existing sires with 1, 2
    const takenWith1And2 = buildCodeSet(['1', '2']);
    const sire3 = previewBirdCode({
      gender: 'Rooster',
      sireName: '',
      damName: '',
      fowls: farmWithSire1,
      taken: takenWith1And2,
    });
    expect(sire3).toBe('3');
  });

  it('Breeding Female (Dam): automatically assigns/suggests sequential single letters (A, B, C)', () => {
    const fowls: FowlRecord[] = [];
    // First foundation dam
    const damA = previewBirdCode({
      gender: 'Hen',
      sireName: '',
      damName: '',
      fowls,
    });
    expect(damA).toBe('A');

    // With existing dam A
    const takenWithA = buildCodeSet(['A']);
    const damB = previewBirdCode({
      gender: 'Hen',
      sireName: '',
      damName: '',
      fowls,
      taken: takenWithA,
    });
    expect(damB).toBe('B');

    // With existing dam A, B
    const takenWithAB = buildCodeSet(['A', 'B']);
    const damC = previewBirdCode({
      gender: 'Hen',
      sireName: '',
      damName: '',
      fowls,
      taken: takenWithAB,
    });
    expect(damC).toBe('C');
  });

  it('Non-Breeding (Offspring): combines Sire number + Dam letter + incremental counter (e.g., 1A1, 1A2, 2B1)', () => {
    const fowls: FowlRecord[] = [
      makeFowl({ id: 1, name: 'Sire Iron', gender: 'Rooster', bird_code: '1', wing_band: '1' }),
      makeFowl({ id: 2, name: 'Dam Gold', gender: 'Hen', bird_code: 'A', wing_band: 'A' }),
      makeFowl({ id: 3, name: 'Sire Titan', gender: 'Rooster', bird_code: '2', wing_band: '2' }),
      makeFowl({ id: 4, name: 'Dam Silver', gender: 'Hen', bird_code: 'B', wing_band: 'B' }),
    ];

    // Offspring 1 from Sire Iron (1) and Dam Gold (A) -> 1A1
    const off1 = previewBirdCode({
      gender: 'Rooster',
      sireName: 'Sire Iron',
      damName: 'Dam Gold',
      fowls,
    });
    expect(off1).toBe('1A1');

    // Offspring 2 from same pair when 1A1 already exists -> 1A2
    const fowlsWithOff1 = [
      ...fowls,
      makeFowl({ id: 5, name: 'Offspring 1', sire: 'Sire Iron', dam: 'Dam Gold', bird_code: '1A1', wing_band: '1A1' }),
    ];
    const takenWithOff1 = buildCodeSet(['1', 'A', '2', 'B', '1A1']);
    const off2 = previewBirdCode({
      gender: 'Hen',
      sireName: 'Sire Iron',
      damName: 'Dam Gold',
      fowls: fowlsWithOff1,
      taken: takenWithOff1,
    });
    expect(off2).toBe('1A2');

    // Offspring from Sire Titan (2) and Dam Silver (B) -> 2B1
    const offFrom2B = previewBirdCode({
      gender: 'Rooster',
      sireName: 'Sire Titan',
      damName: 'Dam Silver',
      fowls,
    });
    expect(offFrom2B).toBe('2B1');
  });

  it('keeps identifier collision set strictly independent from physical wing_band values', () => {
    const fowls: FowlRecord[] = [
      makeFowl({ id: 1, name: 'Sire Old', gender: 'Rooster', bird_code: '1', wing_band: '2' }),
    ];

    const birdCodes = resolveBirdCodes(fowls);
    // taken codes for bird_code must only include bird_code ('1'), never wing_band ('2')
    const taken = buildCodeSet(Array.from(birdCodes.values()));

    expect(taken.has('1')).toBe(true);
    expect(taken.has('2')).toBe(false);

    // Next Sire receives 2 because 2 is only taken as a physical wing_band, not a bird_code
    const nextSire = previewBirdCode({
      gender: 'Rooster',
      sireName: '',
      damName: '',
      fowls,
      taken,
    });
    expect(nextSire).toBe('2');
  });
});
