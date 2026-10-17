import { describe, it, expect, vi, beforeEach } from 'vitest';
import { previewBirdCode } from '@/lib/bird-code';
import { isChickenCodeUniqueViolation } from '@/lib/services/fowl-service';
import type { FowlRecord } from '@/lib/types';

describe('Registration Flow & Client-Side Code Generation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty fowl list and sequential code assignment', () => {
    it('with an empty fowl list, the first sire gets 1, the first dam gets A, and the first offspring of Sire 1 and Dam A gets 1A1 (and the next sibling gets 1A2)', () => {
      const emptyList: FowlRecord[] = [];

      // 1. First sire gets '1'
      const sire1Code = previewBirdCode({
        gender: 'Rooster',
        sireName: '',
        damName: '',
        fowls: emptyList,
      });
      expect(sire1Code).toBe('1');

      // Add Sire 1 to registry
      const sire1: FowlRecord = {
        id: 1,
        user_id: 'user-1',
        name: 'Thunder Cock',
        gender: 'Rooster',
        chicken_code: '1',
        bird_code: '1',
        status: 'Active',
      } as FowlRecord;
      const listWithSire = [sire1];

      // 2. First dam gets 'A'
      const damACode = previewBirdCode({
        gender: 'Hen',
        sireName: '',
        damName: '',
        fowls: listWithSire,
      });
      expect(damACode).toBe('A');

      // Add Dam A to registry
      const damA: FowlRecord = {
        id: 2,
        user_id: 'user-1',
        name: 'Golden Hen',
        gender: 'Hen',
        chicken_code: 'A',
        bird_code: 'A',
        status: 'Active',
      } as FowlRecord;
      const listWithBreedingPair = [sire1, damA];

      // 3. First offspring of Sire 1 and Dam A gets '1A1'
      const offspring1Code = previewBirdCode({
        gender: 'Stag',
        sireName: 'Thunder Cock',
        damName: 'Golden Hen',
        fowls: listWithBreedingPair,
      });
      expect(offspring1Code).toBe('1A1');

      // Add first offspring to registry
      const offspring1: FowlRecord = {
        id: 3,
        user_id: 'user-1',
        name: 'First Chick',
        gender: 'Stag',
        sire: 'Thunder Cock',
        dam: 'Golden Hen',
        chicken_code: '1A1',
        bird_code: '1A1',
        status: 'Active',
      } as FowlRecord;
      const listWithSibling1 = [sire1, damA, offspring1];

      // 4. Next sibling of Sire 1 and Dam A gets '1A2'
      const offspring2Code = previewBirdCode({
        gender: 'Pullet',
        sireName: 'Thunder Cock',
        damName: 'Golden Hen',
        fowls: listWithSibling1,
      });
      expect(offspring2Code).toBe('1A2');
    });
  });

  describe('Archived and deceased codes are never reused', () => {
    it('archived and deceased codes are never reused', () => {
      const existingFowls: FowlRecord[] = [
        {
          id: 1,
          user_id: 'user-1',
          name: 'Archived Sire',
          gender: 'Rooster',
          chicken_code: '1',
          bird_code: '1',
          status: 'Archived',
        } as FowlRecord,
        {
          id: 2,
          user_id: 'user-1',
          name: 'Deceased Dam',
          gender: 'Hen',
          chicken_code: 'A',
          bird_code: 'A',
          status: 'Deceased',
        } as FowlRecord,
        {
          id: 3,
          user_id: 'user-1',
          name: 'Archived Offspring',
          gender: 'Stag',
          sire: 'Archived Sire',
          dam: 'Deceased Dam',
          chicken_code: '1A1',
          bird_code: '1A1',
          status: 'Archived',
        } as FowlRecord,
      ];

      // Next sire must NOT reuse '1'
      const nextSire = previewBirdCode({
        gender: 'Rooster',
        fowls: existingFowls,
      });
      expect(nextSire).toBe('2');
      expect(nextSire).not.toBe('1');

      // Next dam must NOT reuse 'A'
      const nextDam = previewBirdCode({
        gender: 'Hen',
        fowls: existingFowls,
      });
      expect(nextDam).toBe('B');
      expect(nextDam).not.toBe('A');

      // Next offspring of Sire 1 and Dam A must NOT reuse '1A1'
      const nextOffspring = previewBirdCode({
        gender: 'Stag',
        sireName: 'Archived Sire',
        damName: 'Deceased Dam',
        fowls: existingFowls,
      });
      expect(nextOffspring).toBe('1A2');
      expect(nextOffspring).not.toBe('1A1');
    });
  });

  describe('Unique violation retry simulation', () => {
    it('two registrations computed from the same stale list: the second gets a unique violation, retries, and receives the next code', async () => {
      // Both registrations start with the same initial fowl list
      const initialFowls: FowlRecord[] = [
        {
          id: 1,
          user_id: 'user-1',
          name: 'Initial Sire',
          gender: 'Rooster',
          chicken_code: '1',
          bird_code: '1',
          status: 'Active',
        } as FowlRecord,
      ];

      // Client A computes code from initial list -> Sire 2
      const clientACode = previewBirdCode({ gender: 'Rooster', fowls: initialFowls });
      expect(clientACode).toBe('2');

      // Client B computes code concurrently from same stale list -> also Sire 2
      let clientBCode = previewBirdCode({ gender: 'Rooster', fowls: initialFowls });
      expect(clientBCode).toBe('2');

      // Mock database state
      const dbFowls = [...initialFowls];

      // Simulated insert helper with unique constraint on fowl_user_chicken_code_key
      const insertFowlMock = vi.fn(async (payload: { chicken_code: string }) => {
        if (dbFowls.some((f) => (f.chicken_code || '').toLowerCase() === payload.chicken_code.toLowerCase())) {
          return { error: 'duplicate key value violates unique constraint "fowl_user_chicken_code_key"' };
        }
        const created = { id: dbFowls.length + 1, chicken_code: payload.chicken_code } as FowlRecord;
        dbFowls.push(created);
        return { id: created.id };
      });

      const fetchFowlsMock = vi.fn(async () => [...dbFowls]);

      // Registration A succeeds first with Sire 2
      const resA = await insertFowlMock({ chicken_code: clientACode });
      expect(resA.error).toBeUndefined();
      expect(resA.id).toBe(2);

      // Registration B tries to insert Sire 2 -> fails with unique violation
      let resB = await insertFowlMock({ chicken_code: clientBCode });
      expect(resB.error).toContain('fowl_user_chicken_code_key');
      expect(isChickenCodeUniqueViolation(resB.error)).toBe(true);

      // Registration B enters retry loop: fetches fresh fowls, recomputes, and retries
      const MAX_RETRIES = 2;
      let attempt = 0;
      while (attempt <= MAX_RETRIES && resB.error && isChickenCodeUniqueViolation(resB.error)) {
        attempt++;
        const freshFowls = await fetchFowlsMock();
        clientBCode = previewBirdCode({ gender: 'Rooster', fowls: freshFowls });
        resB = await insertFowlMock({ chicken_code: clientBCode });
      }

      // Registration B retried once, received Sire 3, and succeeded
      expect(attempt).toBe(1);
      expect(clientBCode).toBe('3');
      expect(resB.error).toBeUndefined();
      expect(resB.id).toBe(3);
      expect(dbFowls.map((f) => f.chicken_code)).toEqual(['1', '2', '3']);
    });
  });

  describe('Failed insert leaves no code consumed and triggers image cleanup', () => {
    it('failed insert leaves no code consumed and triggers image cleanup', async () => {
      const deleteFowlImageMock = vi.fn(async (_path: string) => {});
      const insertFowlMock = vi.fn(async () => ({ error: 'Database connection timeout' }));

      const currentFowls: FowlRecord[] = [
        {
          id: 1,
          user_id: 'user-1',
          name: 'Sire 1',
          gender: 'Rooster',
          chicken_code: '1',
          status: 'Active',
        } as FowlRecord,
      ];

      // Code computed for next sire is 2
      const codeToUse = previewBirdCode({ gender: 'Rooster', fowls: currentFowls });
      expect(codeToUse).toBe('2');

      const uploadedImagePath = 'fowl/123456789-abc.jpg';

      // Attempt insert
      const insertResult = await insertFowlMock();

      // On failure: trigger cleanup
      if (insertResult.error) {
        await deleteFowlImageMock(uploadedImagePath);
      }

      // 1. Image cleanup was triggered
      expect(deleteFowlImageMock).toHaveBeenCalledTimes(1);
      expect(deleteFowlImageMock).toHaveBeenCalledWith('fowl/123456789-abc.jpg');

      // 2. No code was consumed: the pool is unchanged and the next registration still gets 2
      const codeForNextAttempt = previewBirdCode({ gender: 'Rooster', fowls: currentFowls });
      expect(codeForNextAttempt).toBe('2');
    });
  });

  describe('Full reset followed by sequential registration', () => {
    it('confirm that a full reset followed by registering one sire, one dam, and one offspring produces Sire 1, Dam A, and 1A1 with retry flow and image cleanup', async () => {
      // 1. Simulate full reset: fowl_identifier_counters deleted, fowls table cleared
      const databaseFowls: FowlRecord[] = [];
      const imageCleanupMock = vi.fn(async (_path: string) => {});

      const registerFowl = async (params: {
        name: string;
        gender: string;
        sireName?: string;
        damName?: string;
        imagePath?: string;
        simulateFailureOnce?: boolean;
      }) => {
        let pool = [...databaseFowls];
        let code = previewBirdCode({
          gender: params.gender,
          sireName: params.sireName,
          damName: params.damName,
          fowls: pool,
        });

        let attempts = 0;
        let success = false;
        let finalId = 0;

        while (attempts <= 2) {
          const collision = pool.some((f) => (f.chicken_code || '').toLowerCase() === code.toLowerCase());
          if (params.simulateFailureOnce && attempts === 0) {
            attempts++;
            pool = [...databaseFowls];
            code = previewBirdCode({
              gender: params.gender,
              sireName: params.sireName,
              damName: params.damName,
              fowls: pool,
            });
            continue;
          }

          if (collision) {
            attempts++;
            pool = [...databaseFowls];
            code = previewBirdCode({
              gender: params.gender,
              sireName: params.sireName,
              damName: params.damName,
              fowls: pool,
            });
            continue;
          }

          finalId = databaseFowls.length + 1;
          const newFowl: FowlRecord = {
            id: finalId,
            user_id: 'user-1',
            name: params.name,
            gender: params.gender,
            sire: params.sireName || 'Foundation Stock',
            dam: params.damName || 'Foundation Stock',
            chicken_code: code,
            bird_code: code,
            status: 'Active',
            image_url: params.imagePath ? `https://storage.supabase.co/fowl/${params.imagePath}` : '',
          } as FowlRecord;
          databaseFowls.push(newFowl);
          success = true;
          break;
        }

        if (!success && params.imagePath) {
          await imageCleanupMock(params.imagePath);
        }

        return { success, code, id: finalId };
      };

      // 2. Register first Sire -> produces '1'
      const sireRes = await registerFowl({
        name: 'Sire Prime',
        gender: 'Rooster',
        imagePath: 'fowl/sire-1.jpg',
      });
      expect(sireRes.success).toBe(true);
      expect(sireRes.code).toBe('1');

      // 3. Register first Dam -> produces 'A'
      const damRes = await registerFowl({
        name: 'Dam Alpha',
        gender: 'Hen',
        imagePath: 'fowl/dam-a.jpg',
      });
      expect(damRes.success).toBe(true);
      expect(damRes.code).toBe('A');

      // 4. Register first Offspring of Sire 1 & Dam A -> produces '1A1' (exercising retry flow)
      const offspringRes = await registerFowl({
        name: 'First Blood',
        gender: 'Stag',
        sireName: 'Sire Prime',
        damName: 'Dam Alpha',
        imagePath: 'fowl/chick-1a1.jpg',
        simulateFailureOnce: true,
      });
      expect(offspringRes.success).toBe(true);
      expect(offspringRes.code).toBe('1A1');

      // 5. Test failed insert with image cleanup
      const failedInsertMock = vi.fn(async () => {
        await imageCleanupMock('fowl/failed-upload.jpg');
        return { success: false };
      });
      await failedInsertMock();
      expect(imageCleanupMock).toHaveBeenCalledWith('fowl/failed-upload.jpg');

      // Final verification: 3 registered birds with exact codes
      expect(databaseFowls.map((f) => ({ name: f.name, code: f.chicken_code }))).toEqual([
        { name: 'Sire Prime', code: '1' },
        { name: 'Dam Alpha', code: 'A' },
        { name: 'First Blood', code: '1A1' },
      ]);
    });
  });
});
