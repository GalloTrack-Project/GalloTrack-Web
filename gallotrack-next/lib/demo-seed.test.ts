import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addMonthsToDate } from '@/lib/helpers';
import { validateIdentifierFormat } from '@/lib/bird-code';
import { isValidWingBand } from '@/lib/wing-band';
import { buildMilestoneNotifications } from '@/lib/notifications/milestones';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/notifications/types';
import {
  DEMO_ALL_LEAD_DAYS,
  DEMO_CASES,
  DEMO_DEFAULT_LEAD_DAYS,
  DEMO_MARKER,
  addDays,
  applyConfirmationError,
  buildDemoAlertRows,
  buildDemoFowlPlan,
  computeDemoBirthdates,
  dateKey,
  demoEnvError,
  formatTable,
  parseDateKey,
  parseDemoEnvFile,
  parseSeedDemoArgs,
  runDemoSeed,
  targetProjectLabel,
} from '../scripts/seed-demo';

type Row = Record<string, unknown> & { id: number; user_id?: string };

type MockState = {
  breeds: Array<{ name: string }>;
  fowl: Row[];
  matches: Row[];
  insertedFowl: Row[];
  insertedMatches: Row[];
  deletedFowlIds: number[];
  deletedMatchIds: number[];
  nextFowlId: number;
  nextMatchId: number;
};

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function createState(overrides: Partial<MockState> = {}): MockState {
  return {
    breeds: [{ name: 'Lemon' }, { name: 'Hatch' }],
    fowl: [],
    matches: [],
    insertedFowl: [],
    insertedMatches: [],
    deletedFowlIds: [],
    deletedMatchIds: [],
    nextFowlId: 500,
    nextMatchId: 700,
    ...overrides,
  };
}

class MockQuery {
  private operation: 'select' | 'insert' | 'delete' = 'select';
  private payload: Row | null = null;
  private filters: Array<{ column: string; value: unknown; kind: 'eq' | 'in' }> = [];

  constructor(
    private readonly table: string,
    private readonly state: MockState,
  ) {}

  select() {
    return this;
  }

  order() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value, kind: 'eq' });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ column, value, kind: 'in' });
    return this;
  }

  insert(payload: Row) {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  single() {
    return Promise.resolve(this.execute(true));
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.execute(false)).then(onfulfilled, onrejected);
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) => {
      if (filter.kind === 'eq') return row[filter.column] === filter.value;
      return Array.isArray(filter.value) && filter.value.includes(row[filter.column]);
    });
  }

  private execute(single: boolean): QueryResult {
    if (this.table === 'strains' && this.operation === 'select') {
      return { data: this.state.breeds, error: null };
    }

    if (this.operation === 'insert') {
      const source = this.payload ?? { id: 0 };
      if (this.table === 'fowl') {
        const row = { ...source, id: this.state.nextFowlId++ } as Row;
        this.state.fowl.push(row);
        this.state.insertedFowl.push(row);
        return { data: single ? row : [row], error: null };
      }
      if (this.table === 'match') {
        const row = { ...source, id: this.state.nextMatchId++ } as Row;
        this.state.matches.push(row);
        this.state.insertedMatches.push(row);
        return { data: single ? row : [row], error: null };
      }
    }

    if (this.table === 'fowl' && this.operation === 'select') {
      return { data: this.state.fowl.filter((row) => this.matches(row)), error: null };
    }
    if (this.table === 'match' && this.operation === 'select') {
      return { data: this.state.matches.filter((row) => this.matches(row)), error: null };
    }

    if (this.operation === 'delete') {
      const target = this.table === 'fowl' ? this.state.fowl : this.state.matches;
      const removed = target.filter((row) => this.matches(row));
      const ids = removed.map((row) => Number(row.id));
      if (this.table === 'fowl') {
        this.state.fowl = this.state.fowl.filter((row) => !ids.includes(Number(row.id)));
        this.state.deletedFowlIds.push(...ids);
      } else if (this.table === 'match') {
        this.state.matches = this.state.matches.filter((row) => !ids.includes(Number(row.id)));
        this.state.deletedMatchIds.push(...ids);
      }
      return { data: null, error: null };
    }

    return { data: [], error: null };
  }
}

function createClient(state: MockState): SupabaseClient {
  return {
    from: (table: string) => new MockQuery(table, state),
    auth: { signInWithPassword: vi.fn() },
  } as unknown as SupabaseClient;
}

