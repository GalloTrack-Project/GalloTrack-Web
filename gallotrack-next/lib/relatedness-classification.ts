import type { FowlRecord } from './types';
import { isKnownParent, nameKey, normalizeParentName, FOUNDATION_STOCK } from './family-tree';
import { parentRecordOf } from './lineage';

/**
 * Default ancestry search depth for relatedness classification (4 generations).
 * Covers subject, parents (G1), grandparents (G2), great-grandparents (G3),
 * and great-great-grandparents (G4).
 */
export const DEFAULT_RELATEDNESS_SEARCH_DEPTH = 4;

export type RelatednessType = 'close' | 'line' | 'outcross' | 'unknown';

/**
 * Farm-language constants (shown in English with local Filipino/Visayan secondary labels).
 * Kept in this single location for centralized maintenance.
 */
export const RELATEDNESS_TERMS = {
  close: {
    type: 'close' as const,
    label: 'Close Breeding',
    secondaryLabel: 'mag-amay / magbugto',
    fullLabel: 'Close Breeding (mag-amay / magbugto)',
    description: 'Parent × offspring or full siblings.',
    badgeColor: 'amber',
  },
  line: {
    type: 'line' as const,
    label: 'Line Breeding',
    secondaryLabel: 'magpakaisa',
    fullLabel: 'Line Breeding (magpakaisa)',
    description: 'Shared ancestor within search depth (e.g. half-siblings, cousins, grandparent × grandchild).',
    badgeColor: 'blue',
  },
  outcross: {
    type: 'outcross' as const,
    label: 'Outcross (no known shared ancestor)',
    secondaryLabel: 'hindi magka-anak',
    fullLabel: 'Outcross (no known shared ancestor)',
    description: 'No shared ancestor found within search depth.',
    tooltip: 'Based on recorded lineage only.',
    badgeColor: 'emerald',
  },
  unknown: {
    type: 'unknown' as const,
    label: 'Unknown',
    secondaryLabel: 'kulang sa datos',
    fullLabel: 'Unknown (not enough lineage data)',
    description: 'Not enough lineage data to decide (missing parents).',
    tooltip: 'Not enough lineage data to determine relatedness.',
    badgeColor: 'neutral',
  },
} as const;

export interface SharedAncestorInfo {
  id?: number;
  name: string;
  sireDepth: number;
  damDepth: number;
}

export interface RelatednessClassification {
  type: RelatednessType;
  label: string;
  secondaryLabel: string;
  fullLabel: string;
  relationship: string;
  sharedAncestors: SharedAncestorInfo[];
  inbreedingCoefficient: number | null; // 0 to 100%, or null for foundation / unknown
  tooltip: string;
  isCloseBreeding: boolean;
  requiresConfirmation: boolean;
}

/** Check if a parent string denotes explicit foundation stock. */
export function isFoundationParent(parentName?: string | null): boolean {
  if (!parentName) return false;
  return (parentName || '').trim().toLowerCase() === FOUNDATION_STOCK;
}

/** Check if a fowl is a foundation bird (no recorded parents or explicitly recorded as Foundation Stock). */
export function isFoundationBird(fowl: FowlRecord | null | undefined): boolean {
  if (!fowl) return false;
  const noSireId = fowl.sire_id == null;
  const noDamId = fowl.dam_id == null;
  const isSireUnrecorded = !fowl.sire || (fowl.sire || '').trim() === '' || isFoundationParent(fowl.sire);
  const isDamUnrecorded = !fowl.dam || (fowl.dam || '').trim() === '' || isFoundationParent(fowl.dam);
  return noSireId && noDamId && isSireUnrecorded && isDamUnrecorded;
}

interface AncestorNode {
  fowl?: FowlRecord;
  name: string;
  id?: number;
  depth: number;
}

/**
 * Traverse all ancestors of a chicken up to maxDepth.
 * Uses a visited Set of fowl IDs and normalized names to guard against cycles.
 */
