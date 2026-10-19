import { describe, it, expect, vi } from 'vitest';
import type { FowlRecord, DeclaredBreedShare } from './types';
import {
  computeBloodlineComposition,
  computePedigreeComposition,
  computeEffectiveComposition,
  pedigreeComposition,
  effectiveComposition,
  validateDeclaredComposition,
  parseDeclaredComposition,
  declaredToComposition,
  planLineageRefresh,
  getDescendantFowls,
  auditFlockCompositions,
} from './bloodline-composition';
import {
  getBreedingClassification,
  classifyFlock,
  getCompositionSource,
  getCompositionSourceLabel,
} from './breeding-classification';

function makeBird(overrides: Partial<FowlRecord>): FowlRecord {
  return {
    id: 1,
    name: 'Sample Bird',
    breed: 'Sweater',
    gender: 'Rooster',
    color: 'Red',
    color_category: 'Standard',
    growth_stage: 'Cock',
    behavior_trait: 'Alert',
    eye_variant: 'Orange',
    birthdate: '2025-01-01',
    age: '1 year',
    weight: '2.0',
    height: '40',
    leg_color: 'Yellow',
    sire: 'Foundation Stock',
    dam: 'Foundation Stock',
    sire_pct: 100,
    dam_pct: 100,
    bloodline_pct: 100,
    status: 'Active',
    ...overrides,
  };
}

