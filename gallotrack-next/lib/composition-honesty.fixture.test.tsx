import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { FowlRecord, DeclaredBreedShare } from './types';
import {
  getCompositionSource,
  getCompositionSourceInfo,
  getCompositionSourceLabel,
  hasAssumedAncestor,
  hasBothParentsRecorded,
  getBreedingClassification,
  classifyFlock,
} from './breeding-classification';
import BreedingTypeBadge from '../components/BreedingTypeBadge';
import BloodlineBreakdown from '../components/BloodlineBreakdown';
import BloodlineProvenance from '../components/BloodlineProvenance';

function makeTestFowl(overrides: Partial<FowlRecord>): FowlRecord {
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
    sire: 'Foundation Stock',
    dam: 'Foundation Stock',
    sire_pct: 100,
    dam_pct: 100,
    bloodline_pct: 100,
    status: 'Active',
    ...overrides,
  };
}

// 31 fowls fixture representing a realistic farm flock
const flockFixture: FowlRecord[] = [
  makeTestFowl({ id: 30, name: 'Iron Lemon', breed: 'Lemon', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
  makeTestFowl({ id: 31, name: 'Titan Sweater', breed: 'Sweater', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
  makeTestFowl({ id: 32, name: 'True Hatch', breed: 'Hatch', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
  makeTestFowl({ id: 35, name: 'Golden Pearl', breed: 'Lemon', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
  makeTestFowl({ id: 36, name: 'Sunrise Queen', breed: 'Sweater', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
  makeTestFowl({ id: 37, name: 'Mountain Rose', breed: 'Hatch', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
  makeTestFowl({ id: 38, name: 'Silver Princess', breed: 'Sweater', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
  makeTestFowl({ id: 39, name: 'Crimson Belle', breed: 'Hatch', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
  makeTestFowl({ id: 40, name: 'White Flame', breed: 'Whitehackle', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
  makeTestFowl({ id: 41, name: 'Alta daw', breed: 'Roundhead', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
  makeTestFowl({ id: 42, name: 'Lemon Storm', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl' }),
  makeTestFowl({ id: 43, name: 'Lemon Blaze', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl' }),
  makeTestFowl({ id: 44, name: 'Lemon Grace', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Golden Pearl' }),
  makeTestFowl({ id: 45, name: 'Lemon Duke', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl' }),
  makeTestFowl({ id: 46, name: 'Lemon Pearl', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Golden Pearl' }),
  makeTestFowl({ id: 47, name: 'Sweater Flash', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Sunrise Queen' }),
  makeTestFowl({ id: 48, name: 'Sweater Bolt', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Sunrise Queen' }),
  makeTestFowl({ id: 49, name: 'Sweater Angel', breed: 'Sweater', gender: 'Hen', sire: 'Titan Sweater', dam: 'Sunrise Queen' }),
  makeTestFowl({ id: 50, name: 'Sweater Queen', breed: 'Sweater', gender: 'Hen', sire: 'Titan Sweater', dam: 'Sunrise Queen' }),
  makeTestFowl({ id: 51, name: 'Hatch Thunder', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose' }),
  makeTestFowl({ id: 52, name: 'Hatch Storm', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose' }),
  makeTestFowl({ id: 53, name: 'Hatch Rose', breed: 'Hatch', gender: 'Hen', sire: 'True Hatch', dam: 'Mountain Rose' }),
  makeTestFowl({ id: 54, name: 'Hatch Mountain', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose' }),
  makeTestFowl({ id: 55, name: 'Hatch Silver', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Silver Princess' }),
  makeTestFowl({ id: 56, name: 'Hatch Princess', breed: 'Hatch', gender: 'Hen', sire: 'True Hatch', dam: 'Silver Princess' }),
  makeTestFowl({ id: 57, name: 'Hatch Crown', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Silver Princess' }),
  makeTestFowl({ id: 58, name: 'Lemon Roundhead King', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Alta daw' }),
  makeTestFowl({ id: 59, name: 'Lemon Roundhead Queen', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Alta daw' }),
  makeTestFowl({ id: 60, name: 'Lemon Duke II', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Alta daw', status: 'Deceased' }),
  makeTestFowl({ id: 61, name: 'Sweater Crimson', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Crimson Belle', status: 'Archived' }),
  makeTestFowl({ id: 62, name: 'Sweater Red Storm', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Crimson Belle' }),
];

describe('Composition Honesty System Tests (Requirement 8)', () => {
  // 1. Source for assumed, declared, and derived birds
  describe('1. Composition source identification', () => {
    it('identifies assumed foundation bird (no parents, no declared composition)', () => {
      const bird = makeTestFowl({
        id: 101,
        name: 'Assumed Founder',
        breed: 'Lemon',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: null,
      });

      expect(getCompositionSource(bird)).toBe('assumed');
      const info = getCompositionSourceInfo(bird, [bird]);
      expect(info.source).toBe('assumed');
      expect(info.basedOnAssumed).toBe(false);
      expect(info.sourceLabel).toBe('Assumed from registered breed (not verified)');

      const classification = getBreedingClassification(bird, [bird]);
      expect(classification.compositionSource).toBe('assumed');
      expect(classification.basedOnAssumed).toBe(false);
      expect(classification.sourceLabel).toBe('Assumed from registered breed (not verified)');
    });

    it('identifies declared foundation bird (no parents, valid declared composition)', () => {
      const declared: DeclaredBreedShare[] = [
        { breed: 'Lemon', percent: 75 },
        { breed: 'Roundhead', percent: 25 },
      ];
      const bird = makeTestFowl({
        id: 102,
        name: 'Declared Founder',
        breed: 'Lemon',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: declared,
      });

      expect(getCompositionSource(bird)).toBe('declared');
      const info = getCompositionSourceInfo(bird, [bird]);
      expect(info.source).toBe('declared');
      expect(info.basedOnAssumed).toBe(false);
      expect(info.sourceLabel).toBe('Declared by owner');

      const classification = getBreedingClassification(bird, [bird]);
      expect(classification.compositionSource).toBe('declared');
      expect(classification.basedOnAssumed).toBe(false);
      expect(classification.sourceLabel).toBe('Declared by owner');
    });

    it('identifies derived bird (recorded parents in registry)', () => {
      const sire = makeTestFowl({ id: 1, name: 'Sire 1', breed: 'Lemon' });
      const dam = makeTestFowl({ id: 2, name: 'Dam 1', breed: 'Lemon' });
      const offspring = makeTestFowl({
        id: 3,
        name: 'Offspring 1',
        breed: 'Lemon',
        sire: 'Sire 1',
        dam: 'Dam 1',
        sire_id: 1,
        dam_id: 2,
      });
      const flock = [sire, dam, offspring];

      expect(getCompositionSource(offspring)).toBe('derived');
      const info = getCompositionSourceInfo(offspring, flock);
      expect(info.source).toBe('derived');
      expect(info.sourceLabel).toContain('Derived from parents');
    });
  });

  // 2. basedOnAssumed through three generations
  describe('2. basedOnAssumed through three generations', () => {
    it('propagates basedOnAssumed through 3 generations when foundation is assumed', () => {
      // Gen 0: Founders with NO declared composition (assumed)
      const gen0Sire = makeTestFowl({
        id: 201,
        name: 'Founder Sire',
        breed: 'Sweater',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: null,
      });
      const gen0Dam = makeTestFowl({
        id: 202,
        name: 'Founder Dam',
        breed: 'Sweater',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: null,
      });

      // Gen 1: Offspring
      const gen1Bird = makeTestFowl({
        id: 203,
        name: 'Gen1 Child',
        breed: 'Sweater',
        sire: 'Founder Sire',
        dam: 'Founder Dam',
        sire_id: 201,
        dam_id: 202,
      });

      // Gen 1 Partner
      const gen1Partner = makeTestFowl({
        id: 204,
        name: 'Gen1 Partner',
        breed: 'Sweater',
        sire: 'Founder Sire',
        dam: 'Founder Dam',
        sire_id: 201,
        dam_id: 202,
      });

      // Gen 2: Grandchild
      const gen2Bird = makeTestFowl({
        id: 205,
        name: 'Gen2 Grandchild',
        breed: 'Sweater',
        sire: 'Gen1 Child',
        dam: 'Gen1 Partner',
        sire_id: 203,
        dam_id: 204,
      });

      // Gen 2 Partner
      const gen2Partner = makeTestFowl({
        id: 206,
        name: 'Gen2 Partner',
        breed: 'Sweater',
        sire: 'Gen1 Child',
        dam: 'Gen1 Partner',
        sire_id: 203,
        dam_id: 204,
      });

      // Gen 3: Great-Grandchild
      const gen3Bird = makeTestFowl({
        id: 207,
        name: 'Gen3 GreatGrandchild',
        breed: 'Sweater',
        sire: 'Gen2 Grandchild',
        dam: 'Gen2 Partner',
        sire_id: 205,
        dam_id: 206,
      });

      const flock = [
        gen0Sire,
        gen0Dam,
        gen1Bird,
        gen1Partner,
        gen2Bird,
        gen2Partner,
        gen3Bird,
      ];

      // Gen 0 are assumed, not basedOnAssumed
      expect(hasAssumedAncestor(gen0Sire, flock)).toBe(false);
      expect(hasAssumedAncestor(gen0Dam, flock)).toBe(false);

      // Gen 1 has assumed ancestors (Gen 0)
      expect(hasAssumedAncestor(gen1Bird, flock)).toBe(true);
      const class1 = getBreedingClassification(gen1Bird, flock);
      expect(class1.compositionSource).toBe('derived');
      expect(class1.basedOnAssumed).toBe(true);
      expect(class1.sourceLabel).toBe('Derived from parents (Includes assumed foundation stock)');

      // Gen 2 has assumed ancestors (Gen 0 via Gen 1)
      expect(hasAssumedAncestor(gen2Bird, flock)).toBe(true);
      const class2 = getBreedingClassification(gen2Bird, flock);
      expect(class2.compositionSource).toBe('derived');
      expect(class2.basedOnAssumed).toBe(true);
      expect(class2.sourceLabel).toBe('Derived from parents (Includes assumed foundation stock)');

      // Gen 3 has assumed ancestors (3 generations deep)
      expect(hasAssumedAncestor(gen3Bird, flock)).toBe(true);
      const class3 = getBreedingClassification(gen3Bird, flock);
      expect(class3.compositionSource).toBe('derived');
      expect(class3.basedOnAssumed).toBe(true);
      expect(class3.sourceLabel).toBe('Derived from parents (Includes assumed foundation stock)');
    });

    it('does NOT set basedOnAssumed when all foundation stock are fully declared', () => {
      const gen0Sire = makeTestFowl({
        id: 301,
        name: 'Declared Sire',
        breed: 'Sweater',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: [{ breed: 'Sweater', percent: 100 }],
      });
      const gen0Dam = makeTestFowl({
        id: 302,
        name: 'Declared Dam',
        breed: 'Sweater',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: [{ breed: 'Sweater', percent: 100 }],
      });
      const gen1Child = makeTestFowl({
        id: 303,
        name: 'Declared Lineage Offspring',
        breed: 'Sweater',
        sire: 'Declared Sire',
        dam: 'Declared Dam',
        sire_id: 301,
        dam_id: 302,
      });

      const flock = [gen0Sire, gen0Dam, gen1Child];

      expect(hasAssumedAncestor(gen1Child, flock)).toBe(false);
      const classChild = getBreedingClassification(gen1Child, flock);
      expect(classChild.compositionSource).toBe('derived');
      expect(classChild.basedOnAssumed).toBe(false);
      expect(classChild.sourceLabel).toBe('Derived from parents');
    });
  });

  // 3. Sentence about Sire and Dam hidden for foundation parents
  describe('3. Sentence about Sire and Dam hidden for foundation parents', () => {
    it('hasBothParentsRecorded returns false for Foundation Stock', () => {
      const founder = makeTestFowl({
        id: 401,
        name: 'Pure Founder',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
      });
      expect(hasBothParentsRecorded(founder, [founder])).toBe(false);
    });

    it('hasBothParentsRecorded returns false for single or unknown parent', () => {
      const sire = makeTestFowl({ id: 402, name: 'Single Sire' });
      const singleParent = makeTestFowl({
        id: 403,
        name: 'Single Parent Bird',
        sire: 'Single Sire',
        dam: 'Foundation Stock',
        sire_id: 402,
      });
      expect(hasBothParentsRecorded(singleParent, [sire, singleParent])).toBe(false);
    });

    it('hasBothParentsRecorded returns true only when both parents are recorded flock chickens', () => {
      const sire = makeTestFowl({ id: 404, name: 'Known Sire' });
      const dam = makeTestFowl({ id: 405, name: 'Known Dam' });
      const child = makeTestFowl({
        id: 406,
        name: 'Both Parents Known',
        sire: 'Known Sire',
        dam: 'Known Dam',
        sire_id: 404,
        dam_id: 405,
      });
      expect(hasBothParentsRecorded(child, [sire, dam, child])).toBe(true);
    });

    it('BloodlineBreakdown hides 50% Sire · 50% Dam sentence for foundation birds', () => {
      const founder = makeTestFowl({
        id: 410,
        name: 'Iron Lemon',
        breed: 'Lemon',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
      });
      const { container } = render(
        <BloodlineBreakdown
          fowl={founder}
          fowls={[founder]}
          title="Bloodline Percentage"
        />
      );

      // Must not display "50% Sire · 50% Dam"
      expect(container.textContent).not.toContain('50% Sire · 50% Dam');
      // Must display assumed replacement summary
      expect(container.textContent).toContain('Assumed 100% Lemon');
      // Must display explanatory note
      expect(container.textContent).toContain('No parents are recorded, so the system assumes');
    });

    it('BloodlineBreakdown displays 50% Sire · 50% Dam sentence when both parents are recorded', () => {
      const sire = makeTestFowl({ id: 411, name: 'Sire A', breed: 'Lemon' });
      const dam = makeTestFowl({ id: 412, name: 'Dam A', breed: 'Lemon' });
      const offspring = makeTestFowl({
        id: 413,
        name: 'Offspring A',
        breed: 'Lemon',
        sire: 'Sire A',
        dam: 'Dam A',
        sire_id: 411,
        dam_id: 412,
      });
      const flock = [sire, dam, offspring];

      const { container } = render(
        <BloodlineBreakdown
          fowl={offspring}
          fowls={flock}
          title="Bloodline Percentage"
        />
      );

      // Must display 50% Sire · 50% Dam
      expect(container.textContent).toContain('50% Sire · 50% Dam');
    });
  });

  // 4. Qualifiers rendered on badges
  describe('4. BreedingTypeBadge qualifier rendering', () => {
    it('renders ~ marker in compact mode for assumed birds', () => {
      const classification = getBreedingClassification(
        makeTestFowl({ breed: 'Lemon', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
        []
      );

      const { container } = render(
        <BreedingTypeBadge classification={classification} compact />
      );

      expect(container.textContent).toContain('Purebred · 100% Lemon');
      expect(container.textContent).toContain('~');
    });

    it('renders (assumed) qualifier in full mode for assumed birds', () => {
      const classification = getBreedingClassification(
        makeTestFowl({ breed: 'Lemon', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
        []
      );

      const { container } = render(
        <BreedingTypeBadge classification={classification} compact={false} />
      );

      expect(container.textContent).toContain('Purebred · 100% Lemon');
      expect(container.textContent).toContain('(assumed)');
    });

    it('does NOT render assumed qualifier for declared foundation birds', () => {
      const declaredBird = makeTestFowl({
        breed: 'Lemon',
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        declared_composition: [{ breed: 'Lemon', percent: 100 }],
      });
      const classification = getBreedingClassification(declaredBird, [declaredBird]);

      const { container } = render(
        <BreedingTypeBadge classification={classification} compact={false} />
      );

      expect(container.textContent).toContain('Purebred · 100% Lemon');
      expect(container.textContent).not.toContain('(assumed)');
      expect(container.textContent).not.toContain('~');
    });
  });

  // 5. Counts unchanged for the same flock fixture
  describe('5. Flock fixture classification counts invariant', () => {
    it('produces the exact same Purebred, Crossbred, and Unverified counts as before', () => {
      const classifiedMap = classifyFlock(flockFixture);
      expect(classifiedMap.size).toBe(flockFixture.length);

      let purebredCount = 0;
      let crossbredCount = 0;
      let unverifiedCount = 0;

      for (const classification of classifiedMap.values()) {
        if (classification.type === 'Purebred') purebredCount++;
        else if (classification.type === 'Crossbred') crossbredCount++;
        else if (classification.type === 'Unverified') unverifiedCount++;
      }

      // Exact count verification from active user flock
      // 31 total birds in fixture:
      // - 10 foundation birds (7 purebred, 1 Whitehackle purebred, 1 Roundhead purebred, 1 Hatch purebred) = 10 purebred
      // - 13 purebred offspring (5 Lemon, 4 Sweater, 4 Hatch) = 13 purebred
      // - 8 crossbred (Lemon x Roundhead, Sweater x Hatch crosses) = 8 crossbred
      // Total: 23 Purebred + 8 Crossbred = 31 birds. Zero Unverified.
      expect(purebredCount).toBe(23);
      expect(crossbredCount).toBe(8);
      expect(unverifiedCount).toBe(0);
      expect(purebredCount + crossbredCount + unverifiedCount).toBe(31);
    });
  });
});
