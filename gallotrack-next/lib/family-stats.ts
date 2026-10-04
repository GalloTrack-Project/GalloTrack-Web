import type { FowlRecord } from './types';
import { buildBreedingPairs, isKnownParent, nameKey } from './family-tree';

export interface FamilyCounts {
  /** Chickens with at least one known, registered parent. */
  offspring: number;
  /** Distinct sire x dam combinations with both parents known. */
  breedingPairs: number;
  /** Every chicken in the registry. */
  totalChickens: number;
}

/** Registry-wide family headline counts — each metric is labeled separately. */
export function familyCounts(fowls: FowlRecord[]): FamilyCounts {
  return {
    offspring: fowls.filter((f) => isKnownParent(f.sire) || isKnownParent(f.dam)).length,
    breedingPairs: buildBreedingPairs(fowls).length,
    totalChickens: fowls.length,
  };
}

export interface BirdFamilyStats {
  /** Direct children listing this chicken as sire or dam. */
  offspring: number;
  /** Breeding pairs (both parents known) where this chicken is a parent. */
  breedingPairs: number;
  /** Chickens sharing both a sire and a dam with this chicken (excludes itself). */
  fullSiblings: number;
}

/** Family view counts for a single chicken. */
export function birdFamilyStats(bird: FowlRecord, fowls: FowlRecord[]): BirdFamilyStats {
  const self = nameKey(bird.name);
  const sireKey = nameKey(bird.sire);
  const damKey = nameKey(bird.dam);

  let offspring = 0;
  let fullSiblings = 0;
  const pairKeys = new Set<string>();

  if (!self) return { offspring: 0, breedingPairs: 0, fullSiblings: 0 };

  fowls.forEach((fowl) => {
    if (nameKey(fowl.name) === self) return;
    const fSire = nameKey(fowl.sire);
    const fDam = nameKey(fowl.dam);
    if (fSire === self || fDam === self) {
      offspring += 1;
      if (isKnownParent(fowl.sire) && isKnownParent(fowl.dam)) {
        pairKeys.add(`${fSire}|||${fDam}`);
      }
    }
    if (sireKey && damKey && fSire === sireKey && fDam === damKey) {
      fullSiblings += 1;
    }
  });

  return { offspring, breedingPairs: pairKeys.size, fullSiblings };
}
