import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

const mockGetUser = vi.fn();
const mockList = vi.fn();
const mockRemove = vi.fn();
const mockSelect = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((_url, key, options) => {
    // If it has Authorization header in global, it's userClient
    if (options?.global?.headers?.Authorization) {
      return {
        auth: {
          getUser: mockGetUser,
        },
      };
    }
    // Otherwise it's admin client
    return {
      storage: {
        from: vi.fn(() => ({
          list: mockList,
          remove: mockRemove,
        })),
      },
      from: vi.fn(() => ({
        select: mockSelect,
      })),
    };
  }),
}));

describe('/api/user/purge-media Route Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const USER_ID = 'test-owner-id-1234';

  it('rejects GET without Bearer token with 401', async () => {
    const req = new NextRequest('http://localhost/api/user/purge-media');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('rejects POST without Bearer token with 401', async () => {
    const req = new NextRequest('http://localhost/api/user/purge-media', {
      method: 'POST',
      body: JSON.stringify({ scope: 'all' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns pairingsCount and mediaCounts on valid authenticated GET', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockSelect.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count: 6, error: null }),
    });
    mockList
      .mockResolvedValueOnce({ data: [{ name: 'v1.mp4' }, { name: 'v2.mp4' }] }) // match-videos
      .mockResolvedValueOnce({ data: [{ name: 'p1.jpg' }] }) // match-photos
      .mockResolvedValueOnce({ data: [] }); // fowl-images

    const req = new NextRequest('http://localhost/api/user/purge-media', {
      headers: { Authorization: 'Bearer mock-token' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pairingsCount).toBe(6);
    expect(data.mediaCounts.videos).toBe(2);
    expect(data.mediaCounts.photos).toBe(1);
    expect(data.mediaCounts.fowlImages).toBe(0);
    expect(data.mediaCounts.total).toBe(3);
  });

  it('rejects invalid scope in POST body with 400', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const req = new NextRequest('http://localhost/api/user/purge-media', {
      method: 'POST',
      headers: { Authorization: 'Bearer mock-token' },
      body: JSON.stringify({ scope: 'invalid-scope' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('purges files strictly with owner prefix on POST scope="all"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockList
      .mockResolvedValueOnce({ data: [{ name: 'v1.mp4', id: 'f1' }, { name: 'v2.mp4', id: 'f2' }] })
      .mockResolvedValueOnce({ data: [{ name: 'p1.jpg', id: 'f3' }] })
      .mockResolvedValueOnce({ data: [{ name: 'avatar.png', id: 'f4' }] });

    mockRemove.mockResolvedValue({ data: ['mock-removed'], error: null });

    const req = new NextRequest('http://localhost/api/user/purge-media', {
      method: 'POST',
      headers: { Authorization: 'Bearer mock-token' },
      body: JSON.stringify({ scope: 'all' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify paths sent to mockRemove all start strictly with USER_ID/
    expect(mockRemove).toHaveBeenCalledWith([`${USER_ID}/v1.mp4`, `${USER_ID}/v2.mp4`]);
    expect(mockRemove).toHaveBeenCalledWith([`${USER_ID}/p1.jpg`]);
    expect(mockRemove).toHaveBeenCalledWith([`${USER_ID}/avatar.png`]);
  });

  it('recursively traverses nested folders (e.g., {user_id}/fowl/...) and deletes by full path, not folder entry', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });

    // Mock storage.list behavior:
    // When listing {USER_ID}: returns a subfolder 'fowl' (id: null) and a top-level file 'top.mp4' (id: 't1')
    // When listing {USER_ID}/fowl: returns a nested file 'subpic.jpg' (id: 's1')
    mockList.mockImplementation(async (prefix: string) => {
      if (prefix === USER_ID) {
        return {
          data: [
            { name: 'top.mp4', id: 't1' },
            { name: 'fowl', id: null }, // directory marker
          ],
          error: null,
        };
      }
      if (prefix === `${USER_ID}/fowl`) {
        return {
          data: [
            { name: 'subpic.jpg', id: 's1' },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    mockRemove.mockResolvedValue({ data: [{ name: 'removed' }], error: null });

    const req = new NextRequest('http://localhost/api/user/purge-media', {
      method: 'POST',
      headers: { Authorization: 'Bearer mock-token' },
      body: JSON.stringify({ scope: 'fowl' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify removed paths are concrete file paths, NOT the directory entry `${USER_ID}/fowl`
    expect(mockRemove).toHaveBeenCalledWith([
      `${USER_ID}/top.mp4`,
      `${USER_ID}/fowl/subpic.jpg`,
    ]);
    expect(mockRemove).not.toHaveBeenCalledWith(expect.arrayContaining([`${USER_ID}/fowl`]));
  });

  it('handles pagination beyond 1000 objects and deletes in batches', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });

    // Generate 1050 files for match-videos
    const page1Files = Array.from({ length: 1000 }, (_, i) => ({
      name: `video_${i}.mp4`,
      id: `id_${i}`,
    }));
    const page2Files = Array.from({ length: 50 }, (_, i) => ({
      name: `video_${1000 + i}.mp4`,
      id: `id_${1000 + i}`,
    }));

    mockList.mockImplementation(async (prefix: string, options?: { limit?: number; offset?: number }) => {
      if (prefix === USER_ID) {
        if (!options?.offset || options.offset === 0) {
          return { data: page1Files, error: null };
        }
        if (options.offset === 1000) {
          return { data: page2Files, error: null };
        }
      }
      return { data: [], error: null };
    });

    mockRemove.mockImplementation(async (batch: string[]) => ({
      data: batch.map(p => ({ name: p })),
      error: null,
    }));

    const req = new NextRequest('http://localhost/api/user/purge-media', {
      method: 'POST',
      headers: { Authorization: 'Bearer mock-token' },
      body: JSON.stringify({ scope: 'fowl' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.removedCount).toBe(1050);

    // Deletes in 2 batches: first 1000, then remaining 50
    expect(mockRemove).toHaveBeenCalledTimes(2);
    expect(mockRemove.mock.calls[0][0]).toHaveLength(1000);
    expect(mockRemove.mock.calls[1][0]).toHaveLength(50);
  });

  it('preserves profile avatars under fowl-images/profiles/ and never queries or touches them', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockList.mockResolvedValue({ data: [], error: null });

    const req = new NextRequest('http://localhost/api/user/purge-media', {
      method: 'POST',
      headers: { Authorization: 'Bearer mock-token' },
      body: JSON.stringify({ scope: 'all' }),
    });

    await POST(req);

    // Assert mockList was only called with prefixes starting with USER_ID, never 'profiles'
    for (const call of mockList.mock.calls) {
      const prefix = call[0];
      expect(prefix).toMatch(new RegExp(`^${USER_ID}`));
      expect(prefix).not.toContain('profiles');
    }
  });
});
