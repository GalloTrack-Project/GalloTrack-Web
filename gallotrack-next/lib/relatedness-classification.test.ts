import { describe, it, expect } from 'vitest';
import {
  classifyPairingRelatedness,
  getOffspringParentageRelatedness,
  DEFAULT_RELATEDNESS_SEARCH_DEPTH,
  RELATEDNESS_TERMS,
} from './relatedness-classification';
import { getBreedingClassification } from './breeding-classification';
import type { FowlRecord } from './types';

function makeFowl(overrides: Partial<FowlRecord>): FowlRecord {
  return {
    id: 1,
    name: 'Sample Bird',
    breed: 'Lemon',
    gender: 'Male',
    color: 'Red',
    color_category: 'Standard',
    growth_stage: 'Stag',
    behavior_trait: 'Alert',
    eye_variant: 'Orange',
    birthdate: '2025-01-01',
    age: '1 year',
    weight: '2.0',
    height: '40',
    leg_color: 'Yellow',
    sire: '',
    dam: '',
    sire_pct: 50,
    dam_pct: 50,
    bloodline_pct: 100,
    status: 'Active',
    ...overrides,
  };
}

describe('relatedness-classification', () => {
  // ── FIXTURES (In-memory only, no live database or seeds) ───────────────────
  const foundationSire = makeFowl({
    id: 1,
    name: 'Foundation Cock A',
    gender: 'Rooster',
    breed: 'Lemon',
    sire: 'Foundation Stock',
    dam: 'Foundation Stock',
  });

  const foundationDam = makeFowl({
    id: 2,
    name: 'Foundation Hen B',
    gender: 'Hen',
    breed: 'Lemon',
    sire: 'Foundation Stock',
    dam: 'Foundation Stock',
  });

  const unrelatedFoundationDam = makeFowl({
    id: 3,
    name: 'Foundation Hen C',
    gender: 'Hen',
    breed: 'Sweater',
    sire: 'Foundation Stock',
    dam: 'Foundation Stock',
  });

  // Full sibling offspring of Foundation A x Foundation B
  const fullSibBrother = makeFowl({
    id: 10,
    name: 'Brother 1',
    gender: 'Rooster',
    breed: 'Lemon',
    sire_id: 1,
    dam_id: 2,
    sire: 'Foundation Cock A',
    dam: 'Foundation Hen B',
  });

  const fullSibSister = makeFowl({
    id: 11,
    name: 'Sister 1',
    gender: 'Hen',
    breed: 'Lemon',
    sire_id: 1,
    dam_id: 2,
    sire: 'Foundation Cock A',
    dam: 'Foundation Hen B',
  });

  // Half-sibling: same sire (Foundation Cock A), different dam (Foundation Hen C)
  const halfSibSister = makeFowl({
    id: 12,
    name: 'Half Sister',
    gender: 'Hen',
    breed: 'Crossbred',
    sire_id: 1,
    dam_id: 3,
    sire: 'Foundation Cock A',
    dam: 'Foundation Hen C',
  });

  // Grandchild (offspring of Brother 1 x Unrelated Hen)
  const unrelatedHenD = makeFowl({
    id: 4,
    name: 'Foundation Hen D',
    gender: 'Hen',
    breed: 'Hatch',
    sire: 'Foundation Stock',
    dam: 'Foundation Stock',
  });

  const granddaughter = makeFowl({
    id: 20,
    name: 'Granddaughter',
    gender: 'Hen',
    breed: 'Lemon',
    sire_id: 10,
    dam_id: 4,
    sire: 'Brother 1',
    dam: 'Foundation Hen D',
  });

  // Cousins:
  // Aunt (Sister 1) x Unrelated Rooster E -> Cousin 1
  const unrelatedRoosterE = makeFowl({
    id: 5,
    name: 'Foundation Rooster E',
    gender: 'Rooster',
    breed: 'Hatch',
    sire: 'Foundation Stock',
    dam: 'Foundation Stock',
  });

  const cousinMale = makeFowl({
    id: 30,
    name: 'Cousin Male',
    gender: 'Rooster',
    breed: 'Lemon',
    sire_id: 5,
    dam_id: 11,
    sire: 'Foundation Rooster E',
    dam: 'Sister 1',
  });

  // Uncle (Brother 1) x Unrelated Hen D -> Cousin Female (same as granddaughter)
  const cousinFemale = granddaughter;

  const mockFlock: FowlRecord[] = [
    foundationSire,
    foundationDam,
    unrelatedFoundationDam,
    unrelatedHenD,
    unrelatedRoosterE,
    fullSibBrother,
    fullSibSister,
    halfSibSister,
    granddaughter,
    cousinMale,
  ];

  // ── TESTS ─────────────────────────────────────────────────────────────────

  it('1. Parent × offspring = close breeding ("mag-amay / magbugto")', () => {
    // Father (Foundation Cock A) x Daughter (fullSibSister)
    const result = classifyPairingRelatedness(foundationSire, fullSibSister, mockFlock);
    expect(result.type).toBe('close');
    expect(result.label).toBe(RELATEDNESS_TERMS.close.label);
    expect(result.secondaryLabel).toBe(RELATEDNESS_TERMS.close.secondaryLabel);
    expect(result.relationship).toContain('Parent × Offspring');
    expect(result.isCloseBreeding).toBe(true);

    // Mother (Foundation Hen B) x Son (fullSibBrother)
    const result2 = classifyPairingRelatedness(fullSibBrother, foundationDam, mockFlock);
    expect(result2.type).toBe('close');
    expect(result2.relationship).toContain('Parent × Offspring');
    expect(result2.isCloseBreeding).toBe(true);
  });

  it('2. Full siblings (same sire_id and dam_id) = close breeding ("mag-amay / magbugto")', () => {
    const result = classifyPairingRelatedness(fullSibBrother, fullSibSister, mockFlock);
    expect(result.type).toBe('close');
    expect(result.label).toBe(RELATEDNESS_TERMS.close.label);
    expect(result.secondaryLabel).toBe(RELATEDNESS_TERMS.close.secondaryLabel);
    expect(result.relationship).toBe('Full siblings');
    expect(result.isCloseBreeding).toBe(true);
    expect(result.inbreedingCoefficient).toBe(25);
  });

  it('3. Half-siblings (same sire only) = line breeding ("magpakaisa")', () => {
    const result = classifyPairingRelatedness(fullSibBrother, halfSibSister, mockFlock);
    expect(result.type).toBe('line');
    expect(result.label).toBe(RELATEDNESS_TERMS.line.label);
    expect(result.secondaryLabel).toBe(RELATEDNESS_TERMS.line.secondaryLabel);
    expect(result.relationship).toContain('Half-siblings');
    expect(result.isCloseBreeding).toBe(false);
    expect(result.inbreedingCoefficient).toBe(12.5);
  });

  it('4. Grandparent × grandchild = line breeding ("magpakaisa")', () => {
    // Grandfather (Foundation Cock A) x Granddaughter
    const result = classifyPairingRelatedness(foundationSire, granddaughter, mockFlock);
    expect(result.type).toBe('line');
    expect(result.label).toBe(RELATEDNESS_TERMS.line.label);
    expect(result.secondaryLabel).toBe(RELATEDNESS_TERMS.line.secondaryLabel);
    expect(result.relationship).toContain('Grandparent × Grandchild');
    expect(result.isCloseBreeding).toBe(false);
    expect(result.inbreedingCoefficient).toBe(12.5);
  });

  it('5. First cousins = line breeding ("magpakaisa")', () => {
    const result = classifyPairingRelatedness(cousinMale, cousinFemale, mockFlock);
    expect(result.type).toBe('line');
    expect(result.label).toBe(RELATEDNESS_TERMS.line.label);
    expect(result.secondaryLabel).toBe(RELATEDNESS_TERMS.line.secondaryLabel);
    expect(result.relationship).toBe('First cousins');
    expect(result.isCloseBreeding).toBe(false);
    expect(result.inbreedingCoefficient).toBe(6.3); // rounded
  });

  it('6. Outcross: no known shared ancestors within 4 generations', () => {
    // Foundation Sire (Lemon) x Unrelated Foundation Hen C (Sweater)
    const result = classifyPairingRelatedness(foundationSire, unrelatedFoundationDam, mockFlock);
    expect(result.type).toBe('outcross');
    expect(result.label).toBe('Outcross (no known shared ancestor)');
    expect(result.tooltip).toBe('Based on recorded lineage only.');
    expect(result.isCloseBreeding).toBe(false);
    expect(result.inbreedingCoefficient).toBe(0);
  });

  it('7. Missing parent data = unknown', () => {
    const mysteriousBird = makeFowl({
      id: 99,
      name: 'Unrecorded Sire Offspring',
      gender: 'Rooster',
      breed: 'Hatch',
      sire: 'Unknown Rooster',
      dam: '',
      sire_id: undefined,
      dam_id: undefined,
    });
    const result = classifyPairingRelatedness(mysteriousBird, fullSibSister, mockFlock);
    expect(result.type).toBe('unknown');
    expect(result.label).toBe(RELATEDNESS_TERMS.unknown.label);
    expect(result.isCloseBreeding).toBe(false);
  });

  it('8. Lemon × Lemon full siblings = Purebred AND Close Breeding (proves independence)', () => {
    // Breeding mix classification:
    const breedClass = getBreedingClassification(fullSibBrother, mockFlock);
    expect(breedClass.type).toBe('Purebred');
    expect(breedClass.purityPct).toBe(100);

    // Relatedness classification:
    const relatedness = classifyPairingRelatedness(fullSibBrother, fullSibSister, mockFlock);
    expect(relatedness.type).toBe('close');
    expect(relatedness.label).toBe(RELATEDNESS_TERMS.close.label);
    expect(relatedness.relationship).toBe('Full siblings');

    // Both coexist independently without conflict
    expect(breedClass.type).toBe('Purebred');
    expect(relatedness.type).toBe('close');
  });

  it('9. Cycle in the data does not hang or overflow stack', () => {
    // Create an intentional cyclic tree: Bird A is sire of Bird B, and Bird B is sire of Bird A
    const cyclicA = makeFowl({
      id: 101,
      name: 'Cyclic Alpha',
      gender: 'Rooster',
      sire: 'Cyclic Beta',
      sire_id: 102,
      dam: 'Foundation Stock',
    });
    const cyclicB = makeFowl({
      id: 102,
      name: 'Cyclic Beta',
      gender: 'Hen',
      sire: 'Cyclic Alpha',
      sire_id: 101,
      dam: 'Foundation Stock',
    });

    const cyclicFlock = [cyclicA, cyclicB];
    const result = classifyPairingRelatedness(cyclicA, cyclicB, cyclicFlock);
    // Directly identifies parent/offspring or closes without hanging
    expect(['close', 'line']).toContain(result.type);
  });

  it('10. Search depth default is exactly 4 generations', () => {
    expect(DEFAULT_RELATEDNESS_SEARCH_DEPTH).toBe(4);
  });

  it('11. Foundation bird parentage = Unknown (foundation stock, no recorded parents)', () => {
    const parentage = getOffspringParentageRelatedness(foundationSire, mockFlock);
    expect(parentage.type).toBe('unknown');
    expect(parentage.label).toBe('Unknown (foundation stock, no recorded parents)');
    expect(parentage.inbreedingCoefficient).toBeNull();
    expect(parentage.tooltip).toBe('No recorded parents available to determine relatedness.');
  });

  it('12. Offspring of recorded unrelated parents = Outcross (no known shared ancestor)', () => {
    const parentage = getOffspringParentageRelatedness(fullSibBrother, mockFlock);
    // Parents are Foundation Cock A x Foundation Hen B (unrelated recorded foundation stock)
    expect(parentage.type).toBe('outcross');
    expect(parentage.label).toBe('Outcross (no known shared ancestor)');
    expect(parentage.inbreedingCoefficient).toBe(0);
    expect(parentage.tooltip).toBe('Based on recorded lineage only.');
  });

  it('13. Dense list rule: only Close Breeding and Line Breeding qualify for list badges', () => {
    const foundationParentage = getOffspringParentageRelatedness(foundationSire, mockFlock);
    const outcrossParentage = getOffspringParentageRelatedness(fullSibBrother, mockFlock);

    const showInDenseList = (p: typeof outcrossParentage) => p.type === 'close' || p.type === 'line';

    expect(showInDenseList(foundationParentage)).toBe(false); // Unknown -> hidden in lists
    expect(showInDenseList(outcrossParentage)).toBe(false);   // Outcross -> hidden in lists
    expect(showInDenseList({ type: 'close' } as any)).toBe(true);
    expect(showInDenseList({ type: 'line' } as any)).toBe(true);
  });
});
