import { describe, expect, it } from 'vitest';
import { buildCodeSet } from './bird-code';
import type { FowlRecord } from './types';
import {
  formatParentDisplayName,
  isOffspringRegistration,
  previewRegistrationIdentifier,
} from './registration-type';

const fowl = (
  id: number,
  name: string,
  gender: string,
  birdCode: string,
  role: FowlRecord['registry_role'] = 'Non-Breeding',
): FowlRecord =>
  ({
    id,
    name,
    gender,
    breed: 'Hatch',
    status: 'Active',
    bird_code: birdCode,
    registry_role: role,
    sire: id >= 3 ? 'Sire 1' : 'Foundation Stock',
    dam: id >= 3 ? 'Dam A' : 'Foundation Stock',
  }) as FowlRecord;

const farm: FowlRecord[] = [
  fowl(1, 'Sire 1', 'Rooster', '1', 'Breeding Male'),
  fowl(2, 'Dam A', 'Hen', 'A', 'Breeding Female'),
  fowl(3, 'Offspring 1A1', 'Rooster', '1A1'),
  fowl(4, 'Offspring 1A2', 'Hen', '1A2'),
  fowl(5, 'Offspring 1A3', 'Rooster', '1A3'),
  fowl(6, 'Offspring 1A4', 'Hen', '1A4'),
];

const takenForFarm = () => buildCodeSet(['1', 'A', '1A1', '1A2', '1A3', '1A4']);

describe('registration type and parent display', () => {
  it('maps legacy Foundation Stock to the new external label', () => {
    expect(
      formatParentDisplayName('Foundation Stock', {
        external: 'External / Unregistered',
        unknown: 'Unknown parents',
      }),
    ).toBe('External / Unregistered');
    expect(
      formatParentDisplayName('', {
        external: 'External / Unregistered',
        unknown: 'Unknown parents',
      }),
    ).toBe('Unknown parents');
    expect(
      formatParentDisplayName('Honey Lemon', {
        external: 'External / Unregistered',
        unknown: 'Unknown parents',
      }),
    ).toBe('Honey Lemon');
  });

  it('detects offspring registration explicitly', () => {
    expect(isOffspringRegistration('offspring')).toBe(true);
    expect(isOffspringRegistration('new')).toBe(false);
  });

  it('keeps New bird cock/hen codes as the next number/letter', () => {
    expect(
      previewRegistrationIdentifier({
        registrationType: 'new',
        gender: 'Rooster',
        fowls: farm,
        taken: takenForFarm(),
      }),
    ).toBe('2');
    expect(
      previewRegistrationIdentifier({
        registrationType: 'new',
        gender: 'Hen',
        fowls: farm,
        taken: takenForFarm(),
      }),
    ).toBe('B');
  });

  it('ignores external parent names for a New bird identifier', () => {
    const withoutParents = previewRegistrationIdentifier({
      registrationType: 'new',
      gender: 'Rooster',
      fowls: farm,
      taken: takenForFarm(),
    });
    const withExternalParents = previewRegistrationIdentifier({
      registrationType: 'new',
      gender: 'Rooster',
      sireName: 'External Sire',
      damName: 'External Dam',
      fowls: farm,
      taken: takenForFarm(),
    });
    expect(withExternalParents).toBe(withoutParents);
  });

  it('gives cock and hen offspring of the same pair sequential codes', () => {
    const first = previewRegistrationIdentifier({
      registrationType: 'offspring',
      gender: 'Rooster',
      sireName: 'Sire 1',
      damName: 'Dam A',
      fowls: farm,
      taken: takenForFarm(),
    });
    expect(first).toBe('1A5');

    const nextTaken = takenForFarm();
    nextTaken.add('1a5');
    expect(
      previewRegistrationIdentifier({
        registrationType: 'offspring',
        gender: 'Hen',
        sireName: 'Sire 1',
        damName: 'Dam A',
        fowls: farm,
        taken: nextTaken,
      }),
    ).toBe('1A6');
  });
});
