import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const basePayload = {
  name: 'New Child',
  breed: 'Kelso',
  gender: 'Rooster',
};

function mockActiveUserWithFowls(fowls: Record<string, unknown>[]) {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { is_active: true } }),
          }),
        }),
      };
    }
    if (table === 'fowl') {
      return {
        select: () => ({
          eq: async () => ({ data: fowls, error: null }),
        }),
        insert: async () => ({ error: null }),
      };
    }
    return {};
  });
}

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest('http://localhost:3000/api/fowl', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/fowl parent role/sex validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a hen submitted as the sire', async () => {
    mockActiveUserWithFowls([
      { id: 2, name: 'Henny', gender: 'Hen', user_id: 'user-1' },
    ]);

    const res = await post({ ...basePayload, sire: 'Henny' });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Sire must be male (cock)');
    expect(json.error).toContain('"Henny" is recorded as Hen');
  });

  it('rejects a cock submitted as the dam', async () => {
    mockActiveUserWithFowls([
      { id: 3, name: 'Cocky', gender: 'Rooster', user_id: 'user-1' },
    ]);

    const res = await post({ ...basePayload, dam: 'Cocky' });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Dam must be female (hen)');
    expect(json.error).toContain('"Cocky" is recorded as Cock');
  });

  it('does not reject unchanged external / foundation parent names', async () => {
    mockActiveUserWithFowls([
      { id: 2, name: 'Henny', gender: 'Hen', user_id: 'user-1' },
    ]);

    // Unknown external sire has no registry row, so there is no sex to check.
    const res = await post({ ...basePayload, sire: 'External Rooster' });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true });
  });
});
