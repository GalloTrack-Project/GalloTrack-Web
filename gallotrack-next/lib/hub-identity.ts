import type { FowlRecord } from './types';
import { compareBirdCodesNatural, formatBirdCodeForDisplay } from './bird-code';
import { classifyBirdCode } from './breeding';
import { parentRecordOf } from './lineage';

export type IdentityGroupKind = 'parents' | 'offspring' | 'custom';

export interface IdentityGroup {
  key: string;
  kind: IdentityGroupKind;
  sireLabel?: string;
  damLabel?: string;
  fowls: FowlRecord[];
}

export function identityCode(fowl: FowlRecord, codes: Map<string, string>): string {
  return codes.get(String(fowl.id)) || fowl.bird_code || '';
}

function sortByCode(a: FowlRecord, b: FowlRecord, codes: Map<string, string>): number {
  return compareBirdCodesNatural(identityCode(a, codes), identityCode(b, codes));
}

export function parentCodeLabels(
  fowl: FowlRecord,
  fowls: FowlRecord[],
  codes: Map<string, string>,
): { sire: string; dam: string } {
  const labelFor = (role: 'sire' | 'dam'): string => {
    const parent = parentRecordOf(fowl, role, fowls);
    if (parent) {
      const code = identityCode(parent, codes);
      if (code) return formatBirdCodeForDisplay(code) || code;
      return parent.name;
    }
    return ((role === 'sire' ? fowl.sire : fowl.dam) || '').trim();
  };

  return { sire: labelFor('sire'), dam: labelFor('dam') };
}

function compareLabels(a: string, b: string): number {
  return compareBirdCodesNatural(a, b);
}

export function buildIdentityGroups(
  fowls: FowlRecord[],
  codes: Map<string, string>,
): IdentityGroup[] {
  const sires: FowlRecord[] = [];
  const dams: FowlRecord[] = [];
  const offspring: FowlRecord[] = [];
  const custom: FowlRecord[] = [];

  for (const fowl of fowls) {
    const kind = classifyBirdCode(identityCode(fowl, codes));
    if (kind === 'sire') sires.push(fowl);
    else if (kind === 'dam') dams.push(fowl);
    else if (kind === 'offspring') offspring.push(fowl);
    else custom.push(fowl);
  }

  sires.sort((a, b) => sortByCode(a, b, codes));
  dams.sort((a, b) => sortByCode(a, b, codes));
  custom.sort((a, b) => sortByCode(a, b, codes));

  const offspringGroups = new Map<string, IdentityGroup>();
  for (const fowl of offspring) {
    const labels = parentCodeLabels(fowl, fowls, codes);
    const key = `${labels.sire.toLowerCase()}::${labels.dam.toLowerCase()}`;
    const group = offspringGroups.get(key) ?? {
      key,
      kind: 'offspring' as const,
      sireLabel: labels.sire,
      damLabel: labels.dam,
      fowls: [],
    };
    group.fowls.push(fowl);
    offspringGroups.set(key, group);
  }

  const groups: IdentityGroup[] = [];
  const parents = [...sires, ...dams];
  if (parents.length > 0) {
    groups.push({ key: 'parents', kind: 'parents', fowls: parents });
  }

  const sortedOffspringGroups = [...offspringGroups.values()].sort((a, b) => {
    const sireCmp = compareLabels(a.sireLabel || '', b.sireLabel || '');
    if (sireCmp !== 0) return sireCmp;
    return compareLabels(a.damLabel || '', b.damLabel || '');
  });

  for (const group of sortedOffspringGroups) {
    group.fowls.sort((a, b) => sortByCode(a, b, codes));
    groups.push(group);
  }

  if (custom.length > 0) {
    groups.push({ key: 'custom', kind: 'custom', fowls: custom });
  }

  return groups;
}
