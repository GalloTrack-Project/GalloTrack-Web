import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const mockGetUser = vi.fn();
const mockCreateSignedUrl = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
      })),
    },
  })),
}));

function postRequest(body: unknown, token = 'valid-token') {
  return POST(
    new NextRequest('http://localhost:3000/api/fowl/photo/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

describe('POST /api/fowl/photo/sign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockCreateSignedUrl.mockImplementation(async (path: string) => ({
      data: { signedUrl: `https://signed.test/${path}` },
      error: null,
    }));
  });

  it('rejects unauthenticated requests', async () => {
    expect((await postRequest({ paths: ['user-1/42/a.webp'] }, '')).status).toBe(401);
  });

  it('requires a non-empty path list', async () => {
    expect((await postRequest({ paths: [] })).status).toBe(400);
    expect((await postRequest({})).status).toBe(400);
  });

  it('rejects more than 100 paths', async () => {
    const paths = Array.from({ length: 101 }, (_, index) => `user-1/42/${index}.webp`);
    expect((await postRequest({ paths })).status).toBe(400);
  });

  it('rejects the whole batch if any path belongs to another user', async () => {
    const res = await postRequest({
      paths: ['user-1/42/a.webp', 'user-2/42/b.webp'],
    });
    expect(res.status).toBe(403);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('returns signed URLs for multiple owner paths', async () => {
    const res = await postRequest({
      paths: ['user-1/42/a.webp', 'user-1/42/b.webp'],
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      signedUrls: {
        'user-1/42/a.webp': 'https://signed.test/user-1/42/a.webp',
        'user-1/42/b.webp': 'https://signed.test/user-1/42/b.webp',
      },
    });
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('returns partial results when one object cannot be signed', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCreateSignedUrl.mockImplementation(async (path: string) => {
      if (path.endsWith('missing.webp')) {
        return { data: null, error: { message: 'Object not found' } };
      }
      return { data: { signedUrl: `https://signed.test/${path}` }, error: null };
    });

    const res = await postRequest({
      paths: ['user-1/42/ok.webp', 'user-1/42/missing.webp'],
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.signedUrls['user-1/42/ok.webp']).toBe('https://signed.test/user-1/42/ok.webp');
    expect(json.errors['user-1/42/missing.webp']).toBe('Object not found');
    errorSpy.mockRestore();
  });

  it('returns 503 when the bucket is missing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found' },
    });

    const res = await postRequest({ paths: ['user-1/42/a.webp'] });
    expect(res.status).toBe(503);
    errorSpy.mockRestore();
  });
});
