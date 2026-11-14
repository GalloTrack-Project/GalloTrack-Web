import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runMilestoneNotificationJob } from './generate';

type Fowl = {
  id: number;
  user_id: string;
  name: string;
  bird_code: string;
  gender: string;
  birthdate: string;
  status: string;
};

type Setting = { user_id: string; key: string; value: unknown };
type Notification = {
  id: number;
  user_id: string;
  fowl_id: number;
  type: string;
  stage: string;
  title: string;
  body: string;
  due_date: string;
  read_at: string | null;
};

type State = {
  fowls: Fowl[];
  settings: Setting[];
  notifications: Notification[];
};

function key(row: { user_id: string; fowl_id: number; type: string; stage: string }) {
  return `${row.user_id}|${row.fowl_id}|${row.type}|${row.stage}`;
}

function fakeAdmin(state: State): SupabaseClient {
  let nextId = 1;

  function table(name: string) {
    let operation: 'select' | 'delete' | 'upsert' = 'select';
    let returning = false;
    const filters: Array<[string, unknown]> = [];
    let upsertRows: Record<string, unknown>[] = [];

    const builder = {
      select() {
        if (operation === 'select') {
          operation = 'select';
        } else {
          returning = true;
        }
        return builder;
      },
      delete() {
        operation = 'delete';
        return builder;
      },
      upsert(rows: Record<string, unknown>[]) {
        operation = 'upsert';
        upsertRows = rows;
        return builder;
      },
      in(column: string, values: unknown[]) {
        filters.push([`in:${column}`, values]);
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return builder;
      },
      neq(column: string, value: unknown) {
        filters.push([`neq:${column}`, value]);
        return builder;
      },
      is(column: string, value: unknown) {
        filters.push([`is:${column}`, value]);
        return builder;
      },
      then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
        try {
          return Promise.resolve(execute()).then(resolve, reject);
        } catch (error) {
          return Promise.reject(error).then(resolve, reject);
        }
      },
    };

    function matches(row: Record<string, unknown>): boolean {
      return filters.every(([column, value]) => {
        if (column.startsWith('in:')) {
          return (value as unknown[]).includes(row[column.slice(3)]);
        }
        if (column.startsWith('neq:')) {
          return row[column.slice(4)] !== value;
        }
        if (column.startsWith('is:')) {
          const field = column.slice(3);
          if (value === null) return row[field] == null;
          return row[field] === value;
        }
        return row[column] === value;
      });
    }

    function execute(): { data: unknown; error: null; count?: number } {
      if (name === 'fowl' && operation === 'select') {
        return { data: state.fowls.filter((row) => matches(row as never)), error: null };
      }
      if (name === 'user_settings' && operation === 'select') {
        return { data: state.settings.filter((row) => matches(row as never)), error: null };
      }
      if (name === 'user_settings' && operation === 'upsert') {
        for (const row of upsertRows) {
          const existing = state.settings.find(
            (item) => item.user_id === row.user_id && item.key === row.key,
          );
          if (existing) existing.value = row.value;
          else state.settings.push(row as unknown as Setting);
        }
        return { data: upsertRows, error: null };
      }
      if (name === 'notifications' && operation === 'delete') {
        const removed = state.notifications.filter((row) => matches(row as never));
        state.notifications = state.notifications.filter((row) => !removed.includes(row));
        return { data: returning ? removed : null, error: null };
      }
      if (name === 'notifications' && operation === 'upsert') {
        const inserted: Notification[] = [];
        for (const row of upsertRows) {
          const candidate = {
            id: nextId++,
            read_at: null,
            ...row,
          } as Notification;
          if (state.notifications.some((existing) => key(existing) === key(candidate))) continue;
          state.notifications.push(candidate);
          inserted.push(candidate);
        }
        return { data: returning ? inserted : null, error: null };
      }
      return { data: [], error: null };
    }

    return builder;
  }

  return { from: table } as unknown as SupabaseClient;
}

const fowl = (options: Partial<Fowl> = {}): Fowl => ({
  id: 7,
  user_id: '11111111-1111-4111-8111-111111111111',
  name: 'Pearl Lemon',
  bird_code: '1A4',
  gender: 'Rooster',
  birthdate: '2025-01-15',
  status: 'Active',
  ...options,
});

const now = new Date('2025-07-10T12:00:00');

describe('milestone notification job', () => {
  it('is idempotent across repeated runs', async () => {
    const state: State = { fowls: [fowl()], settings: [], notifications: [] };
    const admin = fakeAdmin(state);

    const first = await runMilestoneNotificationJob(admin, now);
    expect(first.created).toBe(1);
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].type).toBe('stage_upcoming');

    const second = await runMilestoneNotificationJob(admin, now);
    expect(second.created).toBe(0);
    expect(state.notifications).toHaveLength(1);
  });

  it('skips archived and deceased chickens and clears their unread upcoming notices', async () => {
    const state: State = {
      fowls: [fowl({ status: 'Archived' }), fowl({ id: 8, status: 'Deceased' })],
      settings: [],
      notifications: [
        {
          id: 1,
          user_id: '11111111-1111-4111-8111-111111111111',
          fowl_id: 7,
          type: 'stage_upcoming',
          stage: 'Stag',
          title: 'x',
          body: 'y',
          due_date: '2025-07-15',
          read_at: null,
        },
      ],
    };
    const result = await runMilestoneNotificationJob(fakeAdmin(state), now);
    expect(result.created).toBe(0);
    expect(result.removed).toBe(1);
    expect(state.notifications).toHaveLength(0);
  });

  it('clears an unread upcoming notice after a birth-date edit moves it out of the lead window', async () => {
    const state: State = { fowls: [fowl()], settings: [], notifications: [] };
    const admin = fakeAdmin(state);
    await runMilestoneNotificationJob(admin, now);
    expect(state.notifications).toHaveLength(1);

    state.fowls[0].birthdate = '2025-03-15';
    const result = await runMilestoneNotificationJob(admin, now);
    expect(result.removed).toBe(1);
    expect(state.notifications).toHaveLength(0);
  });

  it('creates a stage change only after the last run, including a boundary exactly at 6 months', async () => {
    const state: State = {
      fowls: [fowl()],
      settings: [
        {
          user_id: '11111111-1111-4111-8111-111111111111',
          key: 'milestone_notifications_last_run_at',
          value: '2025-07-14T01:00:00.000Z',
        },
      ],
      notifications: [],
    };
    const result = await runMilestoneNotificationJob(
      fakeAdmin(state),
      new Date('2025-07-15T12:00:00'),
    );
    expect(result.created).toBe(1);
    expect(state.notifications[0]).toMatchObject({
      type: 'stage_changed',
      stage: 'Stag',
      due_date: '2025-07-15',
    });
  });
});
