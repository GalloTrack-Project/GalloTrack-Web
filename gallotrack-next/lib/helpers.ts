import type { FowlRecord, AgeParts, DevelopmentStage, RolledMilestoneStage, MilestoneInfo, PairingStats } from './types';
import { getFowlBloodlineStats, type BloodlineStats } from './bloodline-composition';

export const POST_FIGHT_CONDITIONS = [
  { value: 'Fit / Recovered', icon: '🟢', short: 'FIT', desc: 'Pulled through cleanly' },
  { value: 'Severely Injured / Critical', icon: '🟠', short: 'CRITICAL', desc: 'Badly hurt after the fight' },
  { value: 'Deceased (Died from injuries)', icon: '💀', short: 'DECEASED', desc: 'Died from fight injuries' },
] as const;

export const STRAIN_LIST: string[] = [];

/**
 * Canonical growth-stage stored values.
 * These are the exact strings persisted in `growth_stage`; they must never be
 * translated or renamed, and every filter that offers a stage must offer all
 * six so a stage never silently disappears from the list.
 */
export const GROWTH_STAGE_VALUES = [
  'Chick',
  'Stag',
  'Bull Stag',
  'Pullet',
  'Cock',
  'Hen',
] as const;

export const MATCH_EVENT_TYPES = ['Derby', 'Lusong'] as const;

export const COCK_COUNT_OPTIONS = [2, 3, 4, 5] as const;

export const AGE_CATEGORY_OPTIONS = [
  { value: 'Cock', label: 'Cock (24+ mo)', desc: 'Mature fighting cock' },
  { value: 'Stag', label: 'Stag (6–24 mo)', desc: 'Young stag in conditioning' },
  { value: 'Open', label: 'Open', desc: 'No class restriction (cock or stag)' },
] as const;

export const MATCH_TYPE_OPTIONS: string[] = [
  ...COCK_COUNT_OPTIONS.flatMap((n) =>
    AGE_CATEGORY_OPTIONS.flatMap((a) =>
      MATCH_EVENT_TYPES.map((e) => `${n}-Cock ${a.value} ${e}`)
    )
  ),
];

export const LEG_COLOR_LIST = ['Yellow', 'White', 'Green / Slate', 'Willow', 'Black'];

export const FEATHER_COLOR_LIST = [
  'Black-Breasted Red',
  'Dark Red',
  'Bright Red',
  'Wheaten',
  'White',
  'Dark Cornish',
  'Ginger Red',
  'Brown Red',
  'Gray',
  'Pyle',
  'Dom',
  'Duckwing',
  'Black',
];

export const TRAIT_LIST = [
  'Aggressive',
  'Smart Fighter',
  'Powerful',
  'Fast',
  'Alert',
  'Active',
  'Calm',
  'Broody',
  'Docile',
  'High Velocity Cutter',
  'Aggressive Counter Striker',
  'Tenacious Offense',
  'High Flyer Ace',
  'Wave-Motion Tracker',
];

/**
 * Normalizes a free-text option value:
 * 1. Trims leading and trailing whitespace.
 * 2. Collapses internal whitespace sequences into a single space.
 * 3. Matches case-insensitively against available canonical options; if a match
 *    is found, returns the canonical casing.
 * 4. Otherwise returns the trimmed & collapsed free text.
 */
export function normalizeOptionValue(
  value: string | undefined | null,
  canonicalOptions: string[] = []
): string {
  if (!value) return '';
  const collapsed = value.trim().replace(/\s+/g, ' ');
  if (!collapsed) return '';
  const lower = collapsed.toLowerCase();
  const matched = canonicalOptions.find((opt) => opt.trim().toLowerCase() === lower);
  return matched || collapsed;
}

/**
 * Checks whether a given value is a custom (non-standard) entry relative to
 * the provided option list.
 */
export function isCustomOption(
  value: string | undefined | null,
  canonicalOptions: string[] = []
): boolean {
  if (!value) return false;
  const collapsed = value.trim().replace(/\s+/g, ' ');
  if (!collapsed) return false;
  const lower = collapsed.toLowerCase();
  return !canonicalOptions.some((opt) => opt.trim().toLowerCase() === lower);
}

