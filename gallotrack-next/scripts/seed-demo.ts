import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  addMonthsToDate,
  autoComputeGrowthStage,
  getAgeLabel,
  getAgeParts,
} from '@/lib/helpers';
import { buildCodeSet, generateBirdCode, type CodeSet } from '@/lib/bird-code';
export const DEMO_MARKER = 'DEMO DATA';
export const DEMO_BREED_FALLBACK = 'Lemon';
export const DEMO_DATE_FORMAT_MESSAGE = 'Use --date=YYYY-MM-DD (for example --date=2026-11-16).';

type DemoCaseKey = 'stag-soon' | 'pullet-today' | 'bull-stag-tomorrow' | 'mature-soon' | 'reached-hen';

type DemoCase = {
  key: DemoCaseKey;
  name: string;
  gender: 'Rooster' | 'Hen';
  months: number;
  offsetDays: number;
  milestoneLabel: string;
};

export const DEMO_CASES: readonly DemoCase[] = [
  {
    key: 'stag-soon',
    name: 'Demo Stag Soon',
    gender: 'Rooster',
    months: 6,
    offsetDays: 3,
    milestoneLabel: 'Stag in 3 days',
  },
  {
    key: 'pullet-today',
    name: 'Demo Pullet Today',
    gender: 'Hen',
    months: 6,
    offsetDays: 0,
    milestoneLabel: 'Pullet today',
  },
  {
    key: 'bull-stag-tomorrow',
    name: 'Demo Bull Stag Tomorrow',
    gender: 'Rooster',
    months: 12,
    offsetDays: 1,
    milestoneLabel: 'Bull Stag tomorrow',
  },
  {
    key: 'mature-soon',
    name: 'Demo Mature Cock',
    gender: 'Rooster',
    months: 24,
    offsetDays: 7,
    milestoneLabel: 'Fully mature in 7 days',
  },
  {
    key: 'reached-hen',
    name: 'Demo Reached Hen',
    gender: 'Hen',
    months: 12,
    offsetDays: -5,
    milestoneLabel: 'Reached Hen 5 days ago',
  },
] as const;

export const DEMO_MATCH_COCK = 'Demo Mature Cock';

export type DemoFowlPlan = {
  caseKey: DemoCaseKey;
  name: string;
  gender: 'Rooster' | 'Hen';
  birthdate: string;
  growthStage: string;
  age: string;
  milestoneLabel: string;
  targetDate: string;
  birdCode: string;
  wingBand: string | null;
  payload: Record<string, unknown>;
};

export type DemoMatchPlan = {
  key: string;
  fowlName: string;
  date: string;
  outcome: 'Win' | 'Draw';
  opponent: string;
};

export type DemoSummaryRow = {
  action: 'CREATE' | 'SKIP' | 'WOULD CREATE' | 'WOULD DELETE' | 'DELETE';
  kind: 'fowl' | 'match';
  name: string;
  detail: string;
};

export type DemoRunSummary = {
  mode: 'dry-run' | 'apply';
  clean: boolean;
  breed: string;
  rows: DemoSummaryRow[];
  createdFowl: number;
  createdMatches: number;
  skippedFowl: number;
  skippedMatches: number;
  deletedFowl: number;
  deletedMatches: number;
};

type ExistingFowl = {
  id: number;
  name?: string | null;
  notes?: string | null;
  gender?: string | null;
  bird_code?: string | null;
  wing_band?: string | null;
};

type ExistingMatch = {
  id: number;
  fowl_id?: number | null;
  entry_name?: string | null;
  opponent?: string | null;
  date?: string | null;
  notes?: string | null;
};

type DemoSeedOptions = {
  client: SupabaseClient;
  userId: string;
  date: string;
  apply: boolean;
  clean: boolean;
  breedName?: string;
};

export type SeedDemoArgs = {
  date: string | null;
  apply: boolean;
  clean: boolean;
  help: boolean;
  confirmEmail: string | null;
};

export class DemoSeedError extends Error {}

