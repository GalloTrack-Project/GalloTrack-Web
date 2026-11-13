import { describe, expect, it } from 'vitest';
import type { FowlRecord } from './types';
import { buildIdentityGroups, parentCodeLabels } from './hub-identity';

const fowl = (
  id: number,
  name: string,
  gender: string,
  code: string,
  sire = '',
  dam = '',
): FowlRecord =>
  ({
    id,
    name,
    gender,
    bird_code: code,
    breed: 'Hatch',
    status: 'Active',
    sire,
    dam,
  }) as FowlRecord;

const sires = [fowl(1, 'Sire 2', 'Rooster', '2'), fowl(2, 'Sire 1', 'Rooster', '1')];
const dams = [fowl(3, 'Dam B', 'Hen', 'B'), fowl(4, 'Dam A', 'Hen', 'A')];
const offspring = [
  fowl(5, 'Offspring 1A10', 'Rooster', '1A10', 'Sire 1', 'Dam A'),
  fowl(6, 'Offspring 2B1', 'Hen', '2B1', 'Sire 2', 'Dam B'),
  fowl(7, 'Offspring 1A2', 'Hen', '1A2', 'Sire 1', 'Dam A'),
  fowl(8, 'Offspring 1A1', 'Rooster', '1A1', 'Sire 1', 'Dam A'),
];
const custom = [fowl(9, 'Custom Bird', 'Rooster', 'CUSTOM1')];
const all = [...custom, ...offspring.slice(2), ...dams, ...sires, ...offspring.slice(0, 2)];
const codes = new Map(all.map((bird) => [String(bird.id), bird.bird_code || '']));

describe('hub identity ordering', () => {
  it('sorts sires, then dams, then offspring groups, then custom codes', () => {
    const groups = buildIdentityGroups(all, codes);
    expect(groups.map((group) => group.kind)).toEqual([
      'parents',
      'offspring',
      'offspring',
      'custom',
    ]);
    expect(groups[0].fowls.map((bird) => bird.bird_code)).toEqual(['1', '2', 'A', 'B']);
    expect(groups[1].sireLabel).toBe('1');
    expect(groups[1].damLabel).toBe('A');
    expect(groups[1].fowls.map((bird) => bird.bird_code)).toEqual(['1A1', '1A2', '1A10']);
    expect(groups[2].fowls.map((bird) => bird.bird_code)).toEqual(['2B1']);
    expect(groups[3].fowls.map((bird) => bird.bird_code)).toEqual(['CUSTOM1']);
  });

  it('resolves parent codes for the offspring caption', () => {
    expect(parentCodeLabels(offspring[0], all, codes)).toEqual({ sire: '1', dam: 'A' });
    expect(parentCodeLabels(offspring[1], all, codes)).toEqual({ sire: '2', dam: 'B' });
  });
});
