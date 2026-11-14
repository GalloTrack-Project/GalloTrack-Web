import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

const mockGetUser = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
        upload: mockUpload,
        remove: mockRemove,
      })),
    },
    from: mockFrom,
  })),
}));

function getRequest(path?: string, token = 'valid-token') {
  const url = new URL('http://localhost:3000/api/fowl/photo');
  if (path !== undefined) url.searchParams.set('path', path);
  return GET(
    new NextRequest(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );
}

function postRequest(form: FormData) {
  const request = {
    headers: new Headers({ Authorization: 'Bearer valid-token' }),
    formData: async () => form,
    nextUrl: new URL('http://localhost:3000/api/fowl/photo'),
  } as unknown as NextRequest;
  return POST(request);
}

describe('/api/fowl/photo signed URL endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/photo.webp' },
      error: null,
    });
    mockUpload.mockResolvedValue({ error: null });
    mockRemove.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { id: 42, user_id: 'user-1' }, error: null }),
        }),
      }),
    });
  });

  it('rejects unauthenticated requests', async () => {
    const res = await getRequest('user-1/42/file.webp', '');
    expect(res.status).toBe(401);
  });

  it('requires a path', async () => {
    const res = await getRequest();
    expect(res.status).toBe(400);
  });

  it('rejects paths outside the current user', async () => {
    expect((await getRequest('user-2/42/file.webp')).status).toBe(403);
    expect((await getRequest('user-1/../user-2/file.webp')).status).toBe(403);
  });

  it('returns a server-signed URL for the owner path', async () => {
    const res = await getRequest('user-1/42/file.webp');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      signedUrl: 'https://signed.test/photo.webp',
    });
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('user-1/42/file.webp', 3600);
  });

  it('returns 503 when the bucket is missing and logs the failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found' },
    });

    const res = await getRequest('user-1/42/file.webp');
    expect(res.status).toBe(503);
    expect(errorSpy).toHaveBeenCalledWith(
      '[chicken-photo] sign failed',
      expect.objectContaining({ path: 'user-1/42/file.webp' }),
    );
    errorSpy.mockRestore();
  });

  it('accepts JPEG, PNG and WebP uploads for an owned chicken', async () => {
    const signatures: Record<string, number[]> = {
      'image/jpeg': [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01],
      'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00],
      'image/webp': [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
    };

    for (const [name, type] of [
      ['bird.jpg', 'image/jpeg'],
      ['bird.png', 'image/png'],
      ['bird.webp', 'image/webp'],
    ]) {
      const bytes = new Uint8Array(signatures[type]);
      const form = new FormData();
      form.append('fowlId', '42');
      form.append('photo', new File([bytes], name, { type }));
      form.append('thumbnail', new File([bytes], name, { type }));

      const res = await postRequest(form);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.fullPath).toContain('/42/');
      expect(json.thumbPath).toContain('/42/');
    }
  });

  it('rejects files over 5 MB with 413', async () => {
    const large = new Uint8Array(5 * 1024 * 1024 + 1);
    const form = new FormData();
    form.append('fowlId', '42');
    form.append('photo', new File([large], 'large.jpg', { type: 'image/jpeg' }));
    form.append('thumbnail', new File(['thumb'], 'thumb.webp', { type: 'image/webp' }));

    const res = await postRequest(form);
    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({
      error: 'Photo must be 5 MB or smaller.',
    });
  });

  it('rejects unsupported types with 415', async () => {
    const form = new FormData();
    form.append('fowlId', '42');
    form.append('photo', new File(['gif'], 'cat.gif', { type: 'image/gif' }));
    form.append('thumbnail', new File(['thumb'], 'thumb.webp', { type: 'image/webp' }));

    const res = await postRequest(form);
    expect(res.status).toBe(415);
  });

  it('returns a clear 500 JSON error when storage upload fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpload.mockResolvedValue({ error: { message: 'storage exploded' } });

    const form = new FormData();
    form.append('fowlId', '42');
    form.append('photo', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])], 'bird.jpg', { type: 'image/jpeg' }));
    form.append('thumbnail', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])], 'thumb.jpg', { type: 'image/jpeg' }));

    const res = await postRequest(form);
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'storage exploded' });
    errorSpy.mockRestore();
  });
});