export function parseSeedDemoArgs(argv: string[]): SeedDemoArgs {
  let date: string | null = null;
  let apply = false;
  let clean = false;
  let help = false;
  let confirmEmail: string | null = null;

  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    else if (arg === '--clean') clean = true;
    else if (arg === '--help' || arg === '-h') help = true;
    else if (arg.startsWith('--date=')) date = arg.slice('--date='.length);
    else if (arg.startsWith('--confirm-email=')) {
      confirmEmail = arg.slice('--confirm-email='.length);
    } else throw new DemoSeedError(`Unknown argument: ${arg}.`);
  }

  if (help) return { date, apply, clean, help, confirmEmail };
  if (!date) throw new DemoSeedError(`Missing --date. ${DEMO_DATE_FORMAT_MESSAGE}`);
  if (!parseDateKey(date)) throw new DemoSeedError(`Invalid --date. ${DEMO_DATE_FORMAT_MESSAGE}`);

  return { date, apply, clean, help, confirmEmail };
}

export function applyConfirmationError(
  args: Pick<SeedDemoArgs, 'apply' | 'confirmEmail'>,
  demoEmail: string,
): string | null {
  if (!args.apply) return null;
  const expected = demoEmail.trim().toLowerCase();
  const confirmed = (args.confirmEmail || '').trim().toLowerCase();
  if (!confirmed) {
    return `Refusing --apply without --confirm-email=${demoEmail}.`;
  }
  if (confirmed !== expected) {
    return 'Refusing --apply: --confirm-email does not match DEMO_EMAIL.';
  }
  return null;
}

