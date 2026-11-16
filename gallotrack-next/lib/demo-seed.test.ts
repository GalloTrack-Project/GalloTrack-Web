import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addMonthsToDate } from '@/lib/helpers';
import {
  DEMO_CASES,
  DEMO_MARKER,
  addDays,
  buildDemoFowlPlan,
  computeDemoBirthdates,
  dateKey,
  parseDateKey,
  parseSeedDemoArgs,
  runDemoSeed,
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
      if (plan.gender === 'Rooster') expect(plan.wingBand).toBeTruthy();
      else expect(plan.wingBand).toBeNull();
    }
  });
});

describe('demo seed safety', () => {
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