export function collectAncestors(
  root: FowlRecord,
  fowls: FowlRecord[],
  maxDepth = DEFAULT_RELATEDNESS_SEARCH_DEPTH
): Map<string, AncestorNode> {
  const ancestors = new Map<string, AncestorNode>();
  const visited = new Set<string>();

  const rootKey = nameKey(root.name) || String(root.id);
  visited.add(rootKey);

  function walk(current: FowlRecord, depth: number) {
    if (depth > maxDepth) return;

    const parents: { name?: string | null; role: 'sire' | 'dam' }[] = [
      { name: current.sire, role: 'sire' },
      { name: current.dam, role: 'dam' },
    ];

    for (const { name, role } of parents) {
      if (!isKnownParent(name)) continue;

      const pRecord = parentRecordOf(current, role, fowls);
      const pName = pRecord?.name || normalizeParentName(name);
      const pKey = nameKey(pName);

      if (!pKey || visited.has(pKey)) continue;

      // Add to ancestor map if not recorded or at a shallower depth
      const existing = ancestors.get(pKey);
      if (!existing || depth < existing.depth) {
        ancestors.set(pKey, {
          fowl: pRecord || undefined,
          name: pName,
          id: pRecord?.id,
          depth,
        });
      }

      if (pRecord) {
        visited.add(pKey);
        walk(pRecord, depth + 1);
        visited.delete(pKey);
      }
    }
  }

  walk(root, 1);
  return ancestors;
}

/**
 * Classifies the genealogical relatedness between a prospective or recorded sire and dam.
 *
 * Rules:
 * - Close Breeding ("mag-amay / magbugto"): Parent x Offspring or Full Siblings.
 * - Line Breeding ("magpakaisa"): More distant relatives sharing >= 1 ancestor within maxDepth
 *   (e.g. Grandparent x Grandchild, Half-siblings, First cousins, etc.).
 * - Outcross: No shared ancestor found within search depth.
 * - Unknown: Incomplete/missing parent lineage where relatedness cannot be determined.
 *
 * @param sire Prospective male chicken
 * @param dam Prospective female chicken
 * @param fowls Full flock registry for ancestry tree traversal
 * @param maxDepth Max search depth (default 4 generations)
 */
