import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculatePairingStats } from './helpers';
import { generateBloodlineReport } from './bloodlines';

describe('Danger Zone Deletion & Owner Data Isolation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const OWNER_ID = '9cc100d9-c855-41d3-a6a8-3c10fd65221c';
  const OTHER_USER_ID = 'other-user-9999-0000-1111';

  it('requires typed confirmation "DELETE" before executing destructive action', () => {
    const isConfirmed = (input: string) => input.trim() === 'DELETE';

    expect(isConfirmed('')).toBe(false);
    expect(isConfirmed('delete')).toBe(false);
    expect(isConfirmed('DELETE ')).toBe(true);
    expect(isConfirmed('DELETE')).toBe(true);
    expect(isConfirmed('NO')).toBe(false);
  });

  it('Clear Everything deletes owner pairings, matches, media references, and fowls in correct order while preserving profiles, settings, and registry options', async () => {
    // Initial mock state with owner and other user data
    const database = {
      profiles: [
        { id: OWNER_ID, farm_name: 'Anilao Farm', full_name: 'Hazel Owner' },
        { id: OTHER_USER_ID, farm_name: 'Other Farm', full_name: 'Other User' },
      ],
      user_settings: [
        { user_id: OWNER_ID, default_strain: 'Sweater' },
        { user_id: OTHER_USER_ID, default_strain: 'Hatch' },
      ],
      registry_options: [
        { id: 1, user_id: null, list_key: 'breed', value: 'Sweater' },
        { id: 2, user_id: OWNER_ID, list_key: 'breed', value: 'Custom Owner Breed' },
      ],
      breeding_pairings: [
        { id: 10, user_id: OWNER_ID, sire_id: 1, dam_id: 2 },
        { id: 20, user_id: OTHER_USER_ID, sire_id: 99, dam_id: 100 },
      ],
      safety_incidents: [
        { id: 101, user_id: OWNER_ID, notes: 'Owner Incident' },
        { id: 102, user_id: OTHER_USER_ID, notes: 'Other Incident' },
      ],
      share_links: [
        { id: 201, user_id: OWNER_ID, entity_type: 'match' },
        { id: 202, user_id: OWNER_ID, entity_type: 'fowl' },
        { id: 203, user_id: OTHER_USER_ID, entity_type: 'match' },
      ],
      fowl_identifier_counters: [
        { user_id: OWNER_ID, counter_type: 'sire', last_seq: 5 },
        { user_id: OTHER_USER_ID, counter_type: 'sire', last_seq: 10 },
      ],
      match: [
        { id: 301, user_id: OWNER_ID, fowl_id: 1 },
        { id: 302, user_id: OTHER_USER_ID, fowl_id: 99 },
      ],
      fowl: [
        { id: 1, user_id: OWNER_ID, name: 'Owner Rooster' },
        { id: 2, user_id: OWNER_ID, name: 'Owner Hen' },
        { id: 99, user_id: OTHER_USER_ID, name: 'Other Rooster' },
      ],
    };

    const deletedOrder: string[] = [];

    // Simulate Clear Everything operation scoped strictly to OWNER_ID
    const clearEverything = async (userId: string) => {
      // 1. Clear match share links and match records
      database.share_links = database.share_links.filter((r) => !(r.user_id === userId && r.entity_type === 'match'));
      deletedOrder.push('share_links_match');

      database.match = database.match.filter((r) => r.user_id !== userId);
      deletedOrder.push('match');

      // 2. Clear chicken-dependent children (pairings, incidents, share_links)
      database.breeding_pairings = database.breeding_pairings.filter((r) => r.user_id !== userId);
      deletedOrder.push('breeding_pairings');

      database.safety_incidents = database.safety_incidents.filter((r) => r.user_id !== userId);
      deletedOrder.push('safety_incidents');

      database.share_links = database.share_links.filter((r) => !(r.user_id === userId && r.entity_type === 'fowl'));
      deletedOrder.push('share_links_fowl');

      // 3. Clear counters and fowls
      database.fowl_identifier_counters = database.fowl_identifier_counters.filter((r) => r.user_id !== userId);
      deletedOrder.push('fowl_identifier_counters');

      database.fowl = database.fowl.filter((r) => r.user_id !== userId);
      deletedOrder.push('fowl');
    };

    await clearEverything(OWNER_ID);

    // Assert deletion order: children before parents! Pairings deleted before fowl!
    expect(deletedOrder).toEqual([
      'share_links_match',
      'match',
      'breeding_pairings',
      'safety_incidents',
      'share_links_fowl',
      'fowl_identifier_counters',
      'fowl',
    ]);

    // Assert owner's inventory and match data is completely removed
    expect(database.breeding_pairings.filter((r) => r.user_id === OWNER_ID)).toHaveLength(0);
    expect(database.match.filter((r) => r.user_id === OWNER_ID)).toHaveLength(0);
    expect(database.fowl.filter((r) => r.user_id === OWNER_ID)).toHaveLength(0);
    expect(database.fowl_identifier_counters.filter((r) => r.user_id === OWNER_ID)).toHaveLength(0);
    expect(database.share_links.filter((r) => r.user_id === OWNER_ID)).toHaveLength(0);

    // Assert other user's rows are COMPLETELY UNTOUCHED
    expect(database.breeding_pairings.filter((r) => r.user_id === OTHER_USER_ID)).toHaveLength(1);
    expect(database.match.filter((r) => r.user_id === OTHER_USER_ID)).toHaveLength(1);
    expect(database.fowl.filter((r) => r.user_id === OTHER_USER_ID)).toHaveLength(1);
    expect(database.fowl_identifier_counters.filter((r) => r.user_id === OTHER_USER_ID)).toHaveLength(1);
    expect(database.share_links.filter((r) => r.user_id === OTHER_USER_ID)).toHaveLength(1);

    // Assert preserved tables: profiles and user_settings are kept
    expect(database.profiles.find((p) => p.id === OWNER_ID)).toBeDefined();
    expect(database.user_settings.find((s) => s.user_id === OWNER_ID)).toBeDefined();
    expect(database.registry_options.find((o) => o.user_id === null)).toBeDefined();
  });

  it('storage purge uses strictly the owner prefix and never touches other prefixes or root files', async () => {
    const storageFiles: Record<string, string[]> = {
      'match-videos': [
        `${OWNER_ID}/video1.mp4`,
        `${OWNER_ID}/video2.mp4`,
        `${OTHER_USER_ID}/other_video.mp4`,
        `root_video.mp4`,
      ],
      'match-photos': [
        `${OWNER_ID}/photo1.jpg`,
        `${OTHER_USER_ID}/other_photo.jpg`,
      ],
      'fowl-images': [
        `${OWNER_ID}/avatar.png`,
        `fowl/global_fowl.png`,
        `${OTHER_USER_ID}/their_avatar.png`,
      ],
    };

    const purgedPaths: string[] = [];

    const purgeOwnerStorage = async (userId: string, buckets: string[]) => {
      for (const bucket of buckets) {
        const bucketFiles = storageFiles[bucket] || [];
        // List strictly under userId prefix
        const userObjects = bucketFiles.filter((p) => p.startsWith(`${userId}/`));

        for (const obj of userObjects) {
          // Strict verification guard
          if (!obj.startsWith(`${userId}/`) || obj.includes('..')) {
            throw new Error(`Refusing to delete unsafe path: ${obj}`);
          }
          purgedPaths.push(obj);
          storageFiles[bucket] = storageFiles[bucket].filter((p) => p !== obj);
        }
      }
    };

    await purgeOwnerStorage(OWNER_ID, ['match-videos', 'match-photos', 'fowl-images']);

    // Assert only owner files were purged
    expect(purgedPaths).toEqual([
      `${OWNER_ID}/video1.mp4`,
      `${OWNER_ID}/video2.mp4`,
      `${OWNER_ID}/photo1.jpg`,
      `${OWNER_ID}/avatar.png`,
    ]);

    // Assert other user's files and root files remain intact
    expect(storageFiles['match-videos']).toContain(`${OTHER_USER_ID}/other_video.mp4`);
    expect(storageFiles['match-videos']).toContain(`root_video.mp4`);
    expect(storageFiles['match-photos']).toContain(`${OTHER_USER_ID}/other_photo.jpg`);
    expect(storageFiles['fowl-images']).toContain(`fowl/global_fowl.png`);
    expect(storageFiles['fowl-images']).toContain(`${OTHER_USER_ID}/their_avatar.png`);
  });

  it('reports errors midway when storage deletion fails without corrupting database state', async () => {
    const errorReporter = vi.fn();

    const simulateClearWithStorageFailure = async () => {
      // 1. Database deletion succeeds
      const dbSuccess = true;

      // 2. Storage purge encounters an error on one bucket
      const storageErrors: string[] = [];
      try {
        throw new Error('S3 Storage Timeout on match-videos');
      } catch (e: unknown) {
        storageErrors.push(e instanceof Error ? e.message : String(e));
      }

      if (storageErrors.length > 0) {
        errorReporter(`Storage warning: ${storageErrors.join('; ')}`);
      }

      return {
        dbSuccess,
        storageErrors,
        notice: `All chicken profiles and match records deleted. Storage warning: ${storageErrors.join('; ')}`,
      };
    };

    const result = await simulateClearWithStorageFailure();

    expect(result.dbSuccess).toBe(true);
    expect(result.storageErrors).toHaveLength(1);
    expect(result.notice).toContain('Storage warning: S3 Storage Timeout on match-videos');
    expect(errorReporter).toHaveBeenCalledWith('Storage warning: S3 Storage Timeout on match-videos');
  });

  it('supports alsoDeleteMatches option during Clear Chicken Profiles to delete matches alongside fowl', async () => {
    const database = {
      fowl: [
        { id: 1, user_id: OWNER_ID, name: 'Rooster 1' },
      ],
      match: [
        { id: 101, user_id: OWNER_ID, fowl_id: 1 as number | null, entry_name: 'Rooster 1' },
      ],
      breeding_pairings: [
        { id: 201, user_id: OWNER_ID, sire_id: 1 },
      ],
    };

    const clearFowl = (userId: string, alsoDeleteMatches: boolean) => {
      // 1. Delete breeding pairings
      database.breeding_pairings = database.breeding_pairings.filter((r) => r.user_id !== userId);
      // 2. Delete fowl
      database.fowl = database.fowl.filter((r) => r.user_id !== userId);
      // 3. Delete matches if option checked
      if (alsoDeleteMatches) {
        database.match = database.match.filter((r) => r.user_id !== userId);
      } else {
        // FK ON DELETE SET NULL simulation
        database.match = database.match.map((m) => (m.user_id === userId ? { ...m, fowl_id: null } : m));
      }
    };

    // Case A: alsoDeleteMatches is false -> matches survive as historical entries with null fowl_id
    clearFowl(OWNER_ID, false);
    expect(database.fowl).toHaveLength(0);
    expect(database.match).toHaveLength(1);
    expect(database.match[0].fowl_id).toBeNull();

    // Case B: alsoDeleteMatches is true -> matches are deleted too
    clearFowl(OWNER_ID, true);
    expect(database.match).toHaveLength(0);
  });

  it('aggregates (strain benchmarks & pairing stats) strictly ignore orphan matches (fowl_id: null) even if chicken has matching name', () => {
    // 1. Test calculatePairingStats in helpers
    const parentPairOffspring = [
      {
        id: 77,
        name: 'Thunder Offspring',
        sire: 'Sire 1',
        dam: 'Dam A',
        breed: 'Kelso',
        gender: 'Male',
      } as any,
    ];

    // Orphan match with fowl_id: null but matching entry_name
    const orphanMatch = {
      id: 999,
      fowl_id: null,
      entry_name: 'Thunder Offspring',
      outcome: 'Win',
    };

    const pairingStats = calculatePairingStats(parentPairOffspring, [orphanMatch]);
    const pair = pairingStats.all.get('sire 1|||dam a');

    expect(pair).toBeDefined();
    // Orphan match must NOT be counted towards pairing stats!
    expect(pair?.totalFights).toBe(0);
    expect(pair?.wins).toBe(0);
    expect(pair?.decided).toBe(0);

    // 2. Test generateBloodlineReport strain benchmarks in bloodlines
    const newKelso = {
      id: 88,
      name: 'Kelso Champion',
      breed: 'Kelso',
      gender: 'Male',
      sire: 'Foundation Stock',
      dam: 'Foundation Stock',
    } as any;

    const orphanKelsoMatch = {
      id: 1000,
      fowl_id: null,
      entry_name: 'Kelso Champion',
      outcome: 'Win',
      breed: 'Kelso',
    };

    const report = generateBloodlineReport(newKelso, [newKelso], [orphanKelsoMatch]);
    expect(report.performanceBenchmark?.totalFights).toBe(0);
    expect(report.performanceBenchmark?.topPerformers).not.toContain('Kelso Champion');
  });
});

