import { describe, it, expect } from 'vitest';
import type { FowlRecord } from './types';
import {
  getBreedingClassification,
  classifyFlock,
  matchesBreedingTypeFilter,
  matchesBreedFilter,
  UNVERIFIED_LABEL,
} from './breeding-classification';

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

// 31 fowls fixture from the active user's flock (29 Active, 1 Deceased, 1 Archived)
const activeFlockFixture: FowlRecord[] = [
  makeFowl({ id: 30, name: 'Iron Lemon', breed: 'Lemon', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
  makeFowl({ id: 31, name: 'Titan Sweater', breed: 'Sweater', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
  makeFowl({ id: 32, name: 'True Hatch', breed: 'Hatch', gender: 'Rooster', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
  makeFowl({ id: 35, name: 'Golden Pearl', breed: 'Lemon', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
  makeFowl({ id: 36, name: 'Sunrise Queen', breed: 'Sweater', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
  makeFowl({ id: 37, name: 'Mountain Rose', breed: 'Hatch', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
  makeFowl({ id: 38, name: 'Silver Princess', breed: 'Sweater', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
  makeFowl({ id: 39, name: 'Crimson Belle', breed: 'Hatch', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
  makeFowl({ id: 40, name: 'White Flame', breed: 'Whitehackle', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
  makeFowl({ id: 41, name: 'Alta daw', breed: 'Roundhead', gender: 'Hen', sire: 'Foundation Stock', dam: 'Foundation Stock', status: 'Active' }),
  makeFowl({ id: 42, name: 'Lemon Storm', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', status: 'Active' }),
  makeFowl({ id: 43, name: 'Lemon Blaze', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', status: 'Active' }),
  makeFowl({ id: 44, name: 'Lemon Grace', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Golden Pearl', status: 'Active' }),
  makeFowl({ id: 45, name: 'Lemon Duke', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', status: 'Active' }),
  makeFowl({ id: 46, name: 'Lemon Pearl', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Golden Pearl', status: 'Active' }),
  makeFowl({ id: 47, name: 'Sweater Flash', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Sunrise Queen', status: 'Active' }),
  makeFowl({ id: 48, name: 'Sweater Bolt', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Sunrise Queen', status: 'Active' }),
  makeFowl({ id: 49, name: 'Sweater Angel', breed: 'Sweater', gender: 'Hen', sire: 'Titan Sweater', dam: 'Sunrise Queen', status: 'Active' }),
  makeFowl({ id: 50, name: 'Sweater Queen', breed: 'Sweater', gender: 'Hen', sire: 'Titan Sweater', dam: 'Sunrise Queen', status: 'Active' }),
  makeFowl({ id: 51, name: 'Hatch Thunder', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', status: 'Active' }),
  makeFowl({ id: 52, name: 'Hatch Storm', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', status: 'Active' }),
  makeFowl({ id: 53, name: 'Hatch Rose', breed: 'Hatch', gender: 'Hen', sire: 'True Hatch', dam: 'Mountain Rose', status: 'Active' }),
  makeFowl({ id: 54, name: 'Hatch Mountain', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', status: 'Active' }),
  makeFowl({ id: 55, name: 'Hatch Silver', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Silver Princess', status: 'Active' }),
  makeFowl({ id: 56, name: 'Hatch Princess', breed: 'Hatch', gender: 'Hen', sire: 'True Hatch', dam: 'Silver Princess', status: 'Active' }),
  makeFowl({ id: 57, name: 'Hatch Crown', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Silver Princess', status: 'Active' }),
  makeFowl({ id: 58, name: 'Lemon Roundhead King', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Alta daw', status: 'Active' }),
  makeFowl({ id: 59, name: 'Lemon Roundhead Queen', breed: 'Lemon', gender: 'Hen', sire: 'Iron Lemon', dam: 'Alta daw', status: 'Active' }),
  makeFowl({ id: 60, name: 'Lemon Duke II', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Alta daw', status: 'Deceased' }),
  makeFowl({ id: 61, name: 'Sweater Crimson', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Crimson Belle', status: 'Archived' }),
  makeFowl({ id: 62, name: 'Sweater Red Storm', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Crimson Belle', status: 'Active' }),
];

describe('Breeding Classification Engine (lib/breeding-classification.ts)', () => {
  describe('Rule 1: Lemon x Lemon = Purebred 100%', () => {
    it('classifies foundation stock with declared breed as Purebred 100%', () => {
      const sire = makeFowl({ id: 10, name: 'Sire Lemon', breed: 'Lemon', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const dam = makeFowl({ id: 11, name: 'Dam Lemon', breed: 'Lemon', gender: 'Female', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const fowls = [sire, dam];

      const sireClass = getBreedingClassification(sire, fowls);
      expect(sireClass.type).toBe('Purebred');
      expect(sireClass.purityPct).toBe(100);
      expect(sireClass.derivedBreed).toBe('Lemon');
      expect(sireClass.badgeLabel).toBe('Purebred · 100% Lemon');

      const damClass = getBreedingClassification(dam, fowls);
      expect(damClass.type).toBe('Purebred');
      expect(damClass.purityPct).toBe(100);
    });

    it('classifies offspring of two Lemon parents as Purebred 100% Lemon (not 50%)', () => {
      const sire = makeFowl({ id: 10, name: 'Sire Lemon', breed: 'Lemon', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const dam = makeFowl({ id: 11, name: 'Dam Lemon', breed: 'Lemon', gender: 'Female', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const offspring = makeFowl({ id: 12, name: 'F1 Lemon', breed: 'Lemon', sire: 'Sire Lemon', dam: 'Dam Lemon' });
      const fowls = [sire, dam, offspring];

      const res = getBreedingClassification(offspring, fowls);
      expect(res.type).toBe('Purebred');
      expect(res.purityPct).toBe(100);
      expect(res.purityPct).not.toBe(50); // Proves the old backcross 50% purity is gone
      expect(res.derivedBreed).toBe('Lemon');
      expect(res.badgeLabel).toBe('Purebred · 100% Lemon');
    });
  });

  describe('Rule 2: Lemon x Hatch = Crossbred 50/50, purity 50%', () => {
    it('computes 50% Lemon / 50% Hatch with purity 50%', () => {
      const sire = makeFowl({ id: 20, name: 'Sire Lemon', breed: 'Lemon', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const dam = makeFowl({ id: 21, name: 'Dam Hatch', breed: 'Hatch', gender: 'Female', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const offspring = makeFowl({ id: 22, name: 'Cross F1', breed: 'Lemon', sire: 'Sire Lemon', dam: 'Dam Hatch' });
      const fowls = [sire, dam, offspring];

      const res = getBreedingClassification(offspring, fowls);
      expect(res.type).toBe('Crossbred');
      expect(res.purityPct).toBe(50);
      expect(res.derivedBreed).toBe('Hatch × Lemon');
      expect(res.badgeLabel).toContain('50%');
      expect(res.allBreeds).toHaveLength(2);
    });
  });

  describe('Rule 3: (Lemon x Hatch) x Lemon = Crossbred 75/25, purity 75%', () => {
    it('computes 75% Lemon / 25% Hatch with purity 75%', () => {
      const sireLemon = makeFowl({ id: 30, name: 'Sire Lemon', breed: 'Lemon', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const damHatch = makeFowl({ id: 31, name: 'Dam Hatch', breed: 'Hatch', gender: 'Female', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const f1Cross = makeFowl({ id: 32, name: 'F1 Cross', breed: 'Hatch', gender: 'Female', sire: 'Sire Lemon', dam: 'Dam Hatch' });
      const backcross = makeFowl({ id: 33, name: 'Backcross F2', breed: 'Lemon', sire: 'Sire Lemon', dam: 'F1 Cross' });
      const fowls = [sireLemon, damHatch, f1Cross, backcross];

      const res = getBreedingClassification(backcross, fowls);
      expect(res.type).toBe('Crossbred');
      expect(res.purityPct).toBe(75);
      expect(res.derivedBreed).toBe('Lemon × Hatch');
      expect(res.badgeLabel).toBe('Crossbred · 75% Lemon / 25% Hatch');
    });
  });

  describe('Rule 4: (Lemon x Hatch) x (Lemon x Hatch) = Crossbred 50/50', () => {
    it('maintains 50/50 crossbred composition when crossing identical F1 hybrids', () => {
      const sireLemon = makeFowl({ id: 40, name: 'Sire Lemon', breed: 'Lemon', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const damHatch = makeFowl({ id: 41, name: 'Dam Hatch', breed: 'Hatch', gender: 'Female', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const f1Male = makeFowl({ id: 42, name: 'F1 Male', breed: 'Lemon', gender: 'Male', sire: 'Sire Lemon', dam: 'Dam Hatch' });
      const f1Female = makeFowl({ id: 43, name: 'F1 Female', breed: 'Hatch', gender: 'Female', sire: 'Sire Lemon', dam: 'Dam Hatch' });
      const f2Cross = makeFowl({ id: 44, name: 'F2 Hybrid', breed: 'Cross', sire: 'F1 Male', dam: 'F1 Female' });
      const fowls = [sireLemon, damHatch, f1Male, f1Female, f2Cross];

      const res = getBreedingClassification(f2Cross, fowls);
      expect(res.type).toBe('Crossbred');
      expect(res.purityPct).toBe(50);
      expect(res.allBreeds.map((b) => b.pct)).toEqual([50, 50]);
    });
  });

  describe('Rule 5: (Lemon x Hatch) x Sweater = Crossbred 25/25/50, purity 50%', () => {
    it('computes 3-way cross with dominant strain 50% Sweater and +1 tooltip', () => {
      const sireLemon = makeFowl({ id: 50, name: 'Sire Lemon', breed: 'Lemon', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const damHatch = makeFowl({ id: 51, name: 'Dam Hatch', breed: 'Hatch', gender: 'Female', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const f1Female = makeFowl({ id: 52, name: 'F1 Dam', breed: 'Lemon', gender: 'Female', sire: 'Sire Lemon', dam: 'Dam Hatch' });
      const sireSweater = makeFowl({ id: 53, name: 'Sire Sweater', breed: 'Sweater', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const triCross = makeFowl({ id: 54, name: 'Tri Cross', breed: 'Sweater', sire: 'Sire Sweater', dam: 'F1 Dam' });
      const fowls = [sireLemon, damHatch, f1Female, sireSweater, triCross];

      const res = getBreedingClassification(triCross, fowls);
      expect(res.type).toBe('Crossbred');
      expect(res.purityPct).toBe(50); // Dominant single-breed share (Sweater: 50%)
      expect(res.dominantBreed).toBe('Sweater');
      expect(res.extraBreedsCount).toBe(1); // 3 strains total -> 1 extra beyond top 2
      expect(res.badgeLabel).toContain('+1');
      expect(res.tooltipText).toContain('Sweater');
      expect(res.tooltipText).toContain('Hatch');
      expect(res.tooltipText).toContain('Lemon');
    });
  });

  describe('Rule 6: Missing Parent = Unverified Lineage', () => {
    it('classifies bird with missing sire as Unverified', () => {
      const dam = makeFowl({ id: 60, name: 'Dam Known', breed: 'Lemon', sire: 'Foundation Stock', dam: 'Foundation Stock' });
      const bird = makeFowl({ id: 61, name: 'Missing Sire Bird', breed: 'Lemon', sire: '', dam: 'Dam Known' });
      const fowls = [dam, bird];

      const res = getBreedingClassification(bird, fowls);
      expect(res.type).toBe('Unverified');
      expect(res.badgeLabel).toBe(UNVERIFIED_LABEL);
    });

    it('classifies bird with unregistered parent as Unverified', () => {
      const bird = makeFowl({ id: 62, name: 'Ghost Parents', breed: 'Hatch', sire: 'Ghost Sire', dam: 'Ghost Dam' });
      const fowls = [bird];

      const res = getBreedingClassification(bird, fowls);
      expect(res.type).toBe('Unverified');
      expect(res.badgeLabel).toBe(UNVERIFIED_LABEL);
    });
  });

  describe('Active Flock & Offspring Tab Verification (Dynamic Flock Counts)', () => {
    it('resolves active flock to Purebred 23 / Crossbred 6 / Unverified 0 via derived classification', () => {
      const activeFowls = activeFlockFixture.filter((f) => f.status === 'Active');
      expect(activeFowls).toHaveLength(29);

      const classificationMap = classifyFlock(activeFowls);
      expect(classificationMap.size).toBe(activeFowls.length);

      const purebreds = activeFowls.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'purebred'));
      const crossbreds = activeFowls.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'crossbred'));
      const unverified = activeFowls.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'unverified'));

      expect(purebreds.length).toBe(23);
      expect(crossbreds.length).toBe(6);
      expect(unverified.length).toBe(0);
      expect(purebreds.length + crossbreds.length + unverified.length).toBe(activeFowls.length);
    });

    it('resolves Offspring tab to 13 Purebred / 6 Crossbred / 0 Unverified', () => {
      const activeFowls = activeFlockFixture.filter((f) => f.status === 'Active');
      const classificationMap = classifyFlock(activeFowls);

      const isFoundation = (val?: string) => (val || '').trim().toLowerCase() === 'foundation stock';
      const offspringList = activeFowls.filter((f) => {
        const hasParents = Boolean(f.sire && f.dam);
        return hasParents && !isFoundation(f.sire) && !isFoundation(f.dam);
      });

      expect(offspringList).toHaveLength(19);

      const offPure = offspringList.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'purebred'));
      const offCross = offspringList.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'crossbred'));
      const offUnverif = offspringList.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'unverified'));

      expect(offPure.length).toBe(13);
      expect(offCross.length).toBe(6);
      expect(offUnverif.length).toBe(0);
      expect(offPure.length + offCross.length + offUnverif.length).toBe(offspringList.length);
    });

    it('ensures Breeding Type filter counts and Results: X of Y agree with tab and flock totals', () => {
      const activeFowls = activeFlockFixture.filter((f) => f.status === 'Active');
      const classificationMap = classifyFlock(activeFowls);

      // Tab: All Active birds
      const allFilterAll = activeFowls.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'all'));
      const allFilterPure = activeFowls.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'purebred'));
      const allFilterCross = activeFowls.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'crossbred'));
      const allFilterUnverif = activeFowls.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'unverified'));

      expect(allFilterAll.length).toBe(29);
      expect(allFilterPure.length).toBe(23);
      expect(allFilterCross.length).toBe(6);
      expect(allFilterUnverif.length).toBe(0);

      // Tab: Offspring only
      const isFoundation = (val?: string) => (val || '').trim().toLowerCase() === 'foundation stock';
      const offspringList = activeFowls.filter((f) => Boolean(f.sire && f.dam) && !isFoundation(f.sire) && !isFoundation(f.dam));

      const offFilterAll = offspringList.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'all'));
      const offFilterPure = offspringList.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'purebred'));
      const offFilterCross = offspringList.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'crossbred'));
      const offFilterUnverif = offspringList.filter((f) => matchesBreedingTypeFilter(classificationMap.get(String(f.id))!, 'unverified'));

      expect(offFilterAll.length).toBe(19);
      expect(offFilterPure.length).toBe(13);
      expect(offFilterCross.length).toBe(6);
      expect(offFilterUnverif.length).toBe(0);

      // Verify that each filter count equals the sum of its items and partition is complete
      expect(offFilterPure.length + offFilterCross.length + offFilterUnverif.length).toBe(offFilterAll.length);
    });
  });

  describe('Option 1: Composition-Aware Breed Matching (matchesBreedFilter)', () => {
    it('matches Hatch Silver under both Breed = Hatch and Breed = Sweater', () => {
      const activeFowls = activeFlockFixture.filter((f) => f.status === 'Active');
      const classificationMap = classifyFlock(activeFowls);
      const hatchSilver = activeFowls.find((f) => f.name === 'Hatch Silver')!;
      expect(hatchSilver).toBeDefined();

      const classHatchSilver = classificationMap.get(String(hatchSilver.id))!;
      expect(classHatchSilver.type).toBe('Crossbred');

      // 1. Matches Breed = Hatch (stored breed is Hatch, composition has 50% Hatch)
      const matchesHatch = matchesBreedFilter(hatchSilver, classHatchSilver, 'Hatch');
      expect(matchesHatch).toBe(true);

      // 2. Matches Breed = Sweater (composition has 50% Sweater)
      const matchesSweater = matchesBreedFilter(hatchSilver, classHatchSilver, 'Sweater');
      expect(matchesSweater).toBe(true);

      // 3. Does not match unrelated breed (e.g. Roundhead or Whitehackle)
      expect(matchesBreedFilter(hatchSilver, classHatchSilver, 'Roundhead')).toBe(false);
      expect(matchesBreedFilter(hatchSilver, classHatchSilver, 'Whitehackle')).toBe(false);
    });

    it('with Breeding Type = Purebred, Hatch Silver appears under neither Breed = Hatch nor Breed = Sweater', () => {
      const activeFowls = activeFlockFixture.filter((f) => f.status === 'Active');
      const classificationMap = classifyFlock(activeFowls);
      const hatchSilver = activeFowls.find((f) => f.name === 'Hatch Silver')!;
      const classHatchSilver = classificationMap.get(String(hatchSilver.id))!;

      const isPurebred = matchesBreedingTypeFilter(classHatchSilver, 'purebred');
      expect(isPurebred).toBe(false); // Crossbred bird fails purebred filter

      // Combined filter evaluation: matchesBreedFilter AND matchesBreedingTypeFilter
      const combinedHatchAndPure = matchesBreedFilter(hatchSilver, classHatchSilver, 'Hatch') && isPurebred;
      const combinedSweaterAndPure = matchesBreedFilter(hatchSilver, classHatchSilver, 'Sweater') && isPurebred;

      expect(combinedHatchAndPure).toBe(false);
      expect(combinedSweaterAndPure).toBe(false);
    });

    it('Breed = Sweater + Purebred returns only 100% Sweater birds', () => {
      const activeFowls = activeFlockFixture.filter((f) => f.status === 'Active');
      const classificationMap = classifyFlock(activeFowls);

      const sweaterPurebreds = activeFowls.filter((f) => {
        const c = classificationMap.get(String(f.id))!;
        return matchesBreedFilter(f, c, 'Sweater') && matchesBreedingTypeFilter(c, 'purebred');
      });

      // Every returned bird must be purebred with 100% Sweater
      for (const bird of sweaterPurebreds) {
        const c = classificationMap.get(String(bird.id))!;
        expect(c.type).toBe('Purebred');
        expect(c.dominantBreed).toBe('Sweater');
        expect(c.purityPct).toBe(100);
      }

      // Must include Titan Sweater, Sunrise Queen, Silver Princess, Sweater Flash, Bolt, Angel, Queen
      const names = sweaterPurebreds.map((b) => b.name);
      expect(names).toContain('Titan Sweater');
      expect(names).toContain('Sunrise Queen');
      expect(names).toContain('Silver Princess');
      expect(names).toContain('Sweater Flash');
      expect(names).not.toContain('Hatch Silver');
      expect(names).not.toContain('Sweater Red Storm'); // 50% Hatch / 50% Sweater cross
    });
  });
});