function demoFowl(id: number, name: string, overrides: Partial<Row> = {}): Row {
  return {
    id,
    user_id: 'user-1',
    name,
    notes: DEMO_MARKER,
    gender: 'Rooster',
    bird_code: `D${id}`,
    wing_band: null,
    ...overrides,
  };
}

function demoMatch(id: number, fowlId: number, overrides: Partial<Row> = {}): Row {
  return {
    id,
    user_id: 'user-1',
    fowl_id: fowlId,
    entry_name: 'Demo Stag Soon',
    opponent: 'Demo Opponent One',
    date: '2026-11-01',
    notes: DEMO_MARKER,
    ...overrides,
  };
}

const D = '2026-11-16';

describe('demo seed date computation', () => {
  it('computes birthdates whose milestones land on D + the requested offset', () => {
    const defenseDate = parseDateKey(D)!;
    const birthdates = computeDemoBirthdates(defenseDate);

    for (const demo of DEMO_CASES) {
      const birth = parseDateKey(birthdates[demo.key])!;
      expect(dateKey(addMonthsToDate(birth, demo.months))).toBe(
        dateKey(addDays(defenseDate, demo.offsetDays)),
      );
    }
  });

  it('builds only cock wing bands and leaves hens without one', () => {
    const defenseDate = parseDateKey(D)!;
    const { plans } = buildDemoFowlPlan({
      defenseDate,
      userId: 'user-1',
      breed: 'Lemon',
      existing: [],
    });

    for (const plan of plans) {
      if (plan.gender === 'Rooster') {
        expect(plan.wingBand).toBeTruthy();
        expect(isValidWingBand(plan.wingBand)).toBe(true);
      } else {
        expect(plan.wingBand).toBeNull();
      }
    }
  });

  it('uses scheme-valid foundation identifiers that stay unique per farm', () => {
    const defenseDate = parseDateKey(D)!;
    const existing = [
      {
        id: 1,
        name: 'Existing Cock',
        gender: 'Rooster',
        bird_code: '1',
        wing_band: 'REAL-WB-1',
        notes: 'owner row',
      },
      {
        id: 2,
        name: 'Existing Hen',
        gender: 'Hen',
        bird_code: 'A',
        wing_band: null,
        notes: 'owner row',
      },
    ];
    const { plans } = buildDemoFowlPlan({
      defenseDate,
      userId: 'user-1',
      breed: 'Lemon',
      existing,
    });

    for (const plan of plans) {
      const role = plan.gender === 'Hen' ? 'dam' : 'sire';
      expect(validateIdentifierFormat(plan.birdCode, role)).toEqual({ valid: true });
    }

    const codes = plans.map((plan) => plan.birdCode.toLowerCase());
    const bands = plans.flatMap((plan) => (plan.wingBand ? [plan.wingBand.toLowerCase()] : []));
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(bands).size).toBe(bands.length);
    expect(codes).not.toContain('1');
    expect(codes).not.toContain('a');
    expect(bands).not.toContain('real-wb-1');
  });
});

