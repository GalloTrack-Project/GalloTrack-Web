import type { FowlRecord } from './types';
import type { WinRateStats } from './win-rate';
import { compareBirdCodesNatural } from './bird-code';

export type ParentPickerSort = 'most' | 'name' | 'code';

export type ParentPickerEntry = {
  name: string;
  children: FowlRecord[];
  code: string;
  stats: WinRateStats;
  wingBand: string;
};

export function sortParentEntries(
  entries: ParentPickerEntry[],
  sort: ParentPickerSort,
): ParentPickerEntry[] {
  const list = [...entries];
  if (sort === 'name') {
    return list.sort(
      (a, b) => a.name.localeCompare(b.name) || compareBirdCodesNatural(a.code, b.code),
    );
  }
  if (sort === 'code') {
    return list.sort(
      (a, b) => compareBirdCodesNatural(a.code, b.code) || a.name.localeCompare(b.name),
    );
  }
  return list.sort(
    (a, b) =>
      b.children.length - a.children.length ||
      a.name.localeCompare(b.name) ||
      compareBirdCodesNatural(a.code, b.code),
  );
}
