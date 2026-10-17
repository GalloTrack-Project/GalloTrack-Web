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
      .mockResolvedValueOnce({ data: [{ name: 'v1.mp4' }, { name: 'v2.mp4' }] })
      .mockResolvedValueOnce({ data: [{ name: 'p1.jpg' }] })
      .mockResolvedValueOnce({ data: [{ name: 'avatar.png' }] });

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
});