export function classifyPairingRelatedness(
  sire: FowlRecord | null | undefined,
  dam: FowlRecord | null | undefined,
  fowls: FowlRecord[] = [],
  maxDepth = DEFAULT_RELATEDNESS_SEARCH_DEPTH
): RelatednessClassification {
  if (!sire || !dam) {
    return {
      type: 'unknown',
      label: RELATEDNESS_TERMS.unknown.label,
      secondaryLabel: RELATEDNESS_TERMS.unknown.secondaryLabel,
      fullLabel: RELATEDNESS_TERMS.unknown.fullLabel,
      relationship: 'Missing chicken selection',
      sharedAncestors: [],
      inbreedingCoefficient: null,
      tooltip: RELATEDNESS_TERMS.unknown.tooltip,
      isCloseBreeding: false,
      requiresConfirmation: false,
    };
  }

  // 1. Same chicken (self-pairing)
  if (sire.id === dam.id || nameKey(sire.name) === nameKey(dam.name)) {
    return {
      type: 'close',
      label: RELATEDNESS_TERMS.close.label,
      secondaryLabel: RELATEDNESS_TERMS.close.secondaryLabel,
      fullLabel: RELATEDNESS_TERMS.close.fullLabel,
      relationship: 'Same chicken (self)',
      sharedAncestors: [{ id: sire.id, name: sire.name, sireDepth: 0, damDepth: 0 }],
      inbreedingCoefficient: 50,
      tooltip: `${RELATEDNESS_TERMS.close.fullLabel} — Same chicken.`,
      isCloseBreeding: true,
      requiresConfirmation: true,
    };
  }

  // 2. Direct Parent x Offspring check
  const sireKey = nameKey(sire.name);
  const damKey = nameKey(dam.name);

  // Is sire the father of dam?
  const damSireMatch =
    (dam.sire_id != null && dam.sire_id === sire.id) ||
    (isKnownParent(dam.sire) && nameKey(dam.sire) === sireKey);
  if (damSireMatch) {
    return {
      type: 'close',
      label: RELATEDNESS_TERMS.close.label,
      secondaryLabel: RELATEDNESS_TERMS.close.secondaryLabel,
      fullLabel: RELATEDNESS_TERMS.close.fullLabel,
      relationship: 'Parent × Offspring (Father × Daughter)',
      sharedAncestors: [{ id: sire.id, name: sire.name, sireDepth: 0, damDepth: 1 }],
      inbreedingCoefficient: 25,
      tooltip: `${RELATEDNESS_TERMS.close.fullLabel} — Sire is the direct father of the dam.`,
      isCloseBreeding: true,
      requiresConfirmation: true,
    };
  }

  // Is dam the mother of sire?
  const sireDamMatch =
    (sire.dam_id != null && sire.dam_id === dam.id) ||
    (isKnownParent(sire.dam) && nameKey(sire.dam) === damKey);
  if (sireDamMatch) {
    return {
      type: 'close',
      label: RELATEDNESS_TERMS.close.label,
      secondaryLabel: RELATEDNESS_TERMS.close.secondaryLabel,
      fullLabel: RELATEDNESS_TERMS.close.fullLabel,
      relationship: 'Parent × Offspring (Son × Mother)',
      sharedAncestors: [{ id: dam.id, name: dam.name, sireDepth: 1, damDepth: 0 }],
      inbreedingCoefficient: 25,
      tooltip: `${RELATEDNESS_TERMS.close.fullLabel} — Dam is the direct mother of the sire.`,
      isCloseBreeding: true,
      requiresConfirmation: true,
    };
  }

  // Check parent details of sire and dam
  const sireHasSire = isKnownParent(sire.sire);
  const sireHasDam = isKnownParent(sire.dam);
  const damHasSire = isKnownParent(dam.sire);
  const damHasDam = isKnownParent(dam.dam);

  // Check for shared direct parents
  const sameSire =
    sireHasSire &&
    damHasSire &&
    ((sire.sire_id != null && dam.sire_id != null && sire.sire_id === dam.sire_id) ||
      nameKey(sire.sire) === nameKey(dam.sire));

  const sameDam =
    sireHasDam &&
    damHasDam &&
    ((sire.dam_id != null && dam.dam_id != null && sire.dam_id === dam.dam_id) ||
      nameKey(sire.dam) === nameKey(dam.dam));

  // 3. Full Siblings (both parents the same)
  if (sameSire && sameDam) {
    const shared: SharedAncestorInfo[] = [];
    if (sire.sire) shared.push({ name: sire.sire, sireDepth: 1, damDepth: 1 });
    if (sire.dam) shared.push({ name: sire.dam, sireDepth: 1, damDepth: 1 });
    return {
      type: 'close',
      label: RELATEDNESS_TERMS.close.label,
      secondaryLabel: RELATEDNESS_TERMS.close.secondaryLabel,
      fullLabel: RELATEDNESS_TERMS.close.fullLabel,
      relationship: 'Full siblings',
      sharedAncestors: shared,
      inbreedingCoefficient: 25,
      tooltip: `${RELATEDNESS_TERMS.close.fullLabel} — Both sire and dam share the same father and mother.`,
      isCloseBreeding: true,
      requiresConfirmation: true,
    };
  }

  // 4. Half-Siblings (shared sire or shared dam)
  if (sameSire || sameDam) {
    const sharedName = sameSire ? sire.sire! : sire.dam!;
    const sharedRole = sameSire ? 'sire' : 'dam';
    return {
      type: 'line',
      label: RELATEDNESS_TERMS.line.label,
      secondaryLabel: RELATEDNESS_TERMS.line.secondaryLabel,
      fullLabel: RELATEDNESS_TERMS.line.fullLabel,
      relationship: `Half-siblings (shared ${sharedRole})`,
      sharedAncestors: [{ name: sharedName, sireDepth: 1, damDepth: 1 }],
      inbreedingCoefficient: 12.5,
      tooltip: `${RELATEDNESS_TERMS.line.fullLabel} — Sire and dam share a common ${sharedRole} (${sharedName}).`,
      isCloseBreeding: false,
      requiresConfirmation: false,
    };
  }

  // 5. Ancestor Traversal up to maxDepth
  const sireAncestors = collectAncestors(sire, fowls, maxDepth);
  const damAncestors = collectAncestors(dam, fowls, maxDepth);

  // Check if sire is in dam's ancestors (e.g. Grandparent x Grandchild or Great-grandparent)
  const sireAsDamAncestor = damAncestors.get(sireKey);
  if (sireAsDamAncestor) {
    const depth = sireAsDamAncestor.depth;
    const rel = depth === 2 ? 'Grandparent × Grandchild' : `Great-grandparent × Great-grandchild (G${depth})`;
    const coeff = 100 * Math.pow(0.5, depth + 1);
    return {
      type: 'line',
      label: RELATEDNESS_TERMS.line.label,
      secondaryLabel: RELATEDNESS_TERMS.line.secondaryLabel,
      fullLabel: RELATEDNESS_TERMS.line.fullLabel,
      relationship: rel,
      sharedAncestors: [{ id: sire.id, name: sire.name, sireDepth: 0, damDepth: depth }],
      inbreedingCoefficient: coeff,
      tooltip: `${RELATEDNESS_TERMS.line.fullLabel} — Sire is an ancestor of the dam at depth G${depth}.`,
      isCloseBreeding: false,
      requiresConfirmation: false,
    };
  }

  // Check if dam is in sire's ancestors
  const damAsSireAncestor = sireAncestors.get(damKey);
  if (damAsSireAncestor) {
    const depth = damAsSireAncestor.depth;
    const rel = depth === 2 ? 'Grandparent × Grandchild' : `Great-grandparent × Great-grandchild (G${depth})`;
    const coeff = 100 * Math.pow(0.5, depth + 1);
    return {
      type: 'line',
      label: RELATEDNESS_TERMS.line.label,
      secondaryLabel: RELATEDNESS_TERMS.line.secondaryLabel,
      fullLabel: RELATEDNESS_TERMS.line.fullLabel,
      relationship: rel,
      sharedAncestors: [{ id: dam.id, name: dam.name, sireDepth: depth, damDepth: 0 }],
      inbreedingCoefficient: coeff,
      tooltip: `${RELATEDNESS_TERMS.line.fullLabel} — Dam is an ancestor of the sire at depth G${depth}.`,
      isCloseBreeding: false,
      requiresConfirmation: false,
    };
  }

  // Check common ancestors between sire and dam
  const commonAncestors: SharedAncestorInfo[] = [];
  for (const [key, sAnc] of sireAncestors.entries()) {
    const dAnc = damAncestors.get(key);
    if (dAnc) {
      commonAncestors.push({
        id: sAnc.id || dAnc.id,
        name: sAnc.name,
        sireDepth: sAnc.depth,
        damDepth: dAnc.depth,
      });
    }
  }

  if (commonAncestors.length > 0) {
    // Sort by closest generation distance (minimum total depth)
    commonAncestors.sort((a, b) => a.sireDepth + a.damDepth - (b.sireDepth + b.damDepth));
    const closest = commonAncestors[0];

    // Determine specific relationship name
    let rel = `Line breeding (shared ancestor: ${closest.name})`;
    let coeff = 0;
    if (closest.sireDepth === 2 && closest.damDepth === 2) {
      rel = 'First cousins';
      coeff = 6.25;
    } else if (
      (closest.sireDepth === 1 && closest.damDepth === 2) ||
      (closest.sireDepth === 2 && closest.damDepth === 1)
    ) {
      rel = 'Uncle/Aunt × Niece/Nephew';
      coeff = 12.5;
    } else {
      // General Wright coefficient contribution for this common ancestor: (1/2)^(sDepth + dDepth + 1)
      coeff = 100 * Math.pow(0.5, closest.sireDepth + closest.damDepth + 1);
    }

    return {
      type: 'line',
      label: RELATEDNESS_TERMS.line.label,
      secondaryLabel: RELATEDNESS_TERMS.line.secondaryLabel,
      fullLabel: RELATEDNESS_TERMS.line.fullLabel,
      relationship: rel,
      sharedAncestors: commonAncestors,
      inbreedingCoefficient: Math.round(coeff * 10) / 10,
      tooltip: `${RELATEDNESS_TERMS.line.fullLabel} — Shares common ancestor ${closest.name} (G${closest.sireDepth} / G${closest.damDepth}).`,
      isCloseBreeding: false,
      requiresConfirmation: false,
    };
  }

  // 6. No common ancestor found. Check if lineage is complete or missing.
  // Foundation stock birds count as known unrelated base stock.
  // But if a bird has null/blank parents without foundation stock status, or unverified parents, mark unknown.
  const sireLineageMissing =
    (!sire.sire && !isFoundationParent(sire.sire)) || (!sire.dam && !isFoundationParent(sire.dam));
  const damLineageMissing =
    (!dam.sire && !isFoundationParent(dam.sire)) || (!dam.dam && !isFoundationParent(dam.dam));

  // If either bird is an offspring without parent data, classify as unknown
  const isSireOffspringWithMissing = !isFoundationBird(sire) && (!sireHasSire || !sireHasDam);
  const isDamOffspringWithMissing = !isFoundationBird(dam) && (!damHasSire || !damHasDam);

  if (isSireOffspringWithMissing || isDamOffspringWithMissing) {
    return {
      type: 'unknown',
      label: RELATEDNESS_TERMS.unknown.label,
      secondaryLabel: RELATEDNESS_TERMS.unknown.secondaryLabel,
      fullLabel: RELATEDNESS_TERMS.unknown.fullLabel,
      relationship: 'Missing parent data',
      sharedAncestors: [],
      inbreedingCoefficient: null,
      tooltip: RELATEDNESS_TERMS.unknown.tooltip,
      isCloseBreeding: false,
      requiresConfirmation: false,
    };
  }

  // 7. Proven Outcross (within search depth)
  return {
    type: 'outcross',
    label: RELATEDNESS_TERMS.outcross.label,
    secondaryLabel: RELATEDNESS_TERMS.outcross.secondaryLabel,
    fullLabel: RELATEDNESS_TERMS.outcross.fullLabel,
    relationship: 'No known shared ancestor',
    sharedAncestors: [],
    inbreedingCoefficient: 0,
    tooltip: RELATEDNESS_TERMS.outcross.tooltip,
    isCloseBreeding: false,
    requiresConfirmation: false,
  };
}