/**
 * Formats a chicken's plumage/feather color for display, preserving legacy
 * color category groupings (e.g. "Red (Bright Red)") when category and color differ.
 */
export function formatColorDisplay(
  color?: string | null,
  colorCategory?: string | null
): string {
  const c = (color || '').trim();
  const cat = (colorCategory || '').trim();
  if (!c && !cat) return 'Not specified';
  if (c && cat && cat.toLowerCase() !== c.toLowerCase()) {
    return `${cat} (${c})`;
  }
  return c || cat || 'Not specified';
}

export const DATE_RANGES: { id: '7d' | '30d' | 'month' | '3m' | 'all'; label: string }[] = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'month', label: 'This Month' },
  { id: '3m', label: 'Last 3 Months' },
  { id: 'all', label: 'All Time' },
];

export const isMale = (g?: string) => !!g && ['rooster', 'cock', 'stag', 'male'].includes(g.trim().toLowerCase());
export const isFemale = (g?: string) => !!g && ['hen', 'pullet', 'female'].includes(g.trim().toLowerCase());

export type SexLabel = 'Cock' | 'Hen' | 'Unknown';

/**
 * Display label for a chicken's SEX. "Sire" and "Dam" are parent roles only and
 * must never be used to label an offspring's sex.
 */
export const sexLabel = (
  chicken?: { gender?: string | null } | string | null
): SexLabel => {
  const raw = typeof chicken === 'string' ? chicken : chicken?.gender;
  if (isMale(raw ?? undefined)) return 'Cock';
  if (isFemale(raw ?? undefined)) return 'Hen';
  return 'Unknown';
};

/**
 * Only cocks/stags are fighting birds. Hens (and birds with unknown sex) never
 * carry a fight record in the Lineage Directory, even if a historical match row
 * exists for them.
 */
export const canFight = (
  chicken?: { gender?: string | null } | string | null
): boolean => {
  const raw = typeof chicken === 'string' ? chicken : chicken?.gender;
  return isMale(raw ?? undefined);
};

/** Keep only the birds that can fight (cocks/stags) from a child list. */
export const fightersOf = <T extends { gender?: string | null }>(
  children: readonly T[]
): T[] => children.filter((child) => canFight(child));

export const cleanPct = (v: unknown): number => {
  const n = Number(v);
  return !isNaN(n) && n > 0 ? Math.min(n, 100) : 0;
};

export const isFoundationStock = (name: string): boolean => (name || '').trim().toLowerCase() === 'foundation stock';

export const parentBreedOf = (
  name: string | null | undefined,
  fowls: Array<{ name?: string | null; breed?: string | null }>,
): string => {
  const key = (name || '').trim().toLowerCase();
  if (!key || key === 'foundation stock') return '';
  return fowls.find((f) => (f.name || '').trim().toLowerCase() === key)?.breed || '';
};

/**
 * Dominant bloodline share of a named parent — engine-derived, so it always
 * matches what the parent's own profile shows. Null when the parent is not a
 * registered bird (foundation stock, external, or unknown name).
 */
export const parentBloodlineOf = (
  name: string | null | undefined,
  fowls: FowlRecord[],
): BloodlineStats | null => {
  const key = (name || '').trim().toLowerCase();
  if (!key || key === 'foundation stock') return null;
  const parent = fowls.find((f) => (f.name || '').trim().toLowerCase() === key);
  return parent ? getFowlBloodlineStats(parent, fowls) : null;
};