export function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate(),
  ).padStart(2, '0')}`;
}

export function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Find a birthdate whose milestone at `months` lands on D + offsetDays.
 * The ±14 day search handles calendar month-end clamping in addMonthsToDate.
 */
export function birthdateForMilestone(
  defenseDate: Date,
  months: number,
  offsetDays: number,
): string {
  const target = addDays(defenseDate, offsetDays);
  const targetKey = dateKey(target);
  const guess = addMonthsToDate(target, -months);

  for (let delta = 0; delta <= 14; delta += 1) {
    const offsets = delta === 0 ? [0] : [-delta, delta];
    for (const dayOffset of offsets) {
      const candidate = addDays(guess, dayOffset);
      if (dateKey(addMonthsToDate(candidate, months)) === targetKey) {
        return dateKey(candidate);
      }
    }
  }

  return dateKey(guess);
}

export function computeDemoBirthdates(defenseDate: Date): Record<DemoCaseKey, string> {
  return DEMO_CASES.reduce(
    (out, demo) => {
      out[demo.key] = birthdateForMilestone(defenseDate, demo.months, demo.offsetDays);
      return out;
    },
    {} as Record<DemoCaseKey, string>,
  );
}

export function isDemoFowlRow(row: Pick<ExistingFowl, 'name' | 'notes'>): boolean {
  return (
    (row.name || '').startsWith('Demo ') &&
    (row.notes || '').trim() === DEMO_MARKER
  );
}

export function isDemoMatchRow(
  row: Pick<ExistingMatch, 'entry_name' | 'notes' | 'fowl_id'>,
  demoFowlIds?: ReadonlySet<number>,
): boolean {
  if ((row.notes || '').trim() !== DEMO_MARKER) return false;
  if (!(row.entry_name || '').startsWith('Demo ')) return false;
  return !demoFowlIds || (row.fowl_id !== null && row.fowl_id !== undefined && demoFowlIds.has(row.fowl_id));
}

function uniqueDemoLabel(base: string, taken: Set<string>): string {
  let candidate = base;
  let index = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

function nextSchemeBirdCode(gender: 'Rooster' | 'Hen', taken: CodeSet): string {
  const code = generateBirdCode({ gender, taken });
  taken.add(code.toLowerCase());
  return code;
}

function buildFowlPayload(input: {
  userId: string;
  breed: string;
  name: string;
  gender: 'Rooster' | 'Hen';
  birthdate: string;
  growthStage: string;
  age: string;
  birdCode: string;
  wingBand: string | null;
}): Record<string, unknown> {
  return {
    user_id: input.userId,
    name: input.name,
    breed: input.breed,
    gender: input.gender,
    color: 'Red',
    color_category: 'Red',
    growth_stage: input.growthStage,
    behavior_trait: 'Demo temperament',
    eye_variant: 'Standard Eye',
    birthdate: input.birthdate,
    age: input.age,
    weight: input.gender === 'Hen' ? '1.5' : '2.0',
    height: input.gender === 'Hen' ? '44' : '50',
    leg_color: 'Yellow',
    sire: 'Foundation Stock',
    dam: 'Foundation Stock',
    sire_pct: 100,
    dam_pct: 100,
    bloodline_pct: 100,
    bloodline_composition: { [input.breed]: 100 },
    bird_code: input.birdCode,
    wing_band: input.wingBand,
    status: 'Active',
    condition_status: 'Fit / Recovered',
    breeding_role: 'none',
    activity_status: 'active',
    registry_role: 'Non-Breeding',
    image_url: '',
    notes: DEMO_MARKER,
  };
}

export function buildDemoFowlPlan(input: {
  defenseDate: Date;
  userId: string;
  breed: string;
  existing: ExistingFowl[];
}): { plans: DemoFowlPlan[]; skipped: ExistingFowl[] } {
  const birthdates = computeDemoBirthdates(input.defenseDate);
  const existingByName = new Map(
    input.existing
      .filter((row) => isDemoFowlRow(row))
      .map((row) => [(row.name || '').trim().toLowerCase(), row] as const),
  );
  const takenCodes: CodeSet = buildCodeSet(input.existing.map((row) => row.bird_code));
  const takenBands = new Set(
    input.existing.map((row) => (row.wing_band || '').trim().toLowerCase()).filter(Boolean),
  );
  const skipped: ExistingFowl[] = [];
  const plans: DemoFowlPlan[] = [];

  for (const demo of DEMO_CASES) {
    const existing = existingByName.get(demo.name.toLowerCase());
    if (existing) {
      skipped.push(existing);
      continue;
    }

    const birthdate = birthdates[demo.key];
    const birth = parseDateKey(birthdate);
    if (!birth) throw new DemoSeedError(`Could not compute birthdate for ${demo.name}.`);
    const ageParts = getAgeParts(birthdate, input.defenseDate);
    const totalMonths = ageParts?.totalMonths ?? 0;
    const growthStage = autoComputeGrowthStage(totalMonths, demo.gender);
    const age = ageParts ? getAgeLabel(ageParts) : '';
    const birdCode = nextSchemeBirdCode(demo.gender, takenCodes);
    const wingBand =
      demo.gender === 'Rooster'
        ? uniqueDemoLabel(
            `DEMO-WB-${String(DEMO_CASES.indexOf(demo) + 1).padStart(2, '0')}`,
            takenBands,
          )
        : null;
    const targetDate = dateKey(addMonthsToDate(birth, demo.months));

    plans.push({
      caseKey: demo.key,
      name: demo.name,
      gender: demo.gender,
      birthdate,
      growthStage,
      age,
      milestoneLabel: demo.milestoneLabel,
      targetDate,
      birdCode,
      wingBand,
      payload: buildFowlPayload({
        userId: input.userId,
        breed: input.breed,
        name: demo.name,
        gender: demo.gender,
        birthdate,
        growthStage,
        age,
        birdCode,
        wingBand,
      }),
    });
  }

  return { plans, skipped };
}

export function buildDemoMatchPlan(defenseDate: Date): DemoMatchPlan[] {
  return [
    {
      key: 'demo-win',
      fowlName: DEMO_MATCH_COCK,
      date: dateKey(addDays(defenseDate, -10)),
      outcome: 'Win',
      opponent: 'Demo Opponent One',
    },
    {
      key: 'demo-draw',
      fowlName: DEMO_MATCH_COCK,
      date: dateKey(addDays(defenseDate, -5)),
      outcome: 'Draw',
      opponent: 'Demo Opponent Two',
    },
  ];
}

async function fetchRegisteredBreeds(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client.from('strains').select('name').order('name');
  if (error) throw new DemoSeedError(`Could not read registered breeds: ${error.message}`);
  return (data ?? [])
    .map((row) => String((row as { name?: unknown }).name ?? '').trim())
    .filter(Boolean);
}

async function fetchExistingFowl(client: SupabaseClient, userId: string): Promise<ExistingFowl[]> {
  const { data, error } = await client
    .from('fowl')
    .select('id,name,notes,gender,bird_code,wing_band')
    .eq('user_id', userId);
  if (error) throw new DemoSeedError(`Could not read your chickens: ${error.message}`);
  return (data ?? []) as ExistingFowl[];
}

async function fetchExistingMatches(
  client: SupabaseClient,
  userId: string,
): Promise<ExistingMatch[]> {
  const { data, error } = await client
    .from('match')
    .select('id,fowl_id,entry_name,opponent,date,notes')
    .eq('user_id', userId);
  if (error) throw new DemoSeedError(`Could not read your matches: ${error.message}`);
  return (data ?? []) as ExistingMatch[];
}

export async function runDemoSeed(options: DemoSeedOptions): Promise<DemoRunSummary> {
  const defenseDate = parseDateKey(options.date);
  if (!defenseDate) throw new DemoSeedError(`Invalid --date. ${DEMO_DATE_FORMAT_MESSAGE}`);

  const requestedBreed = (options.breedName || DEMO_BREED_FALLBACK).trim();
  const breeds = await fetchRegisteredBreeds(options.client);
  const registeredBreed = breeds.find(
    (name) => name.toLowerCase() === requestedBreed.toLowerCase(),
  );
  if (!options.clean && !registeredBreed) {
    throw new DemoSeedError(
      `Missing registered breed: ${requestedBreed}. Add it to Breeds before seeding demo data.`,
    );
  }
  const breed = registeredBreed ?? requestedBreed;

  const [existingFowl, existingMatches] = await Promise.all([
    fetchExistingFowl(options.client, options.userId),
    fetchExistingMatches(options.client, options.userId),
  ]);

  if (options.clean) {
    return cleanDemoData({
      ...options,
      breed,
      existingFowl,
      existingMatches,
    });
  }

  const { plans, skipped } = buildDemoFowlPlan({
    defenseDate,
    userId: options.userId,
    breed,
    existing: existingFowl,
  });
  const matchPlan = buildDemoMatchPlan(defenseDate);
  const demoCock =
    existingFowl.find(
      (row) => isDemoFowlRow(row) && row.name?.trim() === DEMO_MATCH_COCK,
    ) ?? null;
  const existingMatchKeys = new Set(
    existingMatches
      .filter((match) => isDemoMatchRow(match))
      .map((match) => `${(match.entry_name || '').trim()}|${(match.opponent || '').trim()}|${(match.date || '').trim()}`),
  );

  const summary: DemoRunSummary = {
    mode: options.apply ? 'apply' : 'dry-run',
    clean: false,
    breed,
    rows: [],
    createdFowl: 0,
    createdMatches: 0,
    skippedFowl: skipped.length,
    skippedMatches: 0,
    deletedFowl: 0,
    deletedMatches: 0,
  };

  const fowlIdsByName = new Map<string, number>();
  existingFowl.forEach((row) => {
    if (row.name) fowlIdsByName.set(row.name.trim().toLowerCase(), row.id);
  });

  for (const row of skipped) {
    summary.rows.push({
      action: 'SKIP',
      kind: 'fowl',
      name: row.name || '(unnamed)',
      detail: 'already exists with DEMO DATA marker',
    });
  }

  for (const plan of plans) {
    summary.rows.push({
      action: options.apply ? 'CREATE' : 'WOULD CREATE',
      kind: 'fowl',
      name: plan.name,
      detail: `${plan.birthdate} · ${plan.growthStage} · ${plan.milestoneLabel} · ${plan.birdCode}${
        plan.wingBand ? ` · band ${plan.wingBand}` : ''
      }`,
    });

    if (!options.apply) continue;

    const { data, error } = await options.client
      .from('fowl')
      .insert(plan.payload)
      .select('id')
      .single();
    if (error) throw new DemoSeedError(`Could not create ${plan.name}: ${error.message}`);
    const insertedId = Number((data as { id?: unknown } | null)?.id);
    if (!Number.isFinite(insertedId)) {
      throw new DemoSeedError(`Could not read the new ID for ${plan.name}.`);
    }
    fowlIdsByName.set(plan.name.toLowerCase(), insertedId);
    summary.createdFowl += 1;
  }

  const demoCockId =
    fowlIdsByName.get(DEMO_MATCH_COCK.toLowerCase()) ?? demoCock?.id ?? null;

  for (const match of matchPlan) {
    const key = `${match.fowlName}|${match.opponent}|${match.date}`;
    if (existingMatchKeys.has(key)) {
      summary.skippedMatches += 1;
      summary.rows.push({
        action: options.apply ? 'SKIP' : 'SKIP',
        kind: 'match',
        name: `${match.fowlName} vs ${match.opponent}`,
        detail: 'already exists with DEMO DATA marker',
      });
      continue;
    }

    summary.rows.push({
      action: options.apply ? 'CREATE' : 'WOULD CREATE',
      kind: 'match',
      name: `${match.fowlName} vs ${match.opponent}`,
      detail: `${match.outcome} · ${match.date}${demoCockId ? ` · fowl_id ${demoCockId}` : ''}`,
    });

    if (!options.apply) continue;
    if (!demoCockId) {
      throw new DemoSeedError(`Could not find the demo cock for ${match.fowlName}.`);
    }

    const { error } = await options.client.from('match').insert({
      user_id: options.userId,
      fowl_id: demoCockId,
      date: match.date,
      entry_name: match.fowlName,
      breed,
      opponent: match.opponent,
      opponent_breed: breed,
      location: 'Demo Arena',
      type: 'Derby Match',
      event_type: 'Derby',
      outcome: match.outcome,
      status: 'Verified',
      post_fight_condition: 'Fit / Recovered',
      cock_count: 1,
      age_category: 'Stag',
      notes: DEMO_MARKER,
    });
    if (error) throw new DemoSeedError(`Could not create match vs ${match.opponent}: ${error.message}`);
    summary.createdMatches += 1;
  }

  return summary;
}

async function cleanDemoData(input: DemoSeedOptions & {
  breed: string;
  existingFowl: ExistingFowl[];
  existingMatches: ExistingMatch[];
}): Promise<DemoRunSummary> {
  const demoFowl = input.existingFowl.filter((row) => isDemoFowlRow(row));
  const demoMatches = input.existingMatches.filter((row) => isDemoMatchRow(row));

  const summary: DemoRunSummary = {
    mode: input.apply ? 'apply' : 'dry-run',
    clean: true,
    breed: input.breed,
    rows: [],
    createdFowl: 0,
    createdMatches: 0,
    skippedFowl: 0,
    skippedMatches: 0,
    deletedFowl: 0,
    deletedMatches: 0,
  };

  for (const row of demoFowl) {
    summary.rows.push({
      action: input.apply ? 'DELETE' : 'WOULD DELETE',
      kind: 'fowl',
      name: row.name || '(unnamed)',
      detail: `id ${row.id} · ${DEMO_MARKER}`,
    });
  }
  for (const row of demoMatches) {
    summary.rows.push({
      action: input.apply ? 'DELETE' : 'WOULD DELETE',
      kind: 'match',
      name: `${row.entry_name || 'Demo match'} vs ${row.opponent || 'opponent'}`,
      detail: `id ${row.id} · ${DEMO_MARKER}`,
    });
  }

  if (!input.apply || summary.rows.length === 0) {
    summary.deletedFowl = 0;
    summary.deletedMatches = 0;
    return summary;
  }

  if (demoMatches.length > 0) {
    const { error } = await input.client
      .from('match')
      .delete()
      .eq('user_id', input.userId)
      .in('id', demoMatches.map((row) => row.id));
    if (error) throw new DemoSeedError(`Could not delete demo matches: ${error.message}`);
    summary.deletedMatches = demoMatches.length;
  }

  if (demoFowl.length > 0) {
    const { error } = await input.client
      .from('fowl')
      .delete()
      .eq('user_id', input.userId)
      .in('id', demoFowl.map((row) => row.id));
    if (error) throw new DemoSeedError(`Could not delete demo chickens: ${error.message}`);
    summary.deletedFowl = demoFowl.length;
  }

  return summary;
}

function formatTable(rows: DemoSummaryRow[]): string {
  if (rows.length === 0) return '(nothing to do)';
  const widths = {
    action: Math.max(6, ...rows.map((row) => row.action.length)),
    kind: Math.max(4, ...rows.map((row) => row.kind.length)),
    name: Math.max(4, ...rows.map((row) => row.name.length)),
  };
  const header = [
    'ACTION'.padEnd(widths.action),
    'TYPE'.padEnd(widths.kind),
    'NAME'.padEnd(widths.name),
    'DETAIL',
  ].join('  ');
  const divider = '-'.repeat(header.length);
  return [
    header,
    divider,
    ...rows.map((row) =>
      [
        row.action.padEnd(widths.action),
        row.kind.padEnd(widths.kind),
        row.name.padEnd(widths.name),
        row.detail,
      ].join('  '),
    ),
  ].join('\n');
}

function printSummary(summary: DemoRunSummary): void {
  console.log(`\nBreed: ${summary.breed}`);
  console.log(`Mode: ${summary.mode.toUpperCase()}${summary.clean ? ' · CLEAN' : ''}\n`);
  console.log(formatTable(summary.rows));

  if (summary.clean) {
    if (summary.mode === 'dry-run') {
      console.log(
        `\nWould delete ${summary.rows.filter((row) => row.kind === 'fowl').length} demo chickens and ${
          summary.rows.filter((row) => row.kind === 'match').length
        } demo matches. Re-run with --apply to delete them.`,
      );
    } else {
      console.log(`\nDeleted ${summary.deletedFowl} demo chickens and ${summary.deletedMatches} demo matches.`);
    }
    return;
  }

  if (summary.mode === 'dry-run') {
    console.log(
      `\nWould create ${summary.createdFowl || summary.rows.filter((row) => row.action === 'WOULD CREATE' && row.kind === 'fowl').length} demo chickens and ${
        summary.createdMatches || summary.rows.filter((row) => row.action === 'WOULD CREATE' && row.kind === 'match').length
      } matches. Re-run with --apply to write them.`,
    );
    return;
  }

  console.log(
    `\nCreated ${summary.createdFowl} demo chickens and ${summary.createdMatches} matches. Skipped ${summary.skippedFowl} existing demo chickens and ${summary.skippedMatches} existing matches.`,
  );
}

export type DemoEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  demoEmail: string;
  demoPassword: string;
  breedName: string;
};

const DEMO_ENV_KEYS = new Set([
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'DEMO_EMAIL',
  'DEMO_PASSWORD',
  'DEMO_BREED',
]);

export function parseDemoEnvFile(contents: string): Record<string, string> {
  const fileEnv: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    if (!DEMO_ENV_KEYS.has(key)) continue;
    fileEnv[key] = line.slice(index + 1).trim();
  }
  return fileEnv;
}

export function demoEnvError(env: DemoEnv): string | null {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.';
  }
  if (!env.demoEmail) {
    return 'Missing DEMO_EMAIL. Set it explicitly to the demo account email.';
  }
  if (!env.demoPassword) {
    return 'Missing DEMO_PASSWORD. Use the demo account only.';
  }
  return null;
}

export function targetProjectLabel(supabaseUrl: string): string {
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return '(invalid NEXT_PUBLIC_SUPABASE_URL)';
  }
}

function loadDemoEnv(): DemoEnv {
  const envPath = path.resolve(__dirname, '../.env.local');
  const fileEnv = fs.existsSync(envPath)
    ? parseDemoEnvFile(fs.readFileSync(envPath, 'utf8'))
    : {};
  const read = (key: string) => process.env[key] || fileEnv[key] || '';
  return {
    supabaseUrl: read('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: read('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    demoEmail: read('DEMO_EMAIL'),
    demoPassword: read('DEMO_PASSWORD'),
    breedName: read('DEMO_BREED') || DEMO_BREED_FALLBACK,
  };
}

export async function runSeedDemoCli(argv = process.argv.slice(2)): Promise<number> {
  try {
    const args = parseSeedDemoArgs(argv);
    if (args.help) {
      console.log(`Usage: npm run seed:demo -- --date=YYYY-MM-DD [--apply --confirm-email=DEMO_EMAIL] [--clean]