describe('demo milestone notifications', () => {
  function notificationsFor(leadDays: number[]) {
    const defenseDate = parseDateKey(D)!;
    const { plans } = buildDemoFowlPlan({
      defenseDate,
      userId: 'user-1',
      breed: 'Lemon',
      existing: [],
    });
    const fowls = plans.map((plan, index) => ({
      id: index + 1,
      name: plan.name,
      gender: plan.gender,
      birthdate: plan.birthdate,
      status: 'Active',
      activity_status: 'active',
    }));
    return buildMilestoneNotifications(
      fowls,
      { ...DEFAULT_NOTIFICATION_PREFERENCES, leadDays },
      defenseDate,
    );
  }

  it('produces today, 7-day, and recently-reached alerts with default lead days', () => {
    const notifications = notificationsFor(DEFAULT_NOTIFICATION_PREFERENCES.leadDays);

    expect(
      notifications.map((notification) => ({
        name: notification.fowlName,
        type: notification.type,
        daysUntil: notification.daysUntil,
      })),
    ).toEqual([
      { name: 'Demo Pullet Today', type: 'today', daysUntil: 0 },
      { name: 'Demo Mature Cock', type: 'upcoming', daysUntil: 7 },
      { name: 'Demo Reached Hen', type: 'reached', daysUntil: -5 },
    ]);
  });

  it('adds the 3-day and 1-day alerts only when those lead times are enabled', () => {
    const notifications = notificationsFor([...DEMO_ALL_LEAD_DAYS]);
    const byName = new Map(notifications.map((notification) => [notification.fowlName, notification]));

    expect(byName.get('Demo Stag Soon')).toMatchObject({
      type: 'upcoming',
      daysUntil: 3,
    });
    expect(byName.get('Demo Bull Stag Tomorrow')).toMatchObject({
      type: 'upcoming',
      daysUntil: 1,
    });
    expect(notifications).toHaveLength(5);
  });

  it('summarizes the default and all-leads alert per demo chicken', () => {
    expect(buildDemoAlertRows(parseDateKey(D)!)).toEqual([
      { name: 'Demo Stag Soon', defaultAlert: 'none', allLeadsAlert: 'upcoming 3d' },
      { name: 'Demo Pullet Today', defaultAlert: 'today', allLeadsAlert: 'today' },
      {
        name: 'Demo Bull Stag Tomorrow',
        defaultAlert: 'none',
        allLeadsAlert: 'upcoming 1d',
      },
      { name: 'Demo Mature Cock', defaultAlert: 'upcoming 7d', allLeadsAlert: 'upcoming 7d' },
      { name: 'Demo Reached Hen', defaultAlert: 'reached 5d ago', allLeadsAlert: 'reached 5d ago' },
    ]);
    expect([...DEMO_DEFAULT_LEAD_DAYS]).toEqual([7, 0]);
    expect([...DEMO_ALL_LEAD_DAYS]).toEqual([7, 3, 1, 0]);
  });

  it('prints both lead-day alert columns in the seed summary', () => {
    const table = formatTable([
      {
        action: 'WOULD CREATE',
        kind: 'fowl',
        name: 'Demo Stag Soon',
        detail: 'birthdate',
        defaultAlert: 'none',
        allLeadsAlert: 'upcoming 3d',
      },
    ]);

    expect(table).toContain('DEFAULT [7,0]');
    expect(table).toContain('ALL [7,3,1,0]');
    expect(table).toContain('upcoming 3d');
  });
});

