import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE, extractStorageBucketAndPath, validateStorageTarget } from './route';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url: string, key: string) => {
    // If called with anon key, it's user client
    if (key === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        auth: {
          getUser: mockGetUser,
        },
      };
    }
    // Else admin client
    return {
      from: mockFrom,
      storage: {
        from: mockStorageFrom,
      },
    };
  }),
}));

describe('DELETE /api/match/media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates storage targets and allowlisted buckets', () => {
    const valid = validateStorageTarget('match-photos', 'user-123/photo.jpg', 'user-123');
    expect(valid.valid).toBe(true);

    const badBucket = validateStorageTarget('other-bucket', 'user-123/photo.jpg', 'user-123');
    expect(badBucket.valid).toBe(false);

    const pathTraversal = validateStorageTarget('match-photos', '../secret/photo.jpg', 'user-123');
    expect(pathTraversal.valid).toBe(false);

    const wrongUserFolder = validateStorageTarget('match-photos', 'other-user/photo.jpg', 'user-123');
    expect(wrongUserFolder.valid).toBe(false);
  });

  it('extracts bucket and object path from standard supabase storage URLs', () => {
    const parsed = extractStorageBucketAndPath(
      'https://xyz.supabase.co/storage/v1/object/public/match-photos/user-1/photo1.jpg'
    );
    expect(parsed).toEqual({ bucket: 'match-photos', objectPath: 'user-1/photo1.jpg' });

    const parsedSign = extractStorageBucketAndPath(
      'https://xyz.supabase.co/storage/v1/object/sign/match-videos/user-1/vid.mp4?token=abc'
    );
    expect(parsedSign).toEqual({ bucket: 'match-videos', objectPath: 'user-1/vid.mp4' });

    expect(extractStorageBucketAndPath('invalid-url')).toBeNull();
  });

  it('rejects unauthorized requests with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/match/media', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user does not own the associated match record', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'attacker-id' } } });

    // Mock DB response for media row
    const mockMediaSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 10, match_id: 99, url: 'https://xyz.supabase.co/storage/v1/object/public/match-photos/owner-id/pic.jpg' },
          error: null,
        }),
      }),
    });

    // Mock DB response for match row (owned by owner-id, not attacker-id)
    const mockMatchSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 99, user_id: 'owner-id' },
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'match_photos') return { select: mockMediaSelect };
      if (table === 'match') return { select: mockMatchSelect };
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/match/media', {
      method: 'DELETE',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ mediaType: 'photo', mediaId: 10 }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('fails with 500 on storage deletion error and leaves DB row untouched', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

    const mockDelete = vi.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'match_photos') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 10, match_id: 99, url: 'https://xyz.supabase.co/storage/v1/object/public/match-photos/user-123/pic.jpg' },
                error: null,
              }),
            }),
          }),
          delete: mockDelete,
        };
      }
      if (table === 'match') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 99, user_id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    // Storage removal fails!
    mockStorageFrom.mockReturnValue({
      remove: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('S3 Connection Timeout'),
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/match/media', {
      method: 'DELETE',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ mediaType: 'photo', mediaId: 10 }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Storage removal failed');
    // Ensure DB delete was NEVER called
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes storage file first and then deletes DB row on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'match_videos') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 20,
                  match_id: 99,
                  url: 'https://xyz.supabase.co/storage/v1/object/public/match-videos/user-123/fight.mp4',
                  poster_url: 'https://xyz.supabase.co/storage/v1/object/public/match-photos/user-123/fight-poster.jpg',
                },
                error: null,
              }),
            }),
          }),
          delete: mockDelete,
        };
      }
      if (table === 'match') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 99, user_id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null });
    mockStorageFrom.mockReturnValue({ remove: mockRemove });

    const req = new NextRequest('http://localhost:3000/api/match/media', {
      method: 'DELETE',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ mediaType: 'video', mediaId: 20 }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify storage remove was called for video and poster
    expect(mockRemove).toHaveBeenCalledWith(['user-123/fight.mp4']);
    expect(mockRemove).toHaveBeenCalledWith(['user-123/fight-poster.jpg']);

    // Verify DB delete was called
    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 20);
  });
});
