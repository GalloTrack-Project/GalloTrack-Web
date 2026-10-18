import { describe, it, expect } from 'vitest';
import { parseBackup, restoreBackup, type BackupFile } from './backup';

const backup = (data: unknown) => JSON.stringify({ export_date: '2026-10-06', system_name: 'GalloTrack', data });

describe('parseBackup', () => {
  it('accepts a full backup and reports its counts', () => {
    const parsed = parseBackup(
      backup({
        fowls: [{ id: 1, name: 'King' }, { id: 2, name: 'Lady' }],
        match_history: [{ id: 9 }],
        breeding_pairings: [{ id: 50 }],
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fowls).toBe(2);
    expect(parsed.matches).toBe(1);
    expect(parsed.pairings).toBe(1);
    expect(parsed.profiles).toBe(0);
  });

  it('accepts a backup that only carries one of the lists', () => {
    expect(parseBackup(backup({ fowls: [] })).ok).toBe(true);
    expect(parseBackup(backup({ match_history: [] })).ok).toBe(true);
    expect(parseBackup(backup({ breeding_pairings: [] })).ok).toBe(true);
  });

  it('rejects text that is not JSON', () => {
    const parsed = parseBackup('{not json');

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toMatch(/valid JSON/i);
    }
  });

  it('accepts the owner-export shape, where the lists sit at the top level', () => {
    const parsed = parseBackup(
      JSON.stringify({
        exported_at: '2026-10-06',
        farm: 'GalloTrack',
        fowls: [{ name: 'King' }],
        matches: [],
        breeding_pairings: [{ pairing_code: 'PAIR-1' }],
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fowls).toBe(1);
    expect(parsed.matches).toBe(0);
    expect(parsed.pairings).toBe(1);
    expect(parsed.backup.data?.fowls).toHaveLength(1);
    expect(parsed.backup.data?.match_history).toHaveLength(0);
    expect(parsed.backup.data?.breeding_pairings).toHaveLength(1);
  });

  it('rejects JSON that is not an object', () => {
    expect(parseBackup('[1,2,3]').ok).toBe(false);
    expect(parseBackup('"a string"').ok).toBe(false);
  });

  it('rejects a file that carries no records at all', () => {
    const parsed = parseBackup(JSON.stringify({ export_date: '2026-10-06', farm: 'GalloTrack' }));

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toMatch(/no chicken, match, or breeding pairing/i);
    }
  });

  it('rejects a backup with neither chickens, matches, nor pairings', () => {
    const parsed = parseBackup(backup({ profiles: [] }));

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toMatch(/no chicken, match, or breeding pairing/i);
    }
  });

  it('rejects malformed lists', () => {
    expect(parseBackup(backup({ fowls: 'nope' })).ok).toBe(false);
    expect(parseBackup(backup({ fowls: [1, 2, 3] })).ok).toBe(false);
    expect(parseBackup(backup({ match_history: [{ id: 1 }], profiles: 'nope' })).ok).toBe(false);
    expect(parseBackup(backup({ breeding_pairings: 'invalid' })).ok).toBe(false);
  });
});

describe('restoreBackup fixture tests', () => {
  const CURRENT_USER_ID = 'current-user-uuid-1111';
  const OTHER_USER_ID = 'other-user-uuid-9999';

  function createMockSupabase(initialData: {
    fowls?: any[];
    matches?: any[];
    pairings?: any[];
    startId?: number;
  } = {}) {
    let nextId = initialData.startId ?? 500;
    const db = {
      fowl: [...(initialData.fowls || [])],
      match: [...(initialData.matches || [])],
      breeding_pairings: [...(initialData.pairings || [])],
      profiles: [] as any[],
    };

    return {
      db,
      auth: {
        getUser: async () => ({ data: { user: { id: CURRENT_USER_ID } }, error: null }),
      },
      from: (table: 'fowl' | 'match' | 'breeding_pairings' | 'profiles') => {
        const filters: { field: string; val: any }[] = [];

        const builder: any = {
          select: (_cols?: string) => {
            return builder;
          },
          eq: (field: string, val: any) => {
            filters.push({ field, val });
            return builder;
          },
          then: (resolve: any) => {
            let rows = db[table] || [];
            for (const f of filters) {
              rows = rows.filter((r) => r[f.field] === f.val);
            }
            resolve({ data: rows, error: null });
          },
          insert: (rows: any[]) => {
            return {
              select: (_sel?: string) => ({
                single: async () => {
                  const row = { ...rows[0], id: ++nextId };
                  db[table].push(row);
                  return { data: row, error: null };
                },
              }),
              then: (resolve: any) => {
                for (const r of rows) {
                  const inserted = { ...r, id: ++nextId };
                  db[table].push(inserted);
                }
                resolve({ data: rows, error: null });
              },
            };
          },
          update: (patch: any) => ({
            eq: (f1: string, v1: any) => ({
              eq: async (f2: string, v2: any) => {
                const target = db[table].find((r) => r[f1] === v1 && r[f2] === v2);
                if (target) {
                  Object.assign(target, patch);
                }
                return { error: null };
              },
            }),
          }),
        };
        return builder;
      },
    };
  }

  it('preserves lineage (sire_id, dam_id) and bird codes using oldId -> newId mapping', async () => {
    const mockClient = createMockSupabase();

    const backupData: BackupFile = {
      data: {
        fowls: [
          // Parent Sire (old id 10)
          {
            id: 10,
            user_id: OTHER_USER_ID,
            name: 'King Sire',
            bird_code: 'SIRE-01',
            breed: 'Sweater',
            gender: 'Male',
          },
          // Parent Dam (old id 20)
          {
            id: 20,
            user_id: OTHER_USER_ID,
            name: 'Queen Dam',
            bird_code: 'DAM-A',
            breed: 'Roundhead',
            gender: 'Female',
          },
          // Child Fowl (old id 30) referencing parents by old IDs
          {
            id: 30,
            user_id: OTHER_USER_ID,
            name: 'Prince Child',
            bird_code: 'OFF-001',
            breed: 'Sweater x Roundhead',
            gender: 'Male',
            sire_id: 10,
            dam_id: 20,
          },
        ],
        match_history: [
          // Match referencing child fowl by old id 30
          {
            id: 101,
            user_id: OTHER_USER_ID,
            date: '2026-10-15',
            entry_name: 'Prince Child',
            opponent: 'Dark Falcon',
            fowl_id: 30,
            age_category: 'Open',
          },
        ],
        breeding_pairings: [
          // Pairing referencing old sire 10 and dam 20
          {
            id: 201,
            user_id: OTHER_USER_ID,
            pairing_code: 'PAIR-2026-01',
            sire_id: 10,
            dam_id: 20,
            sire_code: 'SIRE-01',
            dam_code: 'DAM-A',
          },
        ],
      },
    };

    const res = await restoreBackup(backupData, {}, mockClient);

    expect(res.errors).toHaveLength(0);
    expect(res.fowls).toBe(3);
    expect(res.matches).toBe(1);
    expect(res.pairings).toBe(1);

    // Verify bird codes and names are preserved
    const restoredSire = mockClient.db.fowl.find((f) => f.name === 'King Sire');
    const restoredDam = mockClient.db.fowl.find((f) => f.name === 'Queen Dam');
    const restoredChild = mockClient.db.fowl.find((f) => f.name === 'Prince Child');

    expect(restoredSire).toBeDefined();
    expect(restoredSire.bird_code).toBe('SIRE-01');
    expect(restoredDam).toBeDefined();
    expect(restoredDam.bird_code).toBe('DAM-A');
    expect(restoredChild).toBeDefined();
    expect(restoredChild.bird_code).toBe('OFF-001');

    // Verify lineage is rewritten to the NEW database IDs (not old 10 and 20)
    expect(restoredChild.sire_id).toBe(restoredSire.id);
    expect(restoredChild.dam_id).toBe(restoredDam.id);
    expect(restoredChild.sire_id).not.toBe(10);
    expect(restoredChild.dam_id).not.toBe(20);

    // Verify match.fowl_id was rewritten to the new child ID and age_category round-trips
    const restoredMatch = mockClient.db.match[0];
    expect(restoredMatch.fowl_id).toBe(restoredChild.id);
    expect(restoredMatch.fowl_id).not.toBe(30);
    expect(restoredMatch.age_category).toBe('Open');

    // Verify breeding_pairings sire_id and dam_id were rewritten to new IDs
    const restoredPairing = mockClient.db.breeding_pairings[0];
    expect(restoredPairing.sire_id).toBe(restoredSire.id);
    expect(restoredPairing.dam_id).toBe(restoredDam.id);
  });

  it('skips and reports colliding rows without modifying existing records', async () => {
    // Existing database already has King Sire with bird_code SIRE-01
    const mockClient = createMockSupabase({
      fowls: [
        {
          id: 99,
          user_id: CURRENT_USER_ID,
          name: 'King Sire',
          bird_code: 'SIRE-01',
        },
      ],
      matches: [
        {
          id: 88,
          user_id: CURRENT_USER_ID,
          date: '2026-10-15',
          entry_name: 'King Sire',
          opponent: 'Iron Claw',
        },
      ],
    });

    const backupData: BackupFile = {
      data: {
        fowls: [
          // Colliding by name and bird_code
          { id: 1, name: 'King Sire', bird_code: 'SIRE-01' },
          // New bird
          { id: 2, name: 'Unique Bird', bird_code: 'NEW-02' },
        ],
        match_history: [
          // Colliding match
          { date: '2026-10-15', entry_name: 'King Sire', opponent: 'Iron Claw' },
          // New match
          { date: '2026-10-16', entry_name: 'Unique Bird', opponent: 'Silver Hawk' },
        ],
      },
    };

    const res = await restoreBackup(backupData, {}, mockClient);

    expect(res.skipped).toBe(2);
    expect(res.collisions).toHaveLength(2);
    expect(res.collisions[0]).toMatch(/already exists/i);
    expect(res.fowls).toBe(1); // Only Unique Bird inserted
    expect(res.matches).toBe(1); // Only 2026-10-16 match inserted

    expect(mockClient.db.fowl).toHaveLength(2); // 1 existing + 1 new
  });

  it('guarantees no cross-user data: forces current user_id on all inserted rows', async () => {
    const mockClient = createMockSupabase();

    const backupData: BackupFile = {
      data: {
        fowls: [
          { id: 1, user_id: 'malicious-other-user-uuid', name: 'Other User Fowl', bird_code: 'B-1' },
        ],
        match_history: [
          { id: 2, user_id: 'foreign-account-uuid', date: '2026-10-15', entry_name: 'Other User Fowl', opponent: 'X' },
        ],
        breeding_pairings: [
          { id: 3, user_id: 'third-party-uuid', pairing_code: 'PAIR-99' },
        ],
      },
    };

    const res = await restoreBackup(backupData, {}, mockClient);

    expect(res.fowls).toBe(1);
    expect(res.matches).toBe(1);
    expect(res.pairings).toBe(1);

    for (const f of mockClient.db.fowl) {
      expect(f.user_id).toBe(CURRENT_USER_ID);
      expect(f.user_id).not.toBe('malicious-other-user-uuid');
    }
    for (const m of mockClient.db.match) {
      expect(m.user_id).toBe(CURRENT_USER_ID);
      expect(m.user_id).not.toBe('foreign-account-uuid');
    }
    for (const p of mockClient.db.breeding_pairings) {
      expect(p.user_id).toBe(CURRENT_USER_ID);
      expect(p.user_id).not.toBe('third-party-uuid');
    }
  });

  it('uses database-assigned numeric IDs (bigint) from INSERT returning ids, never client-generated values', async () => {
    // Custom mock assigning distinct numeric IDs starting at 9001
    const mockClient = createMockSupabase({ startId: 9000 });

    const backupData: BackupFile = {
      data: {
        fowls: [
          // Original IDs in backup file: 101, 102, 103
          { id: 101, name: 'Numeric Sire', bird_code: 'NUM-SIRE' },
          { id: 102, name: 'Numeric Dam', bird_code: 'NUM-DAM' },
          { id: 103, name: 'Numeric Offspring', bird_code: 'NUM-OFF', sire_id: 101, dam_id: 102 },
        ],
        match_history: [
          { id: 501, date: '2026-10-15', entry_name: 'Numeric Offspring', opponent: 'Challenger', fowl_id: 103 },
        ],
        breeding_pairings: [
          { id: 601, pairing_code: 'PAIR-NUM', sire_id: 101, dam_id: 102 },
        ],
      },
    };

    const res = await restoreBackup(backupData, {}, mockClient);

    expect(res.errors).toHaveLength(0);
    expect(res.fowls).toBe(3);
    expect(res.matches).toBe(1);
    expect(res.pairings).toBe(1);

    const sire = mockClient.db.fowl.find((f) => f.name === 'Numeric Sire');
    const dam = mockClient.db.fowl.find((f) => f.name === 'Numeric Dam');
    const child = mockClient.db.fowl.find((f) => f.name === 'Numeric Offspring');
    const match = mockClient.db.match[0];
    const pairing = mockClient.db.breeding_pairings[0];

    // Assert database-assigned numeric IDs (9001, 9002, 9003) were used
    expect(sire.id).toBe(9001);
    expect(dam.id).toBe(9002);
    expect(child.id).toBe(9003);

    // Verify foreign keys were rewritten to the database-assigned numeric IDs, NOT the old ones
    expect(child.sire_id).toBe(9001);
    expect(child.dam_id).toBe(9002);
    expect(child.sire_id).not.toBe(101);
    expect(child.dam_id).not.toBe(102);

    expect(match.fowl_id).toBe(9003);
    expect(match.fowl_id).not.toBe(103);

    expect(pairing.sire_id).toBe(9001);
    expect(pairing.dam_id).toBe(9002);
    expect(pairing.sire_id).not.toBe(101);
    expect(pairing.dam_id).not.toBe(102);
  });
});
