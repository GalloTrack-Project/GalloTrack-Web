import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFowlImage } from './fowl-service';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/registry', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    storage: {
      from: vi.fn().mockImplementation((bucket: string) => {
        if (bucket === 'fowl-images') {
          return {
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          };
        }
        return {};
      }),
    },
  },
}));

describe('uploadFowlImage (path fixture test)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/fowl-images/${path}` },
    }));
  });

  it('uploads to {user_id}/fowl/{fileName} when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'usr-9cc100d9-c855-41d3-a6a8-3c10fd65221c' } },
    });
    mockUpload.mockResolvedValue({ data: { path: 'uploaded' }, error: null });

    const dummyFile = new File(['mock content'], 'champion-cock.jpg', { type: 'image/jpeg' });
    const result = await uploadFowlImage(dummyFile);

    expect(result.error).toBeUndefined();
    expect(result.path).toBeDefined();
    expect(result.url).toBeDefined();

    // Verify path structure: usr-9cc100d9-c855-41d3-a6a8-3c10fd65221c/fowl/{timestamp}-{random}.jpg
    expect(result.path).toMatch(/^usr-9cc100d9-c855-41d3-a6a8-3c10fd65221c\/fowl\/\d+-[a-z0-9]+\.jpg$/);
    expect(result.url).toContain(result.path!);

    // Verify storage upload call arguments
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledWith(result.path, dummyFile);
  });

  it('falls back to fowl/{fileName} when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockUpload.mockResolvedValue({ data: { path: 'uploaded' }, error: null });

    const dummyFile = new File(['mock content'], 'rooster.png', { type: 'image/png' });
    const result = await uploadFowlImage(dummyFile);

    expect(result.error).toBeUndefined();
    expect(result.path).toBeDefined();
    expect(result.path).toMatch(/^fowl\/\d+-[a-z0-9]+\.png$/);
    expect(mockUpload).toHaveBeenCalledWith(result.path, dummyFile);
  });

  it('returns error when storage upload fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'usr-123' } },
    });
    mockUpload.mockResolvedValue({ data: null, error: { message: 'Bucket not found' } });

    const dummyFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const result = await uploadFowlImage(dummyFile);

    expect(result.error).toBe('Bucket not found');
    expect(result.url).toBeUndefined();
  });
});