export const generationOfName = (name: string, fowls: FowlRecord[], memo: Map<string, number>, chain: Set<string>): number => {
  const key = (name || '').trim().toLowerCase();
  if (!key || key === 'foundation stock') return 0;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  if (chain.has(key)) return 0;
  const match = fowls.find((f) => (f.name || '').trim().toLowerCase() === key);
  if (!match) return 0;
  const s = (match.sire || '').trim().toLowerCase();
  const d = (match.dam || '').trim().toLowerCase();
  const hasS = s !== '' && s !== 'foundation stock' && fowls.some((f) => (f.name || '').trim().toLowerCase() === s);
  const hasD = d !== '' && d !== 'foundation stock' && fowls.some((f) => (f.name || '').trim().toLowerCase() === d);
  if (!hasS && !hasD) { memo.set(key, 0); return 0; }
  chain.add(key);
  const gen = Math.max(hasS ? generationOfName(s, fowls, memo, chain) : 0, hasD ? generationOfName(d, fowls, memo, chain) : 0) + 1;
  chain.delete(key);
  memo.set(key, gen);
  return gen;
};

export const generationOf = (f: FowlRecord | null | undefined, fowls: FowlRecord[]): number => {
  if (!f) return 0;
  return generationOfName(f.name, fowls, new Map<string, number>(), new Set<string>());
};

/**
 * @deprecated Deprecated in favor of the breed composition engine (`bloodlineOf` or `getBreedingClassification`).
 * The theoretical backcross formula 100 * (1 - 2^-gen) conflicted with real composition purity
 * (e.g. purebred F1 offspring showing 50% instead of 100%). Purity percentages must come from the composition engine.
 */
export const generationPurity = (gen: number): number => {
  if (gen <= 0) return 100;
  return Math.round((100 * (1 - Math.pow(2, -gen))) * 100) / 100;
};

export const generationInfo = (gen: number): { short: string; label: string; desc: string; tone: string } => {
  if (gen <= 0) return { short: 'F0', label: 'Base Stock', desc: 'Foundation / Starting Stock', tone: 'emerald' };
  if (gen === 1) return { short: 'F1', label: 'F1 · First Cross', desc: 'First Cross', tone: 'sky' };
  if (gen === 2) return { short: 'F2', label: 'F2 · 1st Backcross', desc: '1st Backcross', tone: 'indigo' };
  if (gen === 3) return { short: 'F3', label: 'F3 · 2nd Backcross', desc: '2nd Backcross', tone: 'violet' };
  if (gen === 4) return { short: 'F4', label: 'F4 · 3rd Backcross', desc: '3rd Backcross', tone: 'amber' };
  return { short: `F${gen}`, label: `F${gen} · Stabilized Line`, desc: 'Stabilized Line', tone: 'teal' };
};

/**
 * Purity percentage of a parent, derived from the single-source bloodline composition engine.
 */
export const parentBloodlinePct = (f: FowlRecord, fowls: FowlRecord[] = []): number => bloodlineOf(f, fowls);
/**
 * Dominant (specific) bloodline share of a bird — 0–100.
 *
 * Single source of truth: the bloodline-composition engine (stored jsonb when
 * present, otherwise recomputed from ancestry). The legacy `sire_pct`/`dam_pct`
 * columns are write-only and are never averaged into this number.
 */
export const bloodlineOf = (f: FowlRecord, fowls: FowlRecord[] = []): number => {
  const stats = getFowlBloodlineStats(f, fowls);
  return stats ? stats.specificPct : 0;
};

export * from './win-rate';

/**
 * The app's single win-rate rule: a draw is neither a win nor a loss, so the
 * denominator is *decided* fights only (wins + losses). Every view — dashboard,
 * fight history, per-brother breakdowns, rankings, lineage — must
 * go through this so the same records never show two different percentages.
 */
export const winRateOf = (wins: number, losses: number): number => {
  const decided = wins + losses;
  return decided > 0 ? Math.round((wins / decided) * 100) : 0;
};

