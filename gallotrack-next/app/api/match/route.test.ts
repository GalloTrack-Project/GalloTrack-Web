import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

vi.mock('@/lib/services/media-service', () => ({
  fetchMatchMediaBatch: vi.fn().mockResolvedValue(new Map()),
}));

describe('POST /api/match', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests missing bearer token', async () => {
    const req = new NextRequest('http://localhost:3000/api/match', {
      method: 'POST',
      body: JSON.stringify({ entry_name: 'Lemon Rooster' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('rejects deactivated user accounts', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { is_active: false } }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/match', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ entry_name: 'Lemon Rooster' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Account deactivated');
  });

  it('rejects chicken belonging to another account (cross-account check)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { is_active: true } }),
            }),
          }),
        };
      }
      if (table === 'fowl') {
        return {
          select: () => ({
            eq: () => ({
              // Chicken belongs to user-2!
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 99,
                  user_id: 'user-2',
                  name: 'Victim Rooster',
                  breed: 'Kelso',
                  gender: 'Rooster',
                  status: 'Active',
                },
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/match', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ fowl_id: 99, entry_name: 'Stolen Rooster', opponent: 'Opponent' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Chicken record does not belong to your account');
  });

  it('rejects non-active chicken entries', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { is_active: true } }),
            }),
          }),
        };
      }
      if (table === 'fowl') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 10,
                  user_id: 'user-1',
                  name: 'Retired Rooster',
                  breed: 'Kelso',
                  gender: 'Rooster',
                  status: 'Archived',
                },
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/match', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ fowl_id: 10, opponent: 'Opponent' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Only active roosters can be entered in matches');
  });

  it('rejects female chickens for competitive matches', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { is_active: true } }),
            }),
          }),
        };
      }
      if (table === 'fowl') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 11,
                  user_id: 'user-1',
                  name: 'Pearl Hen',
                  breed: 'Kelso',
                  gender: 'Hen',
                  status: 'Active',
                },
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/match', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ fowl_id: 11, opponent: 'Opponent' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Only male roosters can be entered in competitive matches');
  });

  it('rejects future match dates', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { is_active: true } }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/match', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        entry_name: 'Lemon Cock',
        date: '2099-12-31',
        opponent: 'Opponent',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Match date cannot be in the future');
  });

  it('successfully creates match record with valid active rooster and returns created ID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 501 }, error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { is_active: true } }),
            }),
          }),
        };
      }
      if (table === 'fowl') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 42,
                  user_id: 'user-1',
                  name: 'Lemon Storm',
                  breed: 'Lemon 84',
                  gender: 'Rooster',
                  status: 'Active',
                },
              }),
            }),
          }),
        };
      }
      if (table === 'match') {
        return {
          insert: mockInsert,
        };
      }
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/match', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        fowl_id: 42,
        opponent: 'Kelso Express',
        opponent_breed: 'Kelso',
        opponent_bloodline: 'Outcross',
        location: 'Pasay Arena',
        outcome: 'Win',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ success: true, data: { id: 501 } });

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-1',
        fowl_id: 42,
        entry_name: 'Lemon Storm',
        breed: 'Lemon 84',
        opponent: 'Kelso Express',
        opponent_breed: 'Kelso',
        opponent_bloodline: 'Outcross',
        location: 'Pasay Arena',
        outcome: 'Win',
      }),
    ]);
  });
});