/**
 * Convenience helper: classify the parentage relatedness of an existing recorded fowl.
 * Inspects its sire and dam from the flock registry.
 */
export function getOffspringParentageRelatedness(
  fowl: FowlRecord | null | undefined,
  fowls: FowlRecord[] = []
): RelatednessClassification {
  if (!fowl) {
    return {
      type: 'unknown',
      label: RELATEDNESS_TERMS.unknown.label,
      secondaryLabel: RELATEDNESS_TERMS.unknown.secondaryLabel,
      fullLabel: RELATEDNESS_TERMS.unknown.fullLabel,
      relationship: 'No fowl provided',
      sharedAncestors: [],
      inbreedingCoefficient: null,
      tooltip: RELATEDNESS_TERMS.unknown.tooltip,
      isCloseBreeding: false,
      requiresConfirmation: false,
    };
  }

  // If this is a foundation stock bird with no parents recorded
  if (isFoundationBird(fowl)) {
    return {
      type: 'unknown',
      label: 'Unknown (foundation stock, no recorded parents)',
      secondaryLabel: RELATEDNESS_TERMS.unknown.secondaryLabel,
      fullLabel: `Unknown (foundation stock, no recorded parents) · ${RELATEDNESS_TERMS.unknown.secondaryLabel}`,
      relationship: 'Foundation stock (no recorded parents)',
      sharedAncestors: [],
      inbreedingCoefficient: null,
      tooltip: 'No recorded parents available to determine relatedness.',
      isCloseBreeding: false,
      requiresConfirmation: false,
    };
  }

  const sire = parentRecordOf(fowl, 'sire', fowls);
  const dam = parentRecordOf(fowl, 'dam', fowls);

  // If parents are not in registry, check if names are given as foundation stock or missing
  if (!sire || !dam) {
    // If one or both parents are unregistered names or missing
    if (!sire && !dam && !isKnownParent(fowl.sire) && !isKnownParent(fowl.dam)) {
      return {
        type: 'unknown',
        label: RELATEDNESS_TERMS.unknown.label,
        secondaryLabel: RELATEDNESS_TERMS.unknown.secondaryLabel,
        fullLabel: RELATEDNESS_TERMS.unknown.fullLabel,
        relationship: 'Unrecorded parentage',
        sharedAncestors: [],
        inbreedingCoefficient: null,
        tooltip: RELATEDNESS_TERMS.unknown.tooltip,
        isCloseBreeding: false,
        requiresConfirmation: false,
      };
    }
  }

  // If both parents are resolved or foundation
  const effectiveSire = sire || ({
    id: -1,
    name: fowl.sire || 'Sire',
    sire: FOUNDATION_STOCK,
    dam: FOUNDATION_STOCK,
  } as FowlRecord);

  const effectiveDam = dam || ({
    id: -2,
    name: fowl.dam || 'Dam',
    sire: FOUNDATION_STOCK,
    dam: FOUNDATION_STOCK,
  } as FowlRecord);

  return classifyPairingRelatedness(effectiveSire, effectiveDam, fowls);
}
