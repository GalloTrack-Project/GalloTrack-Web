import { describe, it, expect } from 'vitest';
import type { FowlRecord } from '@/lib/types';
import { familyCounts, birdFamilyStats } from './family-stats';

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bloodline_pct: 100,
    status: 'Active',
    ...partial,
  }) as FowlRecord;

const family: FowlRecord[] = [
  bird({ id: 1, name: 'Sire 1', gender: 'Rooster' }),
  bird({ id: 2, name: 'Dam A', gender: 'Hen' }),
  bird({ id: 3, name: 'Offspring 1A1', gender: 'Rooster', sire: 'Sire 1', dam: 'Dam A' }),
  bird({ id: 4, name: 'Offspring 1A2', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A' }),
  bird({ id: 5, name: 'Offspring 1A3', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A' }),
  bird({ id: 6, name: 'Dam C', gender: 'Hen' }),
  bird({ id: 7, name: 'Grandchild', gender: 'Rooster', sire: 'Offspring 1A1', dam: 'Dam C' }),
  bird({ id: 8, name: 'Partial Kid', gender: 'Hen', sire: 'Offspring 1A2', dam: '' }),
];

describe('family-stats', () => {
  describe('familyCounts', () => {
    it('counts offspring, breeding pairs, and total chickens separately', () => {
      const counts = familyCounts(family);
      expect(counts.offspring).toBe(5); // 3 chicks + Grandchild + Partial Kid
      expect(counts.breedingPairs).toBe(2); // Sire1×DamA, Offspring1A1×DamC
      expect(counts.totalChickens).toBe(8);
    });

    it('returns zeros for an empty registry', () => {
      expect(familyCounts([])).toEqual({ offspring: 0, breedingPairs: 0, totalChickens: 0 });
    });

    it('ignores Foundation Stock placeholders', () => {
      const counts = familyCounts([
        bird({ id: 1, name: 'Chick', sire: 'Foundation Stock', dam: 'Foundation Stock' }),
      ]);
      expect(counts.offspring).toBe(0);
      expect(counts.breedingPairs).toBe(0);
    });
  });

  describe('birdFamilyStats', () => {
    it('counts direct offspring, own breeding pairs, and full siblings', () => {
      const stats = birdFamilyStats(family[2], family); // Offspring 1A1
      expect(stats.offspring).toBe(1); // Grandchild
      expect(stats.breedingPairs).toBe(1); // Offspring 1A1 × Dam C
      expect(stats.fullSiblings).toBe(2); // 1A2, 1A3
    });

    it('counts a parent’s children across every dam', () => {
      const stats = birdFamilyStats(family[0], family); // Sire 1
      expect(stats.offspring).toBe(3);
      expect(stats.breedingPairs).toBe(1);
      expect(stats.fullSiblings).toBe(0);
    });

    it('never counts a chicken as its own child or sibling', () => {
      const stats = birdFamilyStats(family[6], family); // Grandchild
      expect(stats.offspring).toBe(0);
      expect(stats.fullSiblings).toBe(0);
      expect(stats.breedingPairs).toBe(0); // no children of its own
    });

    it('does not count half-siblings as full siblings', () => {
      const stats = birdFamilyStats(family[7], family); // Partial Kid (sire only)
      expect(stats.offspring).toBe(0);
      expect(stats.fullSiblings).toBe(0);
      expect(stats.breedingPairs).toBe(0); // dam unknown -> no tracked pair
    });

    it('returns zeros when the chicken has no name', () => {
      expect(birdFamilyStats(bird({ id: 9, name: '' }), family)).toEqual({
        offspring: 0,
        breedingPairs: 0,
        fullSiblings: 0,
      });
    });
  });
});
