/**
 * match-service.test.ts
 *
 * Unit tests for updateMatch:
 *   - exactly one row updated returns updatedId, no error
 *   - zero-row update with visible row (RLS blocked) surfaces specific error
 *   - zero-row update with invisible row (deleted) surfaces specific error
 *   - more than one row updated is treated as a failure (never a success)
 *   - Supabase error propagates without a diagnostic read
 *
 * All tests use fixture mocks only — no network, no production writes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

// We mock the supabase client at module level so updateMatch uses our mock.
vi.mock('@/lib/registry', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

// Import after mocking
import { updateMatch } from '@/lib/services/match-service';

describe('updateMatch — zero-row detection and diagnostic read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns updatedId when exactly one row is updated', async () => {
    // Chain: .update(payload).eq('id', id).select('id') -> data=[{id:42}]
    const selectFn = vi.fn().mockResolvedValue({ data: [{ id: 42 }], error: null });
    const eqFn = vi.fn().mockReturnValue({ select: selectFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });

    mockFrom.mockReturnValue({ update: updateFn });

    const result = await updateMatch(42, { opponent: 'New Name' });
    expect(result.error).toBeUndefined();
    expect(result.updatedId).toBe(42);
    expect(updateFn).toHaveBeenCalledWith({ opponent: 'New Name' });
    expect(eqFn).toHaveBeenCalledWith('id', 42);
  });

  it('runs diagnostic read and returns "could not be updated" when row is visible but update returned 0 rows (RLS block)', async () => {
    // .update().eq().select() returns empty array (blocked)
    const selectUpdateFn = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqUpdateFn = vi.fn().mockReturnValue({ select: selectUpdateFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqUpdateFn });

    // Diagnostic read: .select('id').eq('id', id).maybeSingle() returns the row
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: { id: 42 }, error: null });
    const eqReadFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
    const selectReadFn = vi.fn().mockReturnValue({ eq: eqReadFn });

    mockFrom
      .mockReturnValueOnce({ update: updateFn })  // first call: update chain
      .mockReturnValueOnce({ select: selectReadFn }); // second call: diagnostic read

    const result = await updateMatch(42, { opponent: 'Test' });
    expect(result.error).toMatch(/could not be updated with your account/i);
    expect(result.updatedId).toBeUndefined();
  });

  it('runs diagnostic read and returns "not found" when row is invisible after 0-row update', async () => {
    const selectUpdateFn = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqUpdateFn = vi.fn().mockReturnValue({ select: selectUpdateFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqUpdateFn });

    // Diagnostic read: row not found
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqReadFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
    const selectReadFn = vi.fn().mockReturnValue({ eq: eqReadFn });

    mockFrom
      .mockReturnValueOnce({ update: updateFn })
      .mockReturnValueOnce({ select: selectReadFn });

    const result = await updateMatch(99, { opponent: 'Ghost' });
    expect(result.error).toMatch(/not found/i);
    expect(result.updatedId).toBeUndefined();
  });

  it('treats more than one updated row as a failure, never as success', async () => {
    const selectUpdateFn = vi.fn().mockResolvedValue({ data: [{ id: 42 }, { id: 43 }], error: null });
    const eqUpdateFn = vi.fn().mockReturnValue({ select: selectUpdateFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqUpdateFn });

    const maybeSingleFn = vi.fn().mockResolvedValue({ data: { id: 42 }, error: null });
    const eqReadFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
    const selectReadFn = vi.fn().mockReturnValue({ eq: eqReadFn });

    mockFrom
      .mockReturnValueOnce({ update: updateFn })
      .mockReturnValueOnce({ select: selectReadFn });

    const result = await updateMatch(42, { opponent: 'Ambiguous' });
    expect(result.error).toBeTruthy();
    expect(result.updatedId).toBeUndefined();
  });

  it('propagates Supabase error directly without diagnostic read', async () => {
    const selectUpdateFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const eqUpdateFn = vi.fn().mockReturnValue({ select: selectUpdateFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqUpdateFn });

    mockFrom.mockReturnValue({ update: updateFn });

    const result = await updateMatch(1, {});
    expect(result.error).toBe('DB error');
    expect(result.updatedId).toBeUndefined();
    // No diagnostic read for a hard error
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