export const parseFowlDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const numeric = String(value).replace(/[^0-9]/g, '').slice(0, 8);
  if (numeric.length !== 8) return null;
  const d = new Date(`${numeric.slice(0, 4)}-${numeric.slice(4, 6)}-${numeric.slice(6, 8)}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

export const zeroedToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getAgeParts = (birthdate?: string | null, from?: Date): AgeParts | null => {
  const birth = parseFowlDate(birthdate);
  if (!birth) return null;
  const now = from ? new Date(from) : zeroedToday();
  now.setHours(0, 0, 0, 0);
  let totalDays = Math.floor((now.getTime() - birth.getTime()) / 86400000);
  if (totalDays < 0) totalDays = 0;
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = Math.max(0, years * 12 + months);
  return { years, months, days, totalDays, totalWeeks, totalMonths };
};

export const getAgeLabel = (p: AgeParts): string => {
  if (p.totalDays === 0) return '0 days';
  if (p.years > 0) return `${p.years} yr ${p.months} mo`;
  if (p.months > 0) return `${p.months} mo ${p.days} d`;
  return `${p.days} d`;
};

export const getAgeExact = (p: AgeParts): string => {
  const y = p.years > 0 ? `${p.years} year${p.years === 1 ? '' : 's'}${p.months > 0 || p.days > 0 ? ', ' : ''}` : '';
  const m = p.months > 0 ? `${p.months} month${p.months === 1 ? '' : 's'}${p.days > 0 ? ', ' : ''}` : '';
  return `${y}${m}${p.days} day${p.days === 1 ? '' : 's'}`;
};

export const getAgeMetrics = (p: AgeParts): string =>
  `${p.totalMonths} months · ${p.totalWeeks} weeks · ${p.totalDays} days`;

export const addMonthsToDate = (base: Date, months: number): Date => {
  const d = new Date(base);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
};

export const autoComputeGrowthStage = (monthsValue: number | null, gender: string = 'Rooster') => {
  if (monthsValue === null || isNaN(monthsValue)) return '';
  const female = gender === 'Hen' || gender === 'Pullet';
  if (monthsValue >= 0 && monthsValue <= 5) return 'Chick';
  if (monthsValue >= 6 && monthsValue <= 11) return female ? 'Pullet' : 'Stag';
  if (monthsValue >= 12 && monthsValue <= 24) return female ? 'Hen' : 'Bull Stag';
  if (monthsValue > 24) return female ? 'Hen' : 'Cock';
  return '';
};

export const getDevelopmentStages = (gender?: string): DevelopmentStage[] => {
  const female = gender === 'Hen' || gender === 'Pullet';
  return female
    ? [
        { id: 'Chick', stage: 'Chick', fromMonths: 0, toMonths: 6, icon: '🐣', note: 'Brooding & starter feed phase' },
        { id: 'Pullet', stage: 'Pullet', fromMonths: 6, toMonths: 12, icon: '🐤', note: 'Grower phase — feathering out' },
        { id: 'Hen', stage: 'Hen', fromMonths: 12, toMonths: 24, icon: '🐔', note: 'Mature laying hen' },
        { id: 'Senior Hen', stage: 'Hen', fromMonths: 24, toMonths: Infinity, icon: '🦅', note: 'Senior breeder / retired rotation' },
      ]
    : [
        { id: 'Chick', stage: 'Chick', fromMonths: 0, toMonths: 6, icon: '🐣', note: 'Brooding & starter feed phase' },
        { id: 'Stag', stage: 'Stag', fromMonths: 6, toMonths: 12, icon: '🐤', note: 'Grower phase — conditioning' },
        { id: 'Bull Stag', stage: 'Bull Stag', fromMonths: 12, toMonths: 24, icon: '🐓', note: 'Training & fight preparation' },
        { id: 'Cock', stage: 'Cock', fromMonths: 24, toMonths: Infinity, icon: '⚔️', note: 'Prime fighting cock / proven breeder' },
      ];
};

export const getMilestoneInfo = (birthdate?: string | null, gender?: string, from?: Date): MilestoneInfo | null => {
  const birth = parseFowlDate(birthdate);
  if (!birth) return null;
  const parts = getAgeParts(birthdate, from);
  if (!parts) return null;
  const now = from ? new Date(from) : zeroedToday();
  const stages = getDevelopmentStages(gender);
  const current = stages.filter((s) => parts.totalMonths >= s.fromMonths && parts.totalMonths < s.toMonths).pop() || null;
  const nextStage = stages.find((s) => parts.totalMonths < s.fromMonths) || null;
  const next: RolledMilestoneStage | null = nextStage
    ? { ...nextStage, date: addMonthsToDate(birth, nextStage.fromMonths), daysUntil: Math.ceil((addMonthsToDate(birth, nextStage.fromMonths).getTime() - now.getTime()) / 86400000) }
    : null;
  return { parts, current, stages, next };
};

type SiblingResult = { id: number; name: string; relation: 'Full Sibling' | 'Half-Sibling (Shared Sire)' | 'Half-Sibling (Shared Dam)'; sharedSire: string; sharedDam: string };

export const getSiblingRelations = (fowl: FowlRecord, fowls: FowlRecord[]): SiblingResult[] => {
  const sire = (fowl.sire || '').trim().toLowerCase();
  const dam = (fowl.dam || '').trim().toLowerCase();
  if (!sire || !dam || sire === 'foundation stock' || dam === 'foundation stock') return [];
  return fowls
    .filter((f) => f.id !== fowl.id)
    .map((f) => {
      const fs = (f.sire || '').trim().toLowerCase();
      const fd = (f.dam || '').trim().toLowerCase();
      if (!fs || !fd || fs === 'foundation stock' || fd === 'foundation stock') return null;
      const sharedSire = (f.sire || '').trim();
      const sharedDam = (f.dam || '').trim();
      if (fs === sire && fd === dam) return { id: f.id, name: f.name, relation: 'Full Sibling' as const, sharedSire, sharedDam };
      if (fs === sire) return { id: f.id, name: f.name, relation: 'Half-Sibling (Shared Sire)' as const, sharedSire, sharedDam: '' };
      if (fd === dam) return { id: f.id, name: f.name, relation: 'Half-Sibling (Shared Dam)' as const, sharedSire: '', sharedDam };
      return null;
    })
    .filter((r): r is NonNullable<ReturnType<typeof getSiblingRelations>[number]> => r !== null);
};

export type DateRangePreset = 'today' | '7d' | '30d' | 'month' | '3m' | 'all' | 'custom';
export type DateRangeCustom = { start: string; end: string };

const RANGE_DAY_MS = 24 * 60 * 60 * 1000;
const pad2 = (n: number) => String(n).padStart(2, '0');

export const dateKeyOf = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const dateKeyToMs = (key: string): number => {
  const [y, m, d] = (key || '').split('-').map(Number);
  if (!y || !m || !d) return Date.now();
  return new Date(y, m - 1, d).getTime();
};

export const presetDateKeys = (preset: DateRangePreset, nowMs: number): DateRangeCustom | null => {
  if (preset === 'today') return { start: dateKeyOf(nowMs), end: dateKeyOf(nowMs) };
  if (preset === '7d') return { start: dateKeyOf(nowMs - 7 * RANGE_DAY_MS), end: dateKeyOf(nowMs) };
  if (preset === '30d') return { start: dateKeyOf(nowMs - 30 * RANGE_DAY_MS), end: dateKeyOf(nowMs) };
  if (preset === '3m') return { start: dateKeyOf(nowMs - 90 * RANGE_DAY_MS), end: dateKeyOf(nowMs) };
  if (preset === 'month') {
    const now = new Date(nowMs);
    return { start: dateKeyOf(new Date(now.getFullYear(), now.getMonth(), 1).getTime()), end: dateKeyOf(nowMs) };
  }
  return null;
};

export const formatShortDate = (t: number) => {
  const d = new Date(t);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

export const getArchiveBadgeStyle = (reason?: string) => {
  const r = (reason || 'OTHER').toUpperCase();
  switch (r) {
    case 'SOLD': return { label: 'ARCHIVED · SOLD', bg: 'bg-emerald-700 text-white' };
    case 'TRANSFERRED': return { label: 'ARCHIVED · TRANSFERRED', bg: 'bg-sky-700 text-white' };
    case 'RETIRED': return { label: 'ARCHIVED · RETIRED', bg: 'bg-amber-600 text-white' };
    case 'INACTIVE': return { label: 'ARCHIVED · INACTIVE', bg: 'bg-slate-600 text-white' };
    case 'OTHER': return { label: 'ARCHIVED · OTHER', bg: 'bg-slate-700 text-white' };
    default: return { label: 'ARCHIVED', bg: 'bg-amber-600 text-white' };
  }
};

export const matchSurvivability = (m: { post_fight_condition?: string; outcome?: string }): number | null => {
  const cond = (m.post_fight_condition || '').toLowerCase();
  if (cond.includes('deceased')) return 0;
  if (cond.includes('critical') || cond.includes('severely')) return 30;
  if (cond.includes('fit') || cond.includes('recovered')) return 100;
  const outcome = (m.outcome || '').toLowerCase();
  if (outcome === 'win') return 75;
  if (outcome === 'loss') return 55;
  if (outcome === 'draw') return 65;
  return null;
};

export const calculatePairingStats = (
  fowls: FowlRecord[],
  matchHistory: { fowl_id?: number | null; entry_name?: string; outcome?: string; post_fight_condition?: string }[],
): { all: Map<string, PairingStats>; ranked: PairingStats[] } => {
  const map = new Map<string, PairingStats>();
  fowls.forEach((f) => {
    const sire = (f.sire || '').trim();
    const dam = (f.dam || '').trim();
    if (!sire || !dam || sire.toLowerCase() === 'foundation stock' || dam.toLowerCase() === 'foundation stock') return;
    const key = `${sire.toLowerCase()}|||${dam.toLowerCase()}`;
    let stat = map.get(key);
    if (!stat) {
      stat = { key, sire, dam, members: [], totalFights: 0, wins: 0, losses: 0, draws: 0, decided: 0, winRate: 0, resilienceScore: 0, resilienceSample: 0, casualties: 0, critical: 0, verdictConfidence: 'Low' };
      map.set(key, stat);
    }
    stat.members.push(f);
  });
  map.forEach((stat) => {
    let survivalSum = 0;
    stat.members.forEach((memberFowl) => {
      // Strictly filter matches by fowl_id matching memberFowl.id; orphan matches (fowl_id == null) can never be attributed
      const fowlMatches = matchHistory.filter(
        (matchRecord) => matchRecord.fowl_id != null && Number(matchRecord.fowl_id) === Number(memberFowl.id),
      );
      stat.totalFights += fowlMatches.length;
      stat.wins += fowlMatches.filter((x) => x.outcome && x.outcome.toLowerCase() === 'win').length;
      stat.losses += fowlMatches.filter((x) => x.outcome && x.outcome.toLowerCase() === 'loss').length;
      stat.draws += fowlMatches.filter((x) => x.outcome && x.outcome.toLowerCase() === 'draw').length;
      stat.casualties += fowlMatches.filter((x) => (x.post_fight_condition || '').toLowerCase().includes('deceased')).length;
      stat.critical += fowlMatches.filter((x) => (x.post_fight_condition || '').toLowerCase().includes('critical') || (x.post_fight_condition || '').toLowerCase().includes('severely')).length;
      fowlMatches.forEach((x) => {
        const s = matchSurvivability(x);
        if (s !== null) { survivalSum += s; stat.resilienceSample++; }
      });
    });
    stat.decided = stat.wins + stat.losses;
    stat.winRate = stat.decided > 0
      ? Math.round((stat.wins / stat.decided) * 100)
      : stat.totalFights > 0
      ? Math.round((stat.wins / stat.totalFights) * 100)
      : 0;
    stat.resilienceScore = stat.resilienceSample > 0
      ? Math.round(survivalSum / stat.resilienceSample)
      : 0;
    stat.verdictConfidence = stat.decided >= 10 ? 'High' : stat.decided >= 5 ? 'Medium' : 'Low';
  });
  const ranked = Array.from(map.values())
    .filter((s) => s.totalFights > 0)
    .sort((a, b) => b.winRate - a.winRate || b.decided - a.decided || b.members.length - a.members.length);
  return { all: map, ranked };
};