describe('demo seed safety', () => {
  it('requires an exact DEMO_EMAIL confirmation before --apply', () => {
    const dryRun = { apply: false, confirmEmail: null };
    expect(applyConfirmationError(dryRun, 'demo@example.com')).toBeNull();

    const missing = { apply: true, confirmEmail: null };
    expect(applyConfirmationError(missing, 'demo@example.com')).toContain(
      '--confirm-email=demo@example.com',
    );

    const wrong = { apply: true, confirmEmail: 'owner@example.com' };
    expect(applyConfirmationError(wrong, 'demo@example.com')).toContain(
      'does not match DEMO_EMAIL',
    );

    const matching = { apply: true, confirmEmail: ' Demo@Example.com ' };
    expect(applyConfirmationError(matching, 'demo@example.com')).toBeNull();

    expect(
      parseSeedDemoArgs([`--date=${D}`, '--apply', '--confirm-email=demo@example.com'])
        .confirmEmail,
    ).toBe('demo@example.com');
  });

  it('refuses to run when DEMO_EMAIL is not explicitly set', () => {
    const base = {
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'anon',
      demoEmail: '',
      demoPassword: 'secret',
      breedName: 'Lemon',
    };
    expect(demoEnvError(base)).toBe(
      'Missing DEMO_EMAIL. Set it explicitly to the demo account email.',
    );
    expect(demoEnvError({ ...base, demoEmail: 'demo@example.com' })).toBeNull();
  });

  it('never loads the service-role key from .env.local', () => {
    const parsed = parseDemoEnvFile(`NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon
DEMO_EMAIL=demo@example.com
DEMO_PASSWORD=secret
SUPABASE_SERVICE_ROLE_KEY=must-not-be-read`);

    expect(parsed.DEMO_EMAIL).toBe('demo@example.com');
    expect(parsed).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
    expect(Object.keys(parsed).sort()).toEqual([
      'DEMO_EMAIL',
      'DEMO_PASSWORD',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
    ]);
  });

  it('prints only the account and project host as the write target', () => {
    expect(targetProjectLabel('https://abcdefgh.supabase.co')).toBe('abcdefgh.supabase.co');
    expect(targetProjectLabel('not a url')).toBe('(invalid NEXT_PUBLIC_SUPABASE_URL)');
  });

  it('defaults to a dry run and writes nothing', async () => {
    expect(parseSeedDemoArgs([`--date=${D}`])).toMatchObject({
      date: D,
      apply: false,
      clean: false,
    });

    const state = createState();
    const summary = await runDemoSeed({
      client: createClient(state),
      userId: 'user-1',
      date: D,
      apply: false,
      clean: false,
      breedName: 'Lemon',
    });

    expect(summary.mode).toBe('dry-run');
    expect(state.insertedFowl).toHaveLength(0);
    expect(state.insertedMatches).toHaveLength(0);
    expect(summary.rows.filter((row) => row.action === 'WOULD CREATE')).toHaveLength(7);
    expect(summary.rows.find((row) => row.name === 'Demo Stag Soon')).toMatchObject({
      defaultAlert: 'none',
      allLeadsAlert: 'upcoming 3d',
    });
    expect(summary.rows.find((row) => row.name === 'Demo Mature Cock')).toMatchObject({
      defaultAlert: 'upcoming 7d',
      allLeadsAlert: 'upcoming 7d',
    });
  });

  it('skips demo chickens that already carry the DEMO marker and name', async () => {
    const state = createState({
      fowl: [demoFowl(101, 'Demo Stag Soon')],
    });

    const summary = await runDemoSeed({
      client: createClient(state),
      userId: 'user-1',
      date: D,
      apply: true,
      clean: false,
      breedName: 'Lemon',
    });

    expect(summary.skippedFowl).toBe(1);
    expect(summary.createdFowl).toBe(4);
    expect(summary.createdMatches).toBe(2);
    expect(state.insertedFowl).toHaveLength(4);
    expect(state.insertedMatches).toHaveLength(2);
    const matchCock = state.insertedFowl.find((row) => row.name === 'Demo Mature Cock');
    expect(matchCock).toBeDefined();
    expect(state.insertedMatches.every((row) => row.fowl_id === matchCock?.id)).toBe(true);
  });

  it('skips matches that were already created for the demo cock', async () => {
    const state = createState({
      fowl: [demoFowl(101, 'Demo Mature Cock')],
      matches: [
        demoMatch(201, 101, {
          entry_name: 'Demo Mature Cock',
          opponent: 'Demo Opponent One',
          date: '2026-11-06',
        }),
      ],
    });

    const summary = await runDemoSeed({
      client: createClient(state),
      userId: 'user-1',
      date: D,
      apply: true,
      clean: false,
      breedName: 'Lemon',
    });

    expect(summary.skippedFowl).toBe(1);
    expect(summary.skippedMatches).toBe(1);
    expect(summary.createdMatches).toBe(1);
    expect(state.insertedMatches).toHaveLength(1);
    expect(state.insertedMatches[0]).toMatchObject({
      fowl_id: 101,
      outcome: 'Draw',
      opponent: 'Demo Opponent Two',
    });
  });

  it('stops with the missing breed name when the breed is not registered', async () => {
    const state = createState({ breeds: [{ name: 'Hatch' }] });

    await expect(
      runDemoSeed({
        client: createClient(state),
        userId: 'user-1',
        date: D,
        apply: false,
        clean: false,
        breedName: 'Lemon',
      }),
    ).rejects.toThrow('Missing registered breed: Lemon');
  });

  it('cleans only marked demo chickens and their demo matches', async () => {
    const state = createState({
      fowl: [
        demoFowl(1, 'Demo Stag Soon'),
        demoFowl(2, 'Not Demo', { notes: DEMO_MARKER }),
        demoFowl(3, 'Demo No Marker', { notes: 'regular notes' }),
      ],
      matches: [
        demoMatch(10, 1),
        demoMatch(11, 2),
        demoMatch(12, 1, { notes: 'regular notes' }),
      ],
    });

    const dryRun = await runDemoSeed({
      client: createClient(state),
      userId: 'user-1',
      date: D,
      apply: false,
      clean: true,
      breedName: 'Lemon',
    });

    expect(dryRun.rows.filter((row) => row.kind === 'fowl')).toHaveLength(1);
    expect(dryRun.rows.filter((row) => row.kind === 'match')).toHaveLength(2);
    expect(state.deletedFowlIds).toEqual([]);
    expect(state.deletedMatchIds).toEqual([]);

    const applied = await runDemoSeed({
      client: createClient(state),
      userId: 'user-1',
      date: D,
      apply: true,
      clean: true,
      breedName: 'Lemon',
    });

    expect(applied.deletedFowl).toBe(1);
    expect(applied.deletedMatches).toBe(2);
    expect(state.deletedFowlIds).toEqual([1]);
    expect(state.deletedMatchIds).toEqual([10, 11]);
    expect(state.fowl.map((row) => row.id)).toEqual([2, 3]);
    expect(state.matches.map((row) => row.id)).toEqual([12]);
  });
});
