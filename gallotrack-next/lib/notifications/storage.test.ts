import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/registry';
import {
  loadNotificationStore,
  notificationPreferencesStorageKey,
  notificationStateStorageKey,
  saveNotificationPreferences,
} from './storage';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type MilestoneNotificationPreferences,
} from './types';

vi.mock('@/lib/registry', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

type Response = { data: unknown; error: null | { code?: string; message?: string } };

function builder(response: Response) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(response)),
    upsert: vi.fn(() => Promise.resolve(response)),
    then: (resolve: (value: Response) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(response).then(resolve, reject),
  };
  return chain;
}

function mockTables(responses: Record<string, Response>) {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    const response = responses[table] ?? { data: null, error: null };
    return builder(response) as never;
  });
}

const prefs: MilestoneNotificationPreferences = {
  ...DEFAULT_NOTIFICATION_PREFERENCES,
  stages: { stag: true, 'bull-stag': false, cock: true },
  leadDays: [14, 0],
  audience: 'hens',
};

describe('notification storage fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('loads localStorage state and preferences when both tables are missing', async () => {
    window.localStorage.setItem(notificationPreferencesStorageKey('user-1'), JSON.stringify(prefs));
    window.localStorage.setItem(
      notificationStateStorageKey('user-1'),
      JSON.stringify({
        '7::stag::2027-04-12::upcoming-7': {
          read_at: '2027-04-05T00:00:00.000Z',
          dismissed_at: null,
        },
      }),
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTables({
      notification_preferences: {
        data: null,
        error: { code: 'PGRST205', message: 'Could not find the table' },
      },
      notification_state: {
        data: null,
        error: { code: 'PGRST205', message: 'Could not find the table' },
      },
    });

    const snapshot = await loadNotificationStore('user-1');
    expect(snapshot.mode).toBe('local');
    expect(snapshot.preferences.stages['bull-stag']).toBe(false);
    expect(snapshot.preferences.leadDays).toEqual([14, 0]);
    expect(snapshot.preferences.audience).toBe('hens');
    expect(snapshot.state['7::stag::2027-04-12::upcoming-7'].read_at).toBe(
      '2027-04-05T00:00:00.000Z',
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Using localStorage fallback'),
    );
    errorSpy.mockRestore();
  });

  it('writes preferences to localStorage in fallback mode', async () => {
    const mode = await saveNotificationPreferences('user-1', prefs, 'local');
    expect(mode).toBe('local');
    const stored = JSON.parse(
      window.localStorage.getItem(notificationPreferencesStorageKey('user-1')) || '{}',
    );
    expect(stored.audience).toBe('hens');
    expect(stored.stages['bull-stag']).toBe(false);
  });

  it('loads database preferences and state when the tables exist', async () => {
    mockTables({
      notification_preferences: { data: { settings: prefs }, error: null },
      notification_state: {
        data: [
          {
            key: '7::stag::2027-04-12::upcoming-7',
            read_at: '2027-04-05T00:00:00.000Z',
            dismissed_at: null,
          },
        ],
        error: null,
      },
    });
    const snapshot = await loadNotificationStore('user-1');
    expect(snapshot.mode).toBe('database');
    expect(snapshot.preferences.audience).toBe('hens');
    expect(snapshot.state['7::stag::2027-04-12::upcoming-7'].read_at).toBe(
      '2027-04-05T00:00:00.000Z',
    );
  });

  it('reads old user_settings lead values once as defaults', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as never);
    mockTables({
      notification_preferences: { data: null, error: null },
      notification_state: { data: [], error: null },
      user_settings: {
        data: [
          { key: 'notify_stage_changed', value: true },
          { key: 'notify_fully_mature', value: false },
          { key: 'notification_lead_days', value: 3 },
        ],
        error: null,
      },
    });
    const snapshot = await loadNotificationStore('user-1');
    expect(snapshot.mode).toBe('database');
    expect(snapshot.preferences.leadDays).toEqual([3, 0]);
    expect(snapshot.preferences.stages.stag).toBe(true);
    expect(snapshot.preferences.stages.cock).toBe(false);
  });
});