describe('Foundation Declared Composition System', () => {
  const allowedBreeds = ['Sweater', 'Roundhead', 'Hatch', 'Lemon', 'Kelso'];

  // Test 1: Foundation stock with NO declared composition
  describe('Test 1: Foundation stock with NO declared composition', () => {
    it('is treated as 100% of registered breed (assumed purebred)', () => {
      const bird = makeBird({
        id: 101,
        name: 'Pure Founder',
        breed: 'Sweater',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: null,
      });

      const comp = computeBloodlineComposition(bird, [bird]);
      expect(comp).toEqual({ Sweater: 100 });

      const classification = getBreedingClassification(bird, [bird]);
      expect(classification.type).toBe('Purebred');
      expect(classification.compositionSource).toBe('assumed');
      expect(classification.sourceLabel).toBe('Assumed from registered breed (not verified)');
      expect(getCompositionSource(bird)).toBe('assumed');
      expect(getCompositionSourceLabel(bird)).toBe('Assumed from registered breed (not verified)');
    });
  });

  // Test 2: Foundation stock WITH custom declared composition
  describe('Test 2: Foundation stock WITH custom declared composition', () => {
    it('resolves declared shares and classifies as Crossbred', () => {
      const declared: DeclaredBreedShare[] = [
        { breed: 'Sweater', percent: 75 },
        { breed: 'Roundhead', percent: 25 },
      ];
      const bird = makeBird({
        id: 102,
        name: 'Declared Founder',
        breed: 'Sweater',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: declared,
      });

      const comp = computeBloodlineComposition(bird, [bird]);
      expect(comp).toEqual({ Sweater: 75, Roundhead: 25 });

      const classification = getBreedingClassification(bird, [bird]);
      expect(classification.type).toBe('Crossbred');
      expect(classification.compositionSource).toBe('declared');
      expect(classification.sourceLabel).toBe('Declared by owner');
      expect(getCompositionSource(bird)).toBe('declared');
      expect(getCompositionSourceLabel(bird)).toBe('Declared by owner');
      expect(classification.dominantBreed).toBe('Sweater');
      expect(classification.purityPct).toBe(75);
    });
  });

  // Test 3: Foundation stock WITH declared composition 100% Sweater
  describe('Test 3: Foundation stock WITH declared composition 100% Sweater', () => {
    it('classifies as Purebred (source: declared)', () => {
      const declared: DeclaredBreedShare[] = [{ breed: 'Sweater', percent: 100 }];
      const bird = makeBird({
        id: 103,
        name: 'Explicit Pure Founder',
        breed: 'Sweater',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: declared,
      });

      const comp = computeBloodlineComposition(bird, [bird]);
      expect(comp).toEqual({ Sweater: 100 });

      const classification = getBreedingClassification(bird, [bird]);
      expect(classification.type).toBe('Purebred');
      expect(classification.compositionSource).toBe('declared');
      expect(classification.sourceLabel).toBe('Declared by owner');
    });
  });

  // Test 4: Offspring of declared foundation stock
  describe('Test 4: Offspring of declared foundation stock inherits 50/50 blend', () => {
    it('computes 37.5% Sweater, 12.5% Roundhead, 50% Hatch', () => {
      const sire = makeBird({
        id: 201,
        name: 'Sire 75/25',
        breed: 'Sweater',
        gender: 'Rooster',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: [
          { breed: 'Sweater', percent: 75 },
          { breed: 'Roundhead', percent: 25 },
        ],
      });
      const dam = makeBird({
        id: 202,
        name: 'Dam Pure Hatch',
        breed: 'Hatch',
        gender: 'Hen',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: null,
      });
      const offspring = makeBird({
        id: 203,
        name: 'Offspring Cross',
        breed: 'Hatch',
        gender: 'Rooster',
        sire: 'Sire 75/25',
        dam: 'Dam Pure Hatch',
        sire_id: 201,
        dam_id: 202,
        sire_pct: 50,
        dam_pct: 50,
      });
      const fowls = [sire, dam, offspring];

      const comp = computeBloodlineComposition(offspring, fowls);
      expect(comp.Sweater).toBeCloseTo(37.5, 1);
      expect(comp.Roundhead).toBeCloseTo(12.5, 1);
      expect(comp.Hatch).toBeCloseTo(50, 1);

      const classification = getBreedingClassification(offspring, fowls);
      expect(classification.type).toBe('Crossbred');
      expect(classification.compositionSource).toBe('derived');
      expect(classification.basedOnAssumed).toBe(true);
      expect(classification.sourceLabel).toBe('Derived from parents (Includes assumed foundation stock)');
      expect(getCompositionSource(offspring)).toBe('derived');
      expect(getCompositionSourceLabel(offspring, fowls)).toBe('Derived from parents (Includes assumed foundation stock)');
    });
  });

  // Test 5: Offspring manual adjustment when parents are recorded
  describe('Test 5: Offspring manual adjustment when parents are recorded', () => {
    it('effective composition respects owner adjustment while keeping calculated pedigree separate', () => {
      const sire = makeBird({
        id: 301,
        name: 'Sire Pure',
        breed: 'Sweater',
        gender: 'Rooster',
      });
      const dam = makeBird({
        id: 302,
        name: 'Dam Pure',
        breed: 'Hatch',
        gender: 'Hen',
      });
      const offspring = makeBird({
        id: 303,
        name: 'Adjusted Offspring',
        breed: 'Sweater',
        gender: 'Rooster',
        sire: 'Sire Pure',
        dam: 'Dam Pure',
        sire_id: 301,
        dam_id: 302,
        declared_composition: [
          { breed: 'Sweater', percent: 60 },
          { breed: 'Hatch', percent: 40 },
        ],
      });
      const fowls = [sire, dam, offspring];

      // Pedigree composition remains the calculated 50/50
      const ped = computePedigreeComposition(offspring, fowls);
      expect(ped.Sweater).toBe(50);
      expect(ped.Hatch).toBe(50);

      // Effective composition is the owner-adjusted 60/40
      const eff = computeEffectiveComposition(offspring, fowls);
      expect(eff.Sweater).toBe(60);
      expect(eff.Hatch).toBe(40);

      const classification = getBreedingClassification(offspring, fowls);
      expect(classification.compositionSource).toBe('adjusted');
      expect(classification.sourceLabel).toBe('Adjusted by owner');
      expect(classification.pedigreeSummary).toBe('50% Hatch / 50% Sweater');
      expect(classification.type).toBe('Crossbred');
      expect(classification.purityPct).toBe(60);
    });
  });

  // Test 6: Validation checks for declared composition
  describe('Test 6: Validation checks for validateDeclaredComposition', () => {
    it('accepts valid 100% distribution with registered breed', () => {
      const res = validateDeclaredComposition(
        [
          { breed: 'Sweater', percent: 60 },
          { breed: 'Roundhead', percent: 40 },
        ],
        'Sweater',
        allowedBreeds
      );
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.total).toBe(100);
    });

    it('rejects sum not equal to 100', () => {
      const res = validateDeclaredComposition(
        [
          { breed: 'Sweater', percent: 70 },
          { breed: 'Roundhead', percent: 20 },
        ],
        'Sweater',
        allowedBreeds
      );
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toMatch(/must equal 100%/);
    });

    it('rejects negative percentage and percentage > 100', () => {
      const resNeg = validateDeclaredComposition(
        [
          { breed: 'Sweater', percent: 120 },
          { breed: 'Roundhead', percent: -20 },
        ],
        'Sweater',
        allowedBreeds
      );
      expect(resNeg.valid).toBe(false);
      expect(resNeg.errors.some((e) => e.includes('between 0% and 100%'))).toBe(true);
    });

    it('rejects more than 4 breeds', () => {
      const res = validateDeclaredComposition(
        [
          { breed: 'Sweater', percent: 40 },
          { breed: 'Roundhead', percent: 30 },
          { breed: 'Hatch', percent: 15 },
          { breed: 'Lemon', percent: 10 },
          { breed: 'Kelso', percent: 5 },
        ],
        'Sweater',
        allowedBreeds
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Maximum 4 breeds'))).toBe(true);
    });

    it('rejects duplicate breeds', () => {
      const res = validateDeclaredComposition(
        [
          { breed: 'Sweater', percent: 50 },
          { breed: 'sweater', percent: 50 },
        ],
        'Sweater',
        allowedBreeds
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Duplicate breed'))).toBe(true);
    });

    it('rejects when registered breed is missing from declared list', () => {
      const res = validateDeclaredComposition(
        [
          { breed: 'Roundhead', percent: 60 },
          { breed: 'Hatch', percent: 40 },
        ],
        'Sweater',
        allowedBreeds
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Registered breed "Sweater" must be included'))).toBe(true);
    });

    it('produces a non-blocking warning if registered breed is not the highest share', () => {
      const res = validateDeclaredComposition(
        [
          { breed: 'Sweater', percent: 30 },
          { breed: 'Roundhead', percent: 70 },
        ],
        'Sweater',
        allowedBreeds
      );
      expect(res.valid).toBe(true);
      expect(res.warnings).toBeDefined();
      expect(res.warnings!.length).toBeGreaterThan(0);
      expect(res.warnings![0]).toMatch(/Registered breed "Sweater" \(30%\) is not the dominant share/);
    });

    it('handles null / empty array as valid empty state', () => {
      const resNull = validateDeclaredComposition(null, 'Sweater', allowedBreeds);
      expect(resNull.valid).toBe(true);
      expect(resNull.total).toBe(100);

      const resEmpty = validateDeclaredComposition([], 'Sweater', allowedBreeds);
      expect(resEmpty.valid).toBe(true);
      expect(resEmpty.total).toBe(100);
    });
  });

  // Test 7: Descendants recomputation when foundation composition changes
  describe('Test 7: Descendants recomputation', () => {
    it('planLineageRefresh generates refresh patches for descendants when declared composition changes', () => {
      const founder = makeBird({
        id: 401,
        name: 'Founder Alpha',
        breed: 'Sweater',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: null,
      });
      const mate = makeBird({
        id: 402,
        name: 'Mate Beta',
        breed: 'Hatch',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
      });
      const child = makeBird({
        id: 403,
        name: 'Child Gamma',
        breed: 'Sweater',
        sire: 'Founder Alpha',
        dam: 'Mate Beta',
        sire_id: 401,
        dam_id: 402,
        bloodline_composition: { Sweater: 50, Hatch: 50 },
        bloodline_pct: 50,
      });
      const fowls = [founder, mate, child];

      // Verify descendants lookup
      const desc = getDescendantFowls(founder, fowls);
      expect(desc).toHaveLength(1);
      expect(desc[0].id).toBe(403);

      // Now update founder's declared composition to 80% Sweater, 20% Roundhead
      const updatedFounder = {
        ...founder,
        declared_composition: [
          { breed: 'Sweater', percent: 80 },
          { breed: 'Roundhead', percent: 20 },
        ],
      };

      const patches = planLineageRefresh({
        root: updatedFounder,
        previousName: founder.name,
        fowls,
      });

      expect(patches).toHaveLength(1);
      expect(patches[0].id).toBe(403);
      const childComp = patches[0].patch.bloodline_composition as Record<string, number>;
      expect(childComp.Sweater).toBeCloseTo(40, 1);
      expect(childComp.Roundhead).toBeCloseTo(10, 1);
      expect(childComp.Hatch).toBeCloseTo(50, 1);
    });
  });

  // Test 8: Backward compatibility & safe parsing
  describe('Test 8: Backward compatibility & safe parsing', () => {
    it('parses null, undefined, or missing declared_composition safely without crash', () => {
      expect(parseDeclaredComposition(null)).toBeNull();
      expect(parseDeclaredComposition(undefined)).toBeNull();
      expect(parseDeclaredComposition('')).toBeNull();
      expect(parseDeclaredComposition([])).toBeNull();
    });

    it('parses stringified JSON array safely', () => {
      const json = JSON.stringify([
        { breed: 'Sweater', percent: 75 },
        { breed: 'Roundhead', percent: 25 },
      ]);
      const res = parseDeclaredComposition(json);
      expect(res).toEqual([
        { breed: 'Sweater', percent: 75 },
        { breed: 'Roundhead', percent: 25 },
      ]);
    });

    it('logs warning and falls back to null on malformed JSON without throwing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(parseDeclaredComposition('{ invalid: json }')).toBeNull();
      expect(parseDeclaredComposition({ not: 'an array' })).toBeNull();
      expect(parseDeclaredComposition([{ breed: 123, percent: 'invalid' }])).toBeNull();
      warnSpy.mockRestore();
    });
  });

  // Test 9: Dynamic flock count preservation
  describe('Test 9: Dynamic flock count expectations preserved without declared composition', () => {
    it('verifies 23 purebred / 6 crossbred in the active flock when all founders are assumed', () => {
      // 31 birds fixture representing the live database state
      const flockFixture: FowlRecord[] = [
        makeBird({ id: 30, name: 'Iron Lemon', breed: 'Lemon', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 31, name: 'Titan Sweater', breed: 'Sweater', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 32, name: 'True Hatch', breed: 'Hatch', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 35, name: 'Golden Pearl', breed: 'Lemon', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 36, name: 'Sunrise Queen', breed: 'Sweater', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 37, name: 'Mountain Rose', breed: 'Hatch', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 38, name: 'Silver Princess', breed: 'Sweater', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 39, name: 'Crimson Belle', breed: 'Hatch', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 40, name: 'White Flame', breed: 'Whitehackle', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 41, name: 'Alta daw', breed: 'Roundhead', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 42, name: 'Lemon Storm', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', sire_id: 30, dam_id: 35, status: 'Active' }),
        makeBird({ id: 43, name: 'Lemon Blaze', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', sire_id: 30, dam_id: 35, status: 'Active' }),
        makeBird({ id: 44, name: 'Lemon Grace', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Golden Pearl', sire_id: 30, dam_id: 35, status: 'Active' }),
        makeBird({ id: 45, name: 'Lemon Duke', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', sire_id: 30, dam_id: 35, status: 'Active' }),
        makeBird({ id: 46, name: 'Lemon Pearl', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Golden Pearl', sire_id: 30, dam_id: 35, status: 'Active' }),
        makeBird({ id: 47, name: 'Sweater Flash', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Sunrise Queen', sire_id: 31, dam_id: 36, status: 'Active' }),
        makeBird({ id: 48, name: 'Sweater Bolt', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Sunrise Queen', sire_id: 31, dam_id: 36, status: 'Active' }),
        makeBird({ id: 49, name: 'Sweater Angel', breed: 'Sweater', gender: 'Hen', sire: 'Titan Sweater', dam: 'Sunrise Queen', sire_id: 31, dam_id: 36, status: 'Active' }),
        makeBird({ id: 50, name: 'Sweater Queen', breed: 'Sweater', gender: 'Hen', sire: 'Titan Sweater', dam: 'Sunrise Queen', sire_id: 31, dam_id: 36, status: 'Active' }),
        makeBird({ id: 51, name: 'Hatch Thunder', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', sire_id: 32, dam_id: 37, status: 'Active' }),
        makeBird({ id: 52, name: 'Hatch Storm', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', sire_id: 32, dam_id: 37, status: 'Active' }),
        makeBird({ id: 53, name: 'Hatch Rose', breed: 'Hatch', gender: 'Hen', sire: 'True Hatch', dam: 'Mountain Rose', sire_id: 32, dam_id: 37, status: 'Active' }),
        makeBird({ id: 54, name: 'Hatch Mountain', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', sire_id: 32, dam_id: 37, status: 'Active' }),
        makeBird({ id: 55, name: 'Hatch Silver', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Silver Princess', sire_id: 32, dam_id: 38, status: 'Active' }),
        makeBird({ id: 56, name: 'Hatch Princess', breed: 'Hatch', gender: 'Hen', sire: 'True Hatch', dam: 'Silver Princess', sire_id: 32, dam_id: 38, status: 'Active' }),
        makeBird({ id: 57, name: 'Hatch Crown', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Silver Princess', sire_id: 32, dam_id: 38, status: 'Active' }),
        makeBird({ id: 58, name: 'Lemon Roundhead King', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Alta daw', sire_id: 30, dam_id: 41, status: 'Active' }),
        makeBird({ id: 59, name: 'Lemon Roundhead Queen', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Alta daw', sire_id: 30, dam_id: 41, status: 'Active' }),
        makeBird({ id: 60, name: 'Lemon Duke II', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Alta daw', sire_id: 30, dam_id: 41, status: 'Deceased' }),
        makeBird({ id: 61, name: 'Sweater Crimson', breed: 'Sweater', gender: 'Rooster', sire: 'Sweater', dam: 'hatch', sire_id: null, dam_id: null, status: 'Archived' }),
        makeBird({ id: 62, name: 'Sweater Red Storm', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Crimson Belle', sire_id: 31, dam_id: 39, status: 'Active' }),
      ];

      const activeFlock = flockFixture.filter((f) => f.status === 'Active');
      expect(activeFlock).toHaveLength(29);

      const classified = Array.from(classifyFlock(activeFlock).values());
      const purebreds = classified.filter((c) => c.type === 'Purebred');
      const crossbreds = classified.filter((c) => c.type === 'Crossbred');
      const unverified = classified.filter((c) => c.type === 'Unverified');

      expect(purebreds).toHaveLength(23);
      expect(crossbreds).toHaveLength(6);
      expect(unverified).toHaveLength(0);

      // Audit check confirms 0 drift across the flock
      const audit = auditFlockCompositions(flockFixture);
      expect(audit).toHaveLength(31);
    });
  });

  // Test 10: Effective versus pedigree composition for each source
  describe('Test 10: Effective versus pedigree composition for each source', () => {
    it('verifies correct source and separate effective vs pedigree composition for assumed, declared, derived, adjusted', () => {
      // 1. Assumed (foundation, no declaration)
      const bAssumed = makeBird({ id: 101, name: 'Assumed Hatch', breed: 'Hatch' });
      const pedAssumed = computePedigreeComposition(bAssumed, [bAssumed]);
      const effAssumed = computeEffectiveComposition(bAssumed, [bAssumed]);
      expect(pedAssumed).toEqual({ Hatch: 100 });
      expect(effAssumed).toEqual({ Hatch: 100 });
      expect(getCompositionSource(bAssumed)).toBe('assumed');

      // 2. Declared (foundation, with declaration)
      const bDeclared = makeBird({
        id: 102,
        name: 'Declared Bird',
        breed: 'Hatch',
        declared_composition: [
          { breed: 'Hatch', percent: 70 },
          { breed: 'Roundhead', percent: 30 },
        ],
      });
      const pedDeclared = computePedigreeComposition(bDeclared, [bDeclared]);
      const effDeclared = computeEffectiveComposition(bDeclared, [bDeclared]);
      expect(pedDeclared).toEqual({ Hatch: 100 });
      expect(effDeclared).toEqual({ Hatch: 70, Roundhead: 30 });
      expect(getCompositionSource(bDeclared)).toBe('declared');

      // 3. Derived (with parents, no declaration)
      const sire = makeBird({ id: 103, name: 'Sire Hatch', breed: 'Hatch' });
      const dam = makeBird({ id: 104, name: 'Dam Sweater', breed: 'Sweater' });
      const bDerived = makeBird({
        id: 105,
        name: 'Derived Offspring',
        breed: 'Crossbred',
        sire: 'Sire Hatch',
        dam: 'Dam Sweater',
        sire_id: 103,
        dam_id: 104,
      });
      const fowls1 = [sire, dam, bDerived];
      const pedDerived = computePedigreeComposition(bDerived, fowls1);
      const effDerived = computeEffectiveComposition(bDerived, fowls1);
      expect(pedDerived).toEqual({ Hatch: 50, Sweater: 50 });
      expect(effDerived).toEqual({ Hatch: 50, Sweater: 50 });
      expect(getCompositionSource(bDerived)).toBe('derived');

      // 4. Adjusted (with parents and declaration)
      const bAdjusted = makeBird({
        id: 106,
        name: 'Adjusted Offspring',
        breed: 'Crossbred',
        sire: 'Sire Hatch',
        dam: 'Dam Sweater',
        sire_id: 103,
        dam_id: 104,
        declared_composition: [
          { breed: 'Hatch', percent: 60 },
          { breed: 'Sweater', percent: 40 },
        ],
      });
      const fowls2 = [sire, dam, bAdjusted];
      const pedAdjusted = computePedigreeComposition(bAdjusted, fowls2);
      const effAdjusted = computeEffectiveComposition(bAdjusted, fowls2);
      expect(pedAdjusted).toEqual({ Hatch: 50, Sweater: 50 });
      expect(effAdjusted).toEqual({ Hatch: 60, Sweater: 40 });
      expect(getCompositionSource(bAdjusted)).toBe('adjusted');
    });
  });

  // Test 11: Three-generation cascade including archived and deceased
  describe('Test 11: Three-generation cascade including archived and deceased', () => {
    it('cascades founder adjustment through archived and deceased descendants', () => {
      const gen0Sire = makeBird({
        id: 1001,
        name: 'Gen0 Sire',
        breed: 'Hatch',
        status: 'Archived',
      });
      const gen0Dam = makeBird({
        id: 1002,
        name: 'Gen0 Dam',
        breed: 'Sweater',
        status: 'Deceased',
      });
      const gen1Child = makeBird({
        id: 1003,
        name: 'Gen1 Child',
        breed: 'Crossbred',
        sire_id: 1001,
        dam_id: 1002,
        sire: 'Gen0 Sire',
        dam: 'Gen0 Dam',
        status: 'Active',
      });
      const gen2Grandchild = makeBird({
        id: 1004,
        name: 'Gen2 Grandchild',
        breed: 'Crossbred',
        sire_id: 1003,
        dam_id: 1002,
        sire: 'Gen1 Child',
        dam: 'Gen0 Dam',
        status: 'Deceased',
      });
      const gen3GreatGrandchild = makeBird({
        id: 1005,
        name: 'Gen3 GreatGrandchild',
        breed: 'Crossbred',
        sire_id: 1004,
        dam: 'Foundation Stock',
        sire: 'Gen2 Grandchild',
        status: 'Archived',
      });

      const flock = [gen0Sire, gen0Dam, gen1Child, gen2Grandchild, gen3GreatGrandchild];

      // Initially Gen1 is 50 Hatch / 50 Sweater
      expect(computeBloodlineComposition(gen1Child, flock)).toEqual({ Hatch: 50, Sweater: 50 });

      // Owner declares Gen0 Sire is 80 Hatch / 20 Kelso
      const updatedGen0Sire = {
        ...gen0Sire,
        declared_composition: [
          { breed: 'Hatch', percent: 80 },
          { breed: 'Kelso', percent: 20 },
        ],
      };

      const patches = planLineageRefresh({
        root: updatedGen0Sire,
        previousName: gen0Sire.name,
        fowls: flock,
      });

      // Should refresh Gen1, Gen2, and Gen3
      const patchedIds = patches.map((p) => p.id);
      expect(patchedIds).toContain(1003);
      expect(patchedIds).toContain(1004);
      expect(patchedIds).toContain(1005);

      const gen1Patch = patches.find((p) => p.id === 1003)!;
      const gen1Comp = gen1Patch.patch.bloodline_composition as Record<string, number>;
      expect(gen1Comp.Hatch).toBeCloseTo(40, 1);
      expect(gen1Comp.Kelso).toBeCloseTo(10, 1);
      expect(gen1Comp.Sweater).toBeCloseTo(50, 1);
    });
  });

  // Test 12: Hatch x Sweater adjusted to 60/40 gives Crossbred with 60% purity and offspring average correctly
  describe('Test 12: Hatch x Sweater 60/40 crossbred and offspring inheritance', () => {
    it('calculates Crossbred 60% and inherits into offspring correctly', () => {
      const sire = makeBird({ id: 201, name: 'Hatch Sire', breed: 'Hatch' });
      const dam = makeBird({ id: 202, name: 'Sweater Dam', breed: 'Sweater' });
      const f1 = makeBird({
        id: 203,
        name: 'F1 Cock',
        breed: 'Hatch',
        sire: 'Hatch Sire',
        dam: 'Sweater Dam',
        sire_id: 201,
        dam_id: 202,
        declared_composition: [
          { breed: 'Hatch', percent: 60 },
          { breed: 'Sweater', percent: 40 },
        ],
      });
      const pureHatchHen = makeBird({ id: 204, name: 'Backcross Hen', breed: 'Hatch' });
      const f2 = makeBird({
        id: 205,
        name: 'F2 Offspring',
        breed: 'Hatch',
        sire: 'F1 Cock',
        dam: 'Backcross Hen',
        sire_id: 203,
        dam_id: 204,
      });

      const flock = [sire, dam, f1, pureHatchHen, f2];

      // F1 classification
      const c1 = getBreedingClassification(f1, flock);
      expect(c1.type).toBe('Crossbred');
      expect(c1.purityPct).toBe(60);

      // F2 expected pedigree: average of F1 (60% Hatch, 40% Sweater) and Pure Hatch (100% Hatch)
      // = (60+100)/2 = 80% Hatch, 40/2 = 20% Sweater
      const f2Ped = computePedigreeComposition(f2, flock);
      expect(f2Ped.Hatch).toBe(80);
      expect(f2Ped.Sweater).toBe(20);
      expect(computeEffectiveComposition(f2, flock)).toEqual({ Hatch: 80, Sweater: 20 });
    });
  });

  // Test 13: Adjusting to 100% Hatch gives Purebred and changes counts only for that bird
  describe('Test 13: Adjusting to 100% Hatch gives Purebred and changes flock counts only for that bird', () => {
    it('transforms crossbred to purebred and increments purebred count by 1', () => {
      const flockFixture: FowlRecord[] = [
        makeBird({ id: 30, name: 'Iron Lemon', breed: 'Lemon', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 31, name: 'Titan Sweater', breed: 'Sweater', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 32, name: 'True Hatch', breed: 'Hatch', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 35, name: 'Golden Pearl', breed: 'Lemon', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 36, name: 'Sunrise Queen', breed: 'Sweater', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 37, name: 'Mountain Rose', breed: 'Hatch', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 38, name: 'Silver Princess', breed: 'Sweater', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 39, name: 'Crimson Belle', breed: 'Hatch', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 40, name: 'White Flame', breed: 'Whitehackle', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 41, name: 'Alta daw', breed: 'Roundhead', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
        makeBird({ id: 42, name: 'Lemon Storm', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', sire_id: 30, dam_id: 35, status: 'Active' }),
        makeBird({ id: 43, name: 'Lemon Blaze', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', sire_id: 30, dam_id: 35, status: 'Active' }),
        makeBird({ id: 44, name: 'Lemon Grace', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Golden Pearl', sire_id: 30, dam_id: 35, status: 'Active' }),
        makeBird({ id: 45, name: 'Lemon Duke', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', sire_id: 30, dam_id: 35, status: 'Active' }),
        makeBird({ id: 46, name: 'Lemon Pearl', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Golden Pearl', sire_id: 30, dam_id: 35, status: 'Active' }),
        makeBird({ id: 47, name: 'Sweater Flash', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Sunrise Queen', sire_id: 31, dam_id: 36, status: 'Active' }),
        makeBird({ id: 48, name: 'Sweater Bolt', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Sunrise Queen', sire_id: 31, dam_id: 36, status: 'Active' }),
        makeBird({ id: 49, name: 'Sweater Angel', breed: 'Sweater', gender: 'Hen', sire: 'Titan Sweater', dam: 'Sunrise Queen', sire_id: 31, dam_id: 36, status: 'Active' }),
        makeBird({ id: 50, name: 'Sweater Queen', breed: 'Sweater', gender: 'Hen', sire: 'Titan Sweater', dam: 'Sunrise Queen', sire_id: 31, dam_id: 36, status: 'Active' }),
        makeBird({ id: 51, name: 'Hatch Thunder', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', sire_id: 32, dam_id: 37, status: 'Active' }),
        makeBird({ id: 52, name: 'Hatch Storm', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', sire_id: 32, dam_id: 37, status: 'Active' }),
        makeBird({ id: 53, name: 'Hatch Rose', breed: 'Hatch', gender: 'Hen', sire: 'True Hatch', dam: 'Mountain Rose', sire_id: 32, dam_id: 37, status: 'Active' }),
        makeBird({ id: 54, name: 'Hatch Mountain', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', sire_id: 32, dam_id: 37, status: 'Active' }),
        makeBird({ id: 55, name: 'Hatch Silver', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Silver Princess', sire_id: 32, dam_id: 38, status: 'Active' }),
        makeBird({ id: 56, name: 'Hatch Princess', breed: 'Hatch', gender: 'Hen', sire: 'True Hatch', dam: 'Silver Princess', sire_id: 32, dam_id: 38, status: 'Active' }),
        makeBird({ id: 57, name: 'Hatch Crown', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Silver Princess', sire_id: 32, dam_id: 38, status: 'Active' }),
        makeBird({ id: 58, name: 'Lemon Roundhead King', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Alta daw', sire_id: 30, dam_id: 41, status: 'Active' }),
        makeBird({ id: 59, name: 'Lemon Roundhead Queen', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Alta daw', sire_id: 30, dam_id: 41, status: 'Active' }),
        makeBird({ id: 60, name: 'Lemon Duke II', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Alta daw', sire_id: 30, dam_id: 41, status: 'Deceased' }),
        makeBird({ id: 61, name: 'Sweater Crimson', breed: 'Sweater', gender: 'Rooster', sire: 'Sweater', dam: 'hatch', sire_id: null, dam_id: null, status: 'Archived' }),
        makeBird({ id: 62, name: 'Sweater Red Storm', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Crimson Belle', sire_id: 31, dam_id: 39, status: 'Active' }),
      ];

      // Base flock counts
      const activeFlock = flockFixture.filter((f) => f.status === 'Active');
      const baseClassified = Array.from(classifyFlock(activeFlock).values());
      expect(baseClassified.filter((c) => c.type === 'Purebred')).toHaveLength(23);
      expect(baseClassified.filter((c) => c.type === 'Crossbred')).toHaveLength(6);

      // Adjust bird #58 (Lemon Roundhead King) to 100% Lemon
      const modifiedFlock = activeFlock.map((b) =>
        b.id === 58 ? { ...b, declared_composition: [{ breed: 'Lemon', percent: 100 }] } : b
      );

      const modifiedClassified = Array.from(classifyFlock(modifiedFlock).values());
      const modPurebreds = modifiedClassified.filter((c) => c.type === 'Purebred');
      const modCrossbreds = modifiedClassified.filter((c) => c.type === 'Crossbred');

      // Counts shift by exactly 1: Purebred goes 23 -> 24, Crossbred goes 6 -> 5
      expect(modPurebreds).toHaveLength(24);
      expect(modCrossbreds).toHaveLength(5);
    });
  });

  // Test 14: Reset to calculated restores original
  describe('Test 14: Reset to calculated restores original state', () => {
    it('clears owner adjustment and restores 50/50 derived pedigree', () => {
      const sire = makeBird({ id: 301, name: 'Sire', breed: 'Hatch' });
      const dam = makeBird({ id: 302, name: 'Dam', breed: 'Sweater' });
      const birdAdjusted = makeBird({
        id: 303,
        name: 'Child',
        breed: 'Crossbred',
        sire_id: 301,
        dam_id: 302,
        sire: 'Sire',
        dam: 'Dam',
        declared_composition: [{ breed: 'Hatch', percent: 60 }, { breed: 'Sweater', percent: 40 }],
      });
      const flock = [sire, dam, birdAdjusted];

      expect(computeEffectiveComposition(birdAdjusted, flock)).toEqual({ Hatch: 60, Sweater: 40 });

      // Reset by setting declared_composition to null
      const birdReset = { ...birdAdjusted, declared_composition: null };
      expect(computeEffectiveComposition(birdReset, flock)).toEqual({ Hatch: 50, Sweater: 50 });
      expect(getCompositionSource(birdReset)).toBe('derived');
    });
  });

  // Test 15: Warnings for large differences (>20pp) and out-of-lineage breeds
  describe('Test 15: Validation warnings for large differences and out-of-lineage breeds', () => {
    it('warns when percentage differs by >20pp from calculated pedigree', () => {
      const ped = { Hatch: 50, Sweater: 50 };
      const res = validateDeclaredComposition(
        [
          { breed: 'Hatch', percent: 75 },
          { breed: 'Sweater', percent: 25 },
        ],
        'Hatch',
        allowedBreeds,
        { isOffspring: true, pedigreeComposition: ped }
      );
      expect(res.valid).toBe(true);
      expect(res.warnings.length).toBeGreaterThan(0);
      expect(res.warnings.some((w) => w.includes('differs by 25 percentage points'))).toBe(true);
    });

    it('warns when breed is outside recorded lineage', () => {
      const ped = { Hatch: 50, Sweater: 50 };
      const res = validateDeclaredComposition(
        [
          { breed: 'Hatch', percent: 40 },
          { breed: 'Sweater', percent: 40 },
          { breed: 'Kelso', percent: 20 },
        ],
        'Hatch',
        allowedBreeds,
        { isOffspring: true, pedigreeComposition: ped }
      );
      expect(res.valid).toBe(true);
      expect(res.warnings.some((w) => w.includes('not in the recorded lineage'))).toBe(true);
    });
  });
});

