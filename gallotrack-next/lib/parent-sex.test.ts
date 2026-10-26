import { describe, it, expect } from 'vitest';
import type { FowlRecord } from './types';
import {
  findParentSexMismatches,
  parentHasRequiredSex,
  validateParentRoles,
} from './parent-sex';

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bird_code: '',
    status: 'Active',
    user_id: 'farm-1',
    ...partial,
  }) as FowlRecord;

const cock = bird({ id: 1, name: 'Cock 1', gender: 'Rooster', bird_code: '1' });
const hen = bird({ id: 2, name: 'Hen A', gender: 'Hen', bird_code: 'A' });
const unknown = bird({ id: 3, name: 'Unsexed', gender: '', bird_code: 'B' });

describe('parent role / sex rules', () => {
  it('accepts a cock as sire and a hen as dam', () => {
    expect(parentHasRequiredSex(cock, 'sire')).toBe(true);
    expect(parentHasRequiredSex(hen, 'dam')).toBe(true);
    expect(validateParentRoles({ sire: 'Cock 1', dam: 'Hen A' }, [cock, hen])).toBeNull();
  });

  it('rejects a hen submitted as sire', () => {
    const error = validateParentRoles({ sire: 'Hen A' }, [cock, hen]);
    expect(error).toContain('Sire must be male (cock)');
    expect(error).toContain('"Hen A" is recorded as Hen');
  });

  it('rejects a cock submitted as dam', () => {
    const error = validateParentRoles({ dam: 'Cock 1' }, [cock, hen]);
    expect(error).toContain('Dam must be female (hen)');
    expect(error).toContain('"Cock 1" is recorded as Cock');
  });

  it('rejects an unknown-sex registry bird in either role', () => {
    expect(validateParentRoles({ sire: 'Unsexed' }, [unknown])).toContain('Sire must be male');
    expect(validateParentRoles({ dam: 'Unsexed' }, [unknown])).toContain('Dam must be female');
  });

  it('does not sex-check external / foundation parent names', () => {
    expect(validateParentRoles({ sire: 'Outside Cock', dam: 'Foundation Stock' }, [cock, hen])).toBeNull();
    expect(findParentSexMismatches([bird({ id: 9, name: 'External Child', sire: 'Outside Cock' })])).toEqual([]);
  });

  it('skips an unchanged legacy parent when editing another field', () => {
    const legacy = bird({ id: 10, name: 'Legacy Child', sire: 'Hen A', dam: 'Cock 1' });
    expect(
      validateParentRoles({ sire: 'Hen A', dam: 'Cock 1' }, [cock, hen, legacy], {
        child: { id: legacy.id, user_id: legacy.user_id },
        previous: { sire: 'Hen A', dam: 'Cock 1' },
      })
    ).toBeNull();
  });

  it('reports a bad fixture: hen as sire and cock as dam', () => {
    const bad = bird({ id: 20, name: 'Mismatched Child', sire: 'Hen A', dam: 'Cock 1', bird_code: 'A1' });
    const matches = findParentSexMismatches([cock, hen, bad]);

    expect(matches).toHaveLength(2);
    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          childId: 20,
          role: 'sire',
          parentId: 2,
          parentName: 'Hen A',
          parentSex: 'Hen',
          expectedSex: 'Cock',
        }),
        expect.objectContaining({
          childId: 20,
          role: 'dam',
          parentId: 1,
          parentName: 'Cock 1',
          parentSex: 'Cock',
          expectedSex: 'Hen',
        }),
      ])
    );
  });

  it('resolves the parent by id before the display name and reports the id-linked mismatch', () => {
    const child = bird({
      id: 21,
      name: 'Id-linked Child',
      sire: 'Cock 1', // stale display name looks correct
      sire_id: hen.id, // actual link is a hen
    });

    const [mismatch] = findParentSexMismatches([cock, hen, child]);
    expect(mismatch).toMatchObject({
      childId: 21,
      role: 'sire',
      parentId: hen.id,
      parentName: 'Hen A',
    });
  });

  it('returns no mismatches for a correct family', () => {
    const child = bird({ id: 22, name: 'Good Child', sire: 'Cock 1', dam: 'Hen A', bird_code: '1A1' });
    expect(findParentSexMismatches([cock, hen, child])).toEqual([]);
  });
});
