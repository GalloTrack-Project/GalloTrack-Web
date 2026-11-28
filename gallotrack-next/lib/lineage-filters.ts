import type { FowlRecord } from '@/lib/types';
import type { LineageIndex } from '@/lib/lineage-graph';
import { canFight } from '@/lib/helpers';
import { classifyCrisscross } from '@/lib/lineage';
import { classifyPairingRelatedness } from '@/lib/relatedness-classification';

export type LineageSexFilter = 'all' | 'male' | 'female';
export type LineageGenerationFilter = 'all' | '1' | '2' | '3';
export type LineagePairType = 'crisscross' | 'outcross' | 'others';
export type LineagePairFilter = 'all' | LineagePairType;

export interface LineageTreeFilters {
  sex: LineageSexFilter;
  generation: LineageGenerationFilter;
  feather: string;
  pair: LineagePairFilter;
}

export const DEFAULT_LINEAGE_TREE_FILTERS: LineageTreeFilters = {
  sex: 'all',
  generation: 'all',
  feather: 'all',
  pair: 'all',
};

export function featherColorOf(fowl: Pick<FowlRecord, 'feather_color' | 'color'>): string {
  return (fowl.feather_color || fowl.color || '').trim();
}

export function distinctFeatherColors(fowls: readonly FowlRecord[]): string[] {
  const values = new Set<string>();
  fowls.forEach((fowl) => {
    const color = featherColorOf(fowl);
    if (color) values.add(color);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

export function lineagePairTypeOf(
  fowl: FowlRecord,
  index: LineageIndex,
  fowls: FowlRecord[],
): LineagePairType {
  const parents = index.parentsByChild.get(String(fowl.id));
  const sire = parents?.sire ?? null;
  const dam = parents?.dam ?? null;
  if (classifyCrisscross(sire, dam, index).isCrisscross) return 'crisscross';
  if (classifyPairingRelatedness(sire, dam, fowls).type === 'outcross') return 'outcross';
  return 'others';
}

export function isWingBandSearchMatch(fowl: FowlRecord, term: string): boolean {
  const query = term.trim().toLowerCase();
  return Boolean(query && canFight(fowl) && (fowl.wing_band || '').toLowerCase().includes(query));
}

export function matchesLineageTreeFilters(
  filters: LineageTreeFilters,
  candidate: {
    fowl: FowlRecord;
    generation: number;
    pairType: LineagePairType;
  },
): boolean {
  if (filters.sex === 'male' && !canFight(candidate.fowl)) return false;
  if (filters.sex === 'female' && canFight(candidate.fowl)) return false;
  if (filters.generation !== 'all' && candidate.generation !== Number(filters.generation)) {
    return false;
  }
  if (filters.feather !== 'all' && featherColorOf(candidate.fowl) !== filters.feather) {
    return false;
  }
  if (filters.pair !== 'all' && candidate.pairType !== filters.pair) return false;
  return true;
}
