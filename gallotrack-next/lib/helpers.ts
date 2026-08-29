import type { FowlRecord, AgeParts, DevelopmentStage, RolledMilestoneStage, MilestoneInfo, PairingStats } from './types';

export const POST_FIGHT_CONDITIONS = [
  { value: 'Fit / Recovered', icon: '🟢', short: 'FIT', desc: 'Pulled through cleanly' },
  { value: 'Severely Injured / Critical', icon: '🟠', short: 'CRITICAL', desc: 'Badly hurt after the fight' },
  { value: 'Deceased (Died from injuries)', icon: '💀', short: 'DECEASED', desc: 'Died from fight injuries' },
] as const;

export const STRAIN_LIST = ['Sweater', 'Hatch', 'Roundhead', 'Kelso', 'Lemon 84', 'Albany', 'Claret', 'Whitehackle', 'Black', 'Melsin', 'Bennie', 'Joe Madigin'];

export const LEG_COLOR_LIST = ['Yellow', 'White', 'Green / Slate', 'Willow', 'Black'];

export const DATE_RANGES: { id: '7d' | '30d' | 'month' | '3m' | 'all'; label: string }[] = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'month', label: 'This Month' },
  { id: '3m', label: 'Last 3 Months' },
  { id: 'all', label: 'All Time' },
];

export const isMale = (g?: string) => !!g && ['rooster', 'cock', 'stag', 'male'].includes(g.trim().toLowerCase());
export const isFemale = (g?: string) => !!g && ['hen', 'pullet', 'female'].includes(g.trim().toLowerCase());

export const cleanPct = (v: unknown): number => {
  const n = Number(v);
  return !isNaN(n) && n > 0 ? Math.min(n, 100) : 0;
};

export const isFoundationStock = (name: string): boolean => (name || '').trim().toLowerCase() === 'foundation stock';

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

export const parentBloodlinePct = (f: FowlRecord, fowls: FowlRecord[]): number => generationPurity(generationOf(f, fowls));
export const bloodlineOf = (f: FowlRecord): number => Math.round(((cleanPct(f.sire_pct) + cleanPct(f.dam_pct)) / 2) * 10) / 10;

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

export const formatShortDate = (t: number) => {
  const d = new Date(t);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

export const getArchiveBadgeStyle = (reason?: string) => {
  const r = (reason || 'RETIRED').toUpperCase();
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
  if (cond.includes('critical') || cond.includes('severely')) return 40;
  if (cond.includes('fit') || cond.includes('recovered')) return 100;
  const outcome = (m.outcome || '').toLowerCase();
  if (outcome === 'win') return 90;
  if (outcome === 'loss') return 70;
  if (outcome === 'draw') return 80;
  return null;
};

export const calculatePairingStats = (fowls: FowlRecord[], matchHistory: { entry_name?: string; outcome?: string; post_fight_condition?: string }[]): { all: Map<string, PairingStats>; ranked: PairingStats[] } => {
  const map = new Map<string, PairingStats>();
  fowls.forEach((f) => {
    const sire = (f.sire || '').trim();
    const dam = (f.dam || '').trim();
    if (!sire || !dam || sire.toLowerCase() === 'foundation stock' || dam.toLowerCase() === 'foundation stock') return;
    const key = `${sire.toLowerCase()}|||${dam.toLowerCase()}`;
    let stat = map.get(key);
    if (!stat) {
      stat = { key, sire, dam, members: [], totalFights: 0, wins: 0, losses: 0, draws: 0, decided: 0, winRate: 0, resilienceScore: 0, resilienceSample: 0, casualties: 0, critical: 0 };
      map.set(key, stat);
    }
    stat.members.push(f);
  });
  map.forEach((stat) => {
    let survivalSum = 0;
    stat.members.forEach((m) => {
      const fowlMatches = matchHistory.filter((match) => match.entry_name?.trim().toLowerCase() === m.name?.trim().toLowerCase());
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
  });
  const ranked = Array.from(map.values())
    .filter((s) => s.totalFights > 0)
    .sort((a, b) => b.winRate - a.winRate || b.decided - a.decided || b.members.length - a.members.length);
  return { all: map, ranked };
};
