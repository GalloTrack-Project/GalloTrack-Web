import type { FowlRecord } from './types';
import { isKnownParent, nameKey } from './family-tree';
import { canFight, isFemale, sexLabel } from './helpers';
import { parentRecordOf, resolveParentId } from './lineage';

/**
 * A sire is always a cock (male) and a dam is always a hen (female).
 * These helpers are the single source of truth for that rule in pickers,
 * forms, the lineage tabs, the server fowl route and the integrity report.
 */
export type ParentRole = 'sire' | 'dam';

export const PARENT_ROLES: readonly ParentRole[] = ['sire', 'dam'];

export const PARENT_ROLE_LABEL: Record<ParentRole, string> = {
  sire: 'Sire',
  dam: 'Dam',
};

export const PARENT_SEX_EXPECTATION: Record<ParentRole, 'Cock' | 'Hen'> = {
  sire: 'Cock',
  dam: 'Hen',
};

/** True when a registry row has the sex required by the parent role. */
export function parentHasRequiredSex(
  parent: Pick<FowlRecord, 'gender'> | null | undefined,
  role: ParentRole
): boolean {
  if (!parent) return false;
  return role === 'sire' ? canFight(parent) : isFemale(parent.gender);
}

/** Human-readable rejection used by every form and by the server route. */
export function parentSexMismatchMessage(
  role: ParentRole,
  parent: Pick<FowlRecord, 'name' | 'gender'>
): string {
  const expected = role === 'sire' ? 'male (cock)' : 'female (hen)';
  return `${PARENT_ROLE_LABEL[role]} must be ${expected}. "${parent.name}" is recorded as ${sexLabel(parent)}.`;
}

/**
 * Resolve a parent name to its registry row. Unresolvable names (foundation
 * stock, external/custom parents) return null and are not sex-checked.
 */
export function parentRecordByName(
  name: string | null | undefined,
  fowls: FowlRecord[],
  child?: { id?: number; user_id?: string | number } | null
): FowlRecord | null {
  if (!isKnownParent(name)) return null;
  const id = resolveParentId(name, child, fowls);
  return id == null ? null : fowls.find((f) => f.id === id) ?? null;
}

/**
 * Validate the parent names being submitted for a fowl. Only resolvable
 * registry parents are checked; a legacy parent that is unchanged from the
 * record being edited is skipped so unrelated edits are never blocked.
 */
export function validateParentRoles(
  parents: { sire?: string | null; dam?: string | null },
  fowls: FowlRecord[],
  options: {
    child?: { id?: number; user_id?: string | number } | null;
    previous?: { sire?: string | null; dam?: string | null };
  } = {}
): string | null {
  for (const role of PARENT_ROLES) {
    const name = parents[role];
    if (!isKnownParent(name)) continue;
    if (options.previous && nameKey(options.previous[role]) === nameKey(name)) continue;
    const parent = parentRecordByName(name, fowls, options.child);
    if (!parent) continue;
    if (!parentHasRequiredSex(parent, role)) {
      return parentSexMismatchMessage(role, parent);
    }
  }
  return null;
}

export type ParentSexMismatch = {
  childId: number;
  childName: string;
  role: ParentRole;
  parentId: number;
  parentName: string;
  parentSex: 'Cock' | 'Hen' | 'Unknown';
  expectedSex: 'Cock' | 'Hen';
};

/**
 * Report-only integrity scan: every registered child whose resolved sire is
 * not male or resolved dam is not female. Nothing is fixed or deleted.
 * External/foundation parent names (no registry row) are not reported because
 * there is no stored sex to contradict the role.
 */
export function findParentSexMismatches(fowls: FowlRecord[]): ParentSexMismatch[] {
  const mismatches: ParentSexMismatch[] = [];

  for (const child of fowls) {
    for (const role of PARENT_ROLES) {
      const name = role === 'sire' ? child.sire : child.dam;
      if (!isKnownParent(name)) continue;
      const parent = parentRecordOf(child, role, fowls);
      if (!parent || parentHasRequiredSex(parent, role)) continue;
      mismatches.push({
        childId: child.id,
        childName: child.name,
        role,
        parentId: parent.id,
        parentName: parent.name,
        parentSex: sexLabel(parent),
        expectedSex: PARENT_SEX_EXPECTATION[role],
      });
    }
  }

  return mismatches;
}