Without --apply this is a dry run and writes nothing.
--apply requires --confirm-email to exactly match DEMO_EMAIL.
--clean deletes only chickens/matches created by this script (notes "${DEMO_MARKER}") and exits.`);
      return 0;
    }

    const env = loadDemoEnv();
    const envError = demoEnvError(env);
    if (envError) throw new DemoSeedError(envError);
    const confirmationError = applyConfirmationError(args, env.demoEmail);
    if (confirmationError) throw new DemoSeedError(confirmationError);

    console.log(`Target account: ${env.demoEmail}`);
    console.log(`Target project: ${targetProjectLabel(env.supabaseUrl)}`);

    const client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const { data: auth, error } = await client.auth.signInWithPassword({
      email: env.demoEmail,
      password: env.demoPassword,
    });
    if (error || !auth.user) {
      throw new DemoSeedError(`Demo sign-in failed: ${error?.message || 'No user returned.'}`);
    }
    const signedInEmail = (auth.user.email || '').trim().toLowerCase();
    if (!signedInEmail || signedInEmail !== env.demoEmail.trim().toLowerCase()) {
      throw new DemoSeedError(
        `Signed-in account does not match DEMO_EMAIL (${env.demoEmail}).`,
      );
    }

    const summary = await runDemoSeed({
      client,
      userId: auth.user.id,
      date: args.date || '',
      apply: args.apply,
      clean: args.clean,
      breedName: env.breedName,
    });
    printSummary(summary);
    return 0;
  } catch (error) {
    console.error(`\nDemo seed stopped: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  /(?:^|[\\/])seed-demo\.(?:ts|js)$/.test(process.argv[1]);

if (isDirectRun) {
  void runSeedDemoCli().then((code) => {
    process.exitCode = code;
  });
}
