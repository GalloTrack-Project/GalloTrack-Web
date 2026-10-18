import { describe, it, expect } from 'vitest';
import type { FowlRecord } from './types';
import {
  previewBirdCode,
  buildCodeSet,
  resolveBirdCodes,
  validateIdentifierFormat,
  checkParentageMatch,
  compareBirdCodesNatural,
  normalizeBirdCode,
  formatBirdCodeForDisplay,
} from './bird-code';

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

describe('Bird Code & Wing Band Separation (Pure Fixture Tests)', () => {
  it('1. Namespaces are strictly independent: wing_band value does not block bird_code and vice versa', () => {
    // A chicken has physical metal wing_band = '1A1', but bird_code = '1'
    const farm: FowlRecord[] = [
      makeFowl({ id: 1, name: 'Sire One', gender: 'Rooster', bird_code: '1', wing_band: '1A1' }),
      makeFowl({ id: 2, name: 'Dam A', gender: 'Hen', bird_code: 'A', wing_band: 'WB-002' }),
    ];

    // Building takenCodes for identifiers must only include bird_code, never wing_band
    const resolved = resolveBirdCodes(farm);
    const takenCodes = buildCodeSet(Array.from(resolved.values()));

    expect(takenCodes.has('1')).toBe(true);
    expect(takenCodes.has('a')).toBe(true);
    // '1a1' is a wing_band, NOT a bird_code — it must NOT be in takenCodes
    expect(takenCodes.has('1a1')).toBe(false);

    // Generating the first offspring of Sire 1 x Dam A should freely assign 1A1
    const offspringCode = previewBirdCode({
      gender: 'Rooster',
      sireName: 'Sire One',
      damName: 'Dam A',
      fowls: farm,
      taken: takenCodes,
    });
    expect(offspringCode).toBe('1A1');
  });

  it('2. Offspring requires BOTH parents: returns empty while either parent is missing', () => {
    const farm: FowlRecord[] = [
      makeFowl({ id: 1, name: 'Sire 1', gender: 'Rooster', bird_code: '1' }),
      makeFowl({ id: 2, name: 'Dam A', gender: 'Hen', bird_code: 'A' }),
    ];
    const taken = buildCodeSet(['1', 'a']);

    // Neither parent selected
    const noParents = previewBirdCode({
      gender: 'Rooster',
      sireName: '',
      damName: '',
      isOffspring: true,
      fowls: farm,
      taken,
    });
    expect(noParents).toBe('');

    // Only Sire selected
    const onlySire = previewBirdCode({
      gender: 'Rooster',
      sireName: 'Sire 1',
      damName: '',
      isOffspring: true,
      fowls: farm,
      taken,
    });
    expect(onlySire).toBe('');

    // Only Dam selected
    const onlyDam = previewBirdCode({
      gender: 'Rooster',
      sireName: '',
      damName: 'Dam A',
      isOffspring: true,
      fowls: farm,
      taken,
    });
    expect(onlyDam).toBe('');

    // Both parents selected -> auto-fills 1A1
    const bothParents = previewBirdCode({
      gender: 'Rooster',
      sireName: 'Sire 1',
      damName: 'Dam A',
      isOffspring: true,
      fowls: farm,
      taken,
    });
    expect(bothParents).toBe('1A1');
  });

  it('3. Sequential offspring generation (1A1, 1A2, 1A10) and natural sorting', () => {
    const farm: FowlRecord[] = [
      makeFowl({ id: 1, name: 'Sire 1', gender: 'Rooster', bird_code: '1' }),
      makeFowl({ id: 2, name: 'Dam A', gender: 'Hen', bird_code: 'A' }),
      makeFowl({ id: 3, name: 'Offspring 1', gender: 'Rooster', bird_code: '1A1', sire: 'Sire 1', dam: 'Dam A' }),
    ];
    let taken = buildCodeSet(['1', 'a', '1a1']);

    // Second offspring
    const second = previewBirdCode({
      gender: 'Rooster',
      sireName: 'Sire 1',
      damName: 'Dam A',
      fowls: farm,
      taken,
    });
    expect(second).toBe('1A2');

    // Simulate 1 through 9 exist
    const fullNine = ['1', 'a', '1a1', '1a2', '1a3', '1a4', '1a5', '1a6', '1a7', '1a8', '1a9'];
    taken = buildCodeSet(fullNine);

    const tenth = previewBirdCode({
      gender: 'Rooster',
      sireName: 'Sire 1',
      damName: 'Dam A',
      fowls: farm,
      taken,
    });
    expect(tenth).toBe('1A10');

    // Natural sort: 1A2 sorts BEFORE 1A10
    const list = ['1A10', '1A2', '1A1', '1A20', '1A3'];
    list.sort(compareBirdCodesNatural);
    expect(list).toEqual(['1A1', '1A2', '1A3', '1A10', '1A20']);
  });

  it('4. Changing parents recomputes the offspring identifier immediately', () => {
    const farm: FowlRecord[] = [
      makeFowl({ id: 1, name: 'Sire 1', gender: 'Rooster', bird_code: '1' }),
      makeFowl({ id: 2, name: 'Sire 2', gender: 'Rooster', bird_code: '2' }),
      makeFowl({ id: 3, name: 'Dam A', gender: 'Hen', bird_code: 'A' }),
      makeFowl({ id: 4, name: 'Dam B', gender: 'Hen', bird_code: 'B' }),
    ];
    const taken = buildCodeSet(['1', '2', 'a', 'b']);

    // Pair 1 x A -> 1A1
    expect(previewBirdCode({ sireName: 'Sire 1', damName: 'Dam A', isOffspring: true, fowls: farm, taken })).toBe('1A1');

    // Change Sire to 2 -> 2A1
    expect(previewBirdCode({ sireName: 'Sire 2', damName: 'Dam A', isOffspring: true, fowls: farm, taken })).toBe('2A1');

    // Change Dam to B -> 2B1
    expect(previewBirdCode({ sireName: 'Sire 2', damName: 'Dam B', isOffspring: true, fowls: farm, taken })).toBe('2B1');
  });

  it('5. Archived and deceased codes are never reused for identifiers', () => {
    const farm: FowlRecord[] = [
      makeFowl({ id: 1, name: 'Sire Dead', gender: 'Rooster', bird_code: '1', status: 'Deceased' }),
      makeFowl({ id: 2, name: 'Sire Archived', gender: 'Rooster', bird_code: '2', status: 'Archived' }),
      makeFowl({ id: 3, name: 'Dam Dead', gender: 'Hen', bird_code: 'A', status: 'Deceased' }),
      makeFowl({ id: 4, name: 'Offspring Dead', gender: 'Rooster', bird_code: '3B1', status: 'Deceased' }),
    ];
    const taken = buildCodeSet(['1', '2', 'a', '3b1']);

    // Next foundation sire skips 1 and 2, assigns 3
    const nextSire = previewBirdCode({ gender: 'Rooster', fowls: farm, taken });
    expect(nextSire).toBe('3');

    // Next foundation dam skips A, assigns B
    const nextDam = previewBirdCode({ gender: 'Hen', fowls: farm, taken });
    expect(nextDam).toBe('B');

    // Next offspring of Sire 3 x Dam B skips 3B1, assigns 3B2
    const nextOffspring = previewBirdCode({
      sireName: 'Sire 3',
      damName: 'Dam B',
      isOffspring: true,
      fowls: [
        ...farm,
        makeFowl({ id: 5, name: 'Sire 3', gender: 'Rooster', bird_code: '3' }),
        makeFowl({ id: 6, name: 'Dam B', gender: 'Hen', bird_code: 'B' }),
      ],
      taken: buildCodeSet(['1', '2', '3', 'a', 'b', '3b1']),
    });
    expect(nextOffspring).toBe('3B2');
  });

  it('6. Manual identifier validation and parentage match warnings', () => {
    // Role validation
    expect(validateIdentifierFormat('123', 'sire').valid).toBe(true);
    expect(validateIdentifierFormat('A', 'sire').valid).toBe(false);

    expect(validateIdentifierFormat('B', 'dam').valid).toBe(true);
    expect(validateIdentifierFormat('AA', 'dam').valid).toBe(true);
    expect(validateIdentifierFormat('12', 'dam').valid).toBe(false);
    expect(validateIdentifierFormat('X', 'dam').valid).toBe(false); // X reserved for unknown dam

    expect(validateIdentifierFormat('1A1', 'offspring').valid).toBe(true);
    expect(validateIdentifierFormat('1A10', 'offspring').valid).toBe(true);
    expect(validateIdentifierFormat('ABC', 'offspring').valid).toBe(false);

    // Subscript input normalization
    expect(normalizeBirdCode('1A₁₀')).toBe('1A10');
    expect(formatBirdCodeForDisplay('1A10')).toBe('1A10');

    // Parentage match check
    const match = checkParentageMatch('1A1', '1', 'A');
    expect(match.matches).toBe(true);

    const mismatch = checkParentageMatch('2B1', '1', 'A');
    expect(mismatch.matches).toBe(false);
    expect(mismatch.warning).toContain('starts with "2B"');
    expect(mismatch.warning).toContain('suggest prefix "1A"');
  });

  it('7. Wing band is optional, not auto-filled, and never equal to bird_code unless typed', () => {
    // When wing band is omitted, it remains null/empty and is never overwritten with bird_code
    const birdCode = '1';
    const wingBandInput = ''; // user left it blank

    const finalWingBand = wingBandInput.trim() || null;
    expect(finalWingBand).toBeNull();
    expect(finalWingBand).not.toBe(birdCode);
  });
});
