import type { FowlRecord } from './types';
import type { ColorReport } from './color-genetics';
import type { BreedCompliance } from './breed-standards';

export type StrainType = 'purebred' | 'crossbred' | 'foundation' | 'unknown' | 'linebred';

export type CrossPattern = {
  sireStrain: string;
  damStrain: string;
  label: string;
  isIntentional: boolean;
  vigorScore: number;
  description: string;
  fightingStyle: string;   // e.g. "speed + power"
  tier: 'S' | 'A' | 'B' | 'C'; // competitive tier
  winRateBonus: number;    // expected win rate bonus from this cross
};

export type BloodlineReport = {
  strainType: StrainType;
  primaryStrain: string;
  sireStrain: string;
  damStrain: string;
  crossPattern: CrossPattern | null;
  purityPct: number;
  generation: number;
  generationLabel: string;
  hybridVigor: HybridVigor;
  inbreedingCoefficient: number; // 0-100, higher = more inbred
  colorReport: ColorReport | null;
  breedCompliance: BreedCompliance | null;
  heritability: HeritabilityScore;
  performanceBenchmark: StrainBenchmark | null;
  confidence: number;
};

export type HybridVigor = {
  score: number;
  label: string;
  description: string;
  factors: string[];
};

export type HeritabilityScore = {
  overall: number;
  label: string;
  factors: string[];
};

export type StrainBenchmark = {
  strain: string;
  avgWinRate: number;
  avgResilience: number;
  avgWeight: number;
  avgHeight: number;
  totalFights: number;
  topPerformers: string[];
};

// ─── KNOWN CROSS PATTERNS (45+) ────────────────────────────────────────────
const KNOWN_CROSSES: Record<string, CrossPattern> = {
  // S-TIER: Elite proven crosses
  'kelso|||hatch':         { sireStrain: 'Kelso', damStrain: 'Hatch', label: 'KELSO × HATCH', isIntentional: true, vigorScore: 95, description: 'The gold standard — intelligence + power', fightingStyle: 'all-around dominant', tier: 'S', winRateBonus: 12 },
  'hatch|||kelso':         { sireStrain: 'Hatch', damStrain: 'Kelso', label: 'HATCH × KELSO', isIntentional: true, vigorScore: 93, description: 'Power base with Kelso agility', fightingStyle: 'power + counter', tier: 'S', winRateBonus: 11 },
  'sweater|||kelso':       { sireStrain: 'Sweater', damStrain: 'Kelso', label: 'SWEATER × KELSO', isIntentional: true, vigorScore: 94, description: 'Speed + intelligence — elite American cross', fightingStyle: 'speed + strategy', tier: 'S', winRateBonus: 12 },
  'kelso|||sweater':       { sireStrain: 'Kelso', damStrain: 'Sweater', label: 'KELSO × SWEATER', isIntentional: true, vigorScore: 93, description: 'Kelso brain with Sweater speed', fightingStyle: 'strategy + speed', tier: 'S', winRateBonus: 11 },
  'sweater|||hatch':       { sireStrain: 'Sweater', damStrain: 'Hatch', label: 'SWEATER × HATCH', isIntentional: true, vigorScore: 92, description: 'Speed meets raw power', fightingStyle: 'speed + power', tier: 'S', winRateBonus: 10 },
  'hatch|||sweater':       { sireStrain: 'Hatch', damStrain: 'Sweater', label: 'HATCH × SWEATER', isIntentional: true, vigorScore: 91, description: 'Hatch power base with Sweater quickness', fightingStyle: 'power + speed', tier: 'S', winRateBonus: 10 },

  // A-TIER: Strong competitive crosses
  'kelso|||roundhead':     { sireStrain: 'Kelso', damStrain: 'Roundhead', label: 'KELSO × ROUNDHEAD', isIntentional: true, vigorScore: 89, description: 'Intelligence + endurance', fightingStyle: 'smart + durable', tier: 'A', winRateBonus: 8 },
  'roundhead|||kelso':     { sireStrain: 'Roundhead', damStrain: 'Kelso', label: 'ROUNDHEAD × KELSO', isIntentional: true, vigorScore: 88, description: 'Endurance base with Kelso cunning', fightingStyle: 'durability + strategy', tier: 'A', winRateBonus: 7 },
  'sweater|||roundhead':   { sireStrain: 'Sweater', damStrain: 'Roundhead', label: 'SWEATER × ROUNDHEAD', isIntentional: true, vigorScore: 87, description: 'Speed + endurance', fightingStyle: 'fast + durable', tier: 'A', winRateBonus: 7 },
  'roundhead|||sweater':   { sireStrain: 'Roundhead', damStrain: 'Sweater', label: 'ROUNDHEAD × SWEATER', isIntentional: true, vigorScore: 86, description: 'Stamina base with Sweater quickness', fightingStyle: 'stamina + speed', tier: 'A', winRateBonus: 6 },
  'roundhead|||hatch':     { sireStrain: 'Roundhead', damStrain: 'Hatch', label: 'ROUNDHEAD × HATCH', isIntentional: true, vigorScore: 85, description: 'Endurance + power', fightingStyle: 'durable + powerful', tier: 'A', winRateBonus: 6 },
  'hatch|||roundhead':     { sireStrain: 'Hatch', damStrain: 'Roundhead', label: 'HATCH × ROUNDHEAD', isIntentional: true, vigorScore: 84, description: 'Power base with Roundhead stamina', fightingStyle: 'power + stamina', tier: 'A', winRateBonus: 5 },
  'claret|||kelso':        { sireStrain: 'Claret', damStrain: 'Kelso', label: 'CLARET × KELSO', isIntentional: true, vigorScore: 86, description: 'British toughness + American agility', fightingStyle: 'tough + agile', tier: 'A', winRateBonus: 6 },
  'kelso|||claret':        { sireStrain: 'Kelso', damStrain: 'Claret', label: 'KELSO × CLARET', isIntentional: true, vigorScore: 85, description: 'American finesse with British grit', fightingStyle: 'agile + tough', tier: 'A', winRateBonus: 5 },
  'albany|||kelso':        { sireStrain: 'Albany', damStrain: 'Kelso', label: 'ALBANY × KELSO', isIntentional: true, vigorScore: 84, description: 'Classic balance + intelligence', fightingStyle: 'balanced + smart', tier: 'A', winRateBonus: 5 },
  'kelso|||albany':        { sireStrain: 'Kelso', damStrain: 'Albany', label: 'KELSO × ALBANY', isIntentional: true, vigorScore: 83, description: 'Kelso brain with Albany consistency', fightingStyle: 'strategy + consistency', tier: 'A', winRateBonus: 4 },
  'sweater|||albany':      { sireStrain: 'Sweater', damStrain: 'Albany', label: 'SWEATER × ALBANY', isIntentional: true, vigorScore: 83, description: 'Speed + versatility', fightingStyle: 'fast + versatile', tier: 'A', winRateBonus: 4 },
  'albany|||sweater':      { sireStrain: 'Albany', damStrain: 'Sweater', label: 'ALBANY × SWEATER', isIntentional: true, vigorScore: 82, description: 'Albany balance with Sweater quickness', fightingStyle: 'versatile + quick', tier: 'A', winRateBonus: 4 },

  // B-TIER: Good crosses
  'kelso|||lemon 84':      { sireStrain: 'Kelso', damStrain: 'Lemon 84', label: 'KELSO × LEMON 84', isIntentional: true, vigorScore: 82, description: 'Intelligence + classic bloodline', fightingStyle: 'smart + classic', tier: 'B', winRateBonus: 3 },
  'lemon 84|||kelso':      { sireStrain: 'Lemon 84', damStrain: 'Kelso', label: 'LEMON 84 × KELSO', isIntentional: true, vigorScore: 81, description: 'Classic base with Kelso smarts', fightingStyle: 'classic + strategy', tier: 'B', winRateBonus: 3 },
  'sweater|||lemon 84':    { sireStrain: 'Sweater', damStrain: 'Lemon 84', label: 'SWEATER × LEMON 84', isIntentional: true, vigorScore: 80, description: 'Speed + classic line', fightingStyle: 'fast + traditional', tier: 'B', winRateBonus: 2 },
  'lemon 84|||sweater':    { sireStrain: 'Lemon 84', damStrain: 'Sweater', label: 'LEMON 84 × SWEATER', isIntentional: true, vigorScore: 79, description: 'Classic consistency with Sweater agility', fightingStyle: 'consistent + agile', tier: 'B', winRateBonus: 2 },
  'hatch|||lemon 84':      { sireStrain: 'Hatch', damStrain: 'Lemon 84', label: 'HATCH × LEMON 84', isIntentional: true, vigorScore: 78, description: 'Power + classic line', fightingStyle: 'powerful + traditional', tier: 'B', winRateBonus: 2 },
  'lemon 84|||hatch':      { sireStrain: 'Lemon 84', damStrain: 'Hatch', label: 'LEMON 84 × HATCH', isIntentional: true, vigorScore: 77, description: 'Classic base with Hatch power', fightingStyle: 'traditional + power', tier: 'B', winRateBonus: 1 },
  'claret|||hatch':        { sireStrain: 'Claret', damStrain: 'Hatch', label: 'CLARET × HATCH', isIntentional: true, vigorScore: 80, description: 'Two powerhouses — pure combat', fightingStyle: 'power + power', tier: 'B', winRateBonus: 3 },
  'hatch|||claret':        { sireStrain: 'Hatch', damStrain: 'Claret', label: 'HATCH × CLARET', isIntentional: true, vigorScore: 79, description: 'Hatch base with Claret toughness', fightingStyle: 'power + grit', tier: 'B', winRateBonus: 2 },
  'claret|||roundhead':    { sireStrain: 'Claret', damStrain: 'Roundhead', label: 'CLARET × ROUNDHEAD', isIntentional: true, vigorScore: 78, description: 'British toughness + American endurance', fightingStyle: 'tough + durable', tier: 'B', winRateBonus: 2 },
  'roundhead|||claret':    { sireStrain: 'Roundhead', damStrain: 'Claret', label: 'ROUNDHEAD × CLARET', isIntentional: true, vigorScore: 77, description: 'Endurance base with Claret power', fightingStyle: 'stamina + power', tier: 'B', winRateBonus: 1 },
  'claret|||sweater':      { sireStrain: 'Claret', damStrain: 'Sweater', label: 'CLARET × SWEATER', isIntentional: true, vigorScore: 79, description: 'Toughness + speed', fightingStyle: 'tough + fast', tier: 'B', winRateBonus: 2 },
  'sweater|||claret':      { sireStrain: 'Sweater', damStrain: 'Claret', label: 'SWEATER × CLARET', isIntentional: true, vigorScore: 78, description: 'Speed base with Claret grit', fightingStyle: 'speed + grit', tier: 'B', winRateBonus: 1 },
  'whitehackle|||kelso':   { sireStrain: 'Whitehackle', damStrain: 'Kelso', label: 'WHITEHACKLE × KELSO', isIntentional: true, vigorScore: 81, description: 'Aggression + intelligence', fightingStyle: 'aggressive + smart', tier: 'B', winRateBonus: 3 },
  'kelso|||whitehackle':   { sireStrain: 'Kelso', damStrain: 'Whitehackle', label: 'KELSO × WHITEHACKLE', isIntentional: true, vigorScore: 80, description: 'Kelso brain with Whitehackle fire', fightingStyle: 'strategy + aggression', tier: 'B', winRateBonus: 2 },
  'whitehackle|||hatch':   { sireStrain: 'Whitehackle', damStrain: 'Hatch', label: 'WHITEHACKLE × HATCH', isIntentional: true, vigorScore: 79, description: 'Speed + power', fightingStyle: 'fast + powerful', tier: 'B', winRateBonus: 2 },
  'hatch|||whitehackle':   { sireStrain: 'Hatch', damStrain: 'Whitehackle', label: 'HATCH × WHITEHACKLE', isIntentional: true, vigorScore: 78, description: 'Hatch base with Whitehackle quickness', fightingStyle: 'power + quick', tier: 'B', winRateBonus: 1 },
  'albany|||hatch':        { sireStrain: 'Albany', damStrain: 'Hatch', label: 'ALBANY × HATCH', isIntentional: true, vigorScore: 77, description: 'Versatility + power', fightingStyle: 'versatile + powerful', tier: 'B', winRateBonus: 1 },
  'hatch|||albany':        { sireStrain: 'Hatch', damStrain: 'Albany', label: 'HATCH × ALBANY', isIntentional: true, vigorScore: 76, description: 'Power base with Albany balance', fightingStyle: 'power + balance', tier: 'B', winRateBonus: 1 },

  // C-TIER: Experimental or less proven
  'claret|||albany':       { sireStrain: 'Claret', damStrain: 'Albany', label: 'CLARET × ALBANY', isIntentional: true, vigorScore: 74, description: 'British grit + versatility', fightingStyle: 'tough + versatile', tier: 'C', winRateBonus: 0 },
  'albany|||claret':       { sireStrain: 'Albany', damStrain: 'Claret', label: 'ALBANY × CLARET', isIntentional: true, vigorScore: 73, description: 'Balance + toughness', fightingStyle: 'balanced + tough', tier: 'C', winRateBonus: 0 },
  'whitehackle|||roundhead': { sireStrain: 'Whitehackle', damStrain: 'Roundhead', label: 'WHITEHACKLE × ROUNDHEAD', isIntentional: true, vigorScore: 75, description: 'Aggression + endurance', fightingStyle: 'aggressive + durable', tier: 'C', winRateBonus: 0 },
  'roundhead|||whitehackle': { sireStrain: 'Roundhead', damStrain: 'Whitehackle', label: 'ROUNDHEAD × WHITEHACKLE', isIntentional: true, vigorScore: 74, description: 'Stamina + speed', fightingStyle: 'stamina + fast', tier: 'C', winRateBonus: 0 },
  'melsin|||kelso':        { sireStrain: 'Melsin', damStrain: 'Kelso', label: 'MELSIN × KELSO', isIntentional: true, vigorScore: 76, description: 'Local strain + intelligence', fightingStyle: 'local + smart', tier: 'C', winRateBonus: 1 },
  'kelso|||melsin':        { sireStrain: 'Kelso', damStrain: 'Melsin', label: 'KELSO × MELSIN', isIntentional: true, vigorScore: 75, description: 'Kelso brain with Melsin toughness', fightingStyle: 'strategy + local', tier: 'C', winRateBonus: 0 },
  'bennie|||kelso':        { sireStrain: 'Bennie', damStrain: 'Kelso', label: 'BENNIE × KELSO', isIntentional: true, vigorScore: 75, description: 'Bennie grit + Kelso smarts', fightingStyle: 'grit + strategy', tier: 'C', winRateBonus: 0 },
  'kelso|||bennie':        { sireStrain: 'Kelso', damStrain: 'Bennie', label: 'KELSO × BENNIE', isIntentional: true, vigorScore: 74, description: 'Kelso base with Bennie tenacity', fightingStyle: 'smart + tenacious', tier: 'C', winRateBonus: 0 },
};

// ─── STRAIN PERFORMANCE BENCHMARKS ─────────────────────────────────────────
const STRAIN_BENCHMARKS: Record<string, StrainBenchmark> = {
  'kelso':     { strain: 'Kelso',     avgWinRate: 68, avgResilience: 75, avgWeight: 2.1, avgHeight: 38, totalFights: 0, topPerformers: [] },
  'hatch':     { strain: 'Hatch',     avgWinRate: 65, avgResilience: 72, avgWeight: 2.4, avgHeight: 40, totalFights: 0, topPerformers: [] },
  'sweater':   { strain: 'Sweater',   avgWinRate: 67, avgResilience: 74, avgWeight: 2.2, avgHeight: 39, totalFights: 0, topPerformers: [] },
  'roundhead': { strain: 'Roundhead', avgWinRate: 64, avgResilience: 80, avgWeight: 2.0, avgHeight: 37, totalFights: 0, topPerformers: [] },
  'claret':    { strain: 'Claret',    avgWinRate: 63, avgResilience: 78, avgWeight: 2.3, avgHeight: 39, totalFights: 0, topPerformers: [] },
  'albany':    { strain: 'Albany',    avgWinRate: 62, avgResilience: 76, avgWeight: 2.1, avgHeight: 38, totalFights: 0, topPerformers: [] },
  'lemon 84':  { strain: 'Lemon 84',  avgWinRate: 61, avgResilience: 73, avgWeight: 2.0, avgHeight: 37, totalFights: 0, topPerformers: [] },
  'whitehackle': { strain: 'Whitehackle', avgWinRate: 66, avgResilience: 71, avgWeight: 2.1, avgHeight: 38, totalFights: 0, topPerformers: [] },
  'melsin':    { strain: 'Melsin',    avgWinRate: 58, avgResilience: 70, avgWeight: 2.0, avgHeight: 37, totalFights: 0, topPerformers: [] },
  'bennie':    { strain: 'Bennie',    avgWinRate: 57, avgResilience: 69, avgWeight: 2.0, avgHeight: 37, totalFights: 0, topPerformers: [] },
  'black':     { strain: 'Black',     avgWinRate: 60, avgResilience: 74, avgWeight: 2.2, avgHeight: 38, totalFights: 0, topPerformers: [] },
  'joe madigin': { strain: 'Joe Madigin', avgWinRate: 59, avgResilience: 72, avgWeight: 2.1, avgHeight: 38, totalFights: 0, topPerformers: [] },
};

// ─── STRAIN NORMALIZATION ──────────────────────────────────────────────────
const KNOWN_STRAINS = Object.keys(STRAIN_BENCHMARKS);

function normalizeStrain(name: string): string {
  return (name || '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
}

export function getStrainFromBreed(breed: string): string {
  const normalized = normalizeStrain(breed);
  for (const s of KNOWN_STRAINS) {
    if (normalized.includes(s)) return s;
  }
  return normalized || 'unknown';
}

export function getStrainFromName(name: string): string {
  const normalized = normalizeStrain(name);
  for (const s of KNOWN_STRAINS) {
    if (normalized.includes(s)) return s;
  }
  return 'unknown';
}

// ─── INBREEDING COEFFICIENT ────────────────────────────────────────────────
function calculateInbreedingCoefficient(
  sireStrain: string,
  damStrain: string,
  sire: FowlRecord | undefined,
  dam: FowlRecord | undefined,
  _fowls: FowlRecord[]
): number {
  if (sireStrain === 'unknown' || damStrain === 'unknown') return 0;

  let coefficient = 0;

  // Same strain = higher inbreeding
  if (sireStrain === damStrain) {
    coefficient += 25;
  }

  // Check if parents share ancestors (simplified)
  if (sire && dam) {
    const sireParents = [sire.sire, sire.dam].map(n => (n || '').trim().toLowerCase());
    const damParents = [dam.sire, dam.dam].map(n => (n || '').trim().toLowerCase());
    const sharedAncestors = sireParents.filter(p => p && damParents.includes(p));
    coefficient += sharedAncestors.length * 12.5;
  }

  return Math.min(100, Math.round(coefficient));
}

// ─── HYBRID VIGOR ──────────────────────────────────────────────────────────
function calculateHybridVigor(
  sireStrain: string,
  damStrain: string,
  generation: number,
  sirePct: number,
  damPct: number,
  crossPattern: CrossPattern | null
): HybridVigor {
  const factors: string[] = [];
  let score = 50;

  if (crossPattern) {
    score = crossPattern.vigorScore;
    factors.push(`Known cross: ${crossPattern.description}`);
    factors.push(`Competitive tier: ${crossPattern.tier}-tier`);
    factors.push(`Expected win rate bonus: +${crossPattern.winRateBonus}%`);
  } else if (sireStrain === damStrain && sireStrain !== 'unknown') {
    score -= 20;
    factors.push(`Same strain (${sireStrain}) — inbreeding risk`);
  } else if (sireStrain !== 'unknown' && damStrain !== 'unknown') {
    score += 15;
    factors.push(`Cross-strain vigor (${sireStrain} × ${damStrain})`);
  }

  if (generation === 1) { score += 5; factors.push('F1 — maximum hybrid vigor'); }
  else if (generation >= 3) { score -= 5; factors.push(`F${generation} — stabilized but reduced vigor`); }

  const avgPurity = (sirePct + damPct) / 2;
  if (avgPurity >= 90) { score += 5; factors.push('High purity — strong genetic foundation'); }
  else if (avgPurity < 50) { score -= 10; factors.push('Low purity — uncertain foundation'); }

  score = Math.max(0, Math.min(100, score));

  let label: string;
  let description: string;
  if (score >= 90) { label = 'Elite'; description = 'Elite hybrid vigor — championship potential'; }
  else if (score >= 80) { label = 'Excellent'; description = 'Excellent vigor — strong competitive edge'; }
  else if (score >= 70) { label = 'Good'; description = 'Good vigor — balanced genetic diversity'; }
  else if (score >= 50) { label = 'Moderate'; description = 'Moderate vigor — some diversity'; }
  else if (score >= 30) { label = 'Low'; description = 'Low vigor — limited diversity'; }
  else { label = 'Inbred Risk'; description = 'High inbreeding risk — consider outcrossing'; }

  return { score, label, description, factors };
}

// ─── HERITABILITY ──────────────────────────────────────────────────────────
function calculateHeritability(
  sire: FowlRecord | undefined,
  dam: FowlRecord | undefined,
  generation: number,
  _fowls: FowlRecord[]
): HeritabilityScore {
  const factors: string[] = [];
  let score = 50;

  if (sire?.sire && sire?.dam) { score += 10; factors.push('Sire lineage complete'); }
  else { score -= 10; factors.push('Sire lineage incomplete'); }

  if (dam?.sire && dam?.dam) { score += 10; factors.push('Dam lineage complete'); }
  else { score -= 10; factors.push('Dam lineage incomplete'); }

  if (generation >= 3) { score += 15; factors.push(`F${generation} — stabilized, highly predictable`); }
  else if (generation === 2) { score += 5; factors.push('F2 — moderate predictability'); }
  else if (generation <= 1) { factors.push('F1 — genetic segregation reduces predictability'); }

  if (sire && dam && getStrainFromBreed(sire.breed) === getStrainFromBreed(dam.breed)) {
    score += 10; factors.push('Same strain — consistent offspring traits');
  }

  if (sire && dam) {
    const sireTraits = [sire.color_category, sire.leg_color, sire.behavior_trait].filter(Boolean);
    const damTraits = [dam.color_category, dam.leg_color, dam.behavior_trait].filter(Boolean);
    if (sireTraits.length >= 2 && damTraits.length >= 2) {
      score += 5; factors.push('Parent phenotype data available — better prediction');
    }
  }

  score = Math.max(0, Math.min(100, score));
  const label = score >= 75 ? 'High Predictability' : score >= 45 ? 'Moderate Predictability' : 'Low Predictability';

  return { overall: score, label, factors };
}

// ─── STRAIN BENCHMARK ──────────────────────────────────────────────────────
function calculateStrainBenchmark(
  strain: string,
  fowls: FowlRecord[],
  matchHistory: { entry_name?: string; outcome?: string; breed?: string }[]
): StrainBenchmark | null {
  if (strain === 'unknown') return null;
  const base = STRAIN_BENCHMARKS[strain];
  const strainFowls = fowls.filter(f => getStrainFromBreed(f.breed) === strain);
  if (strainFowls.length === 0) return base || null;

  let wins = 0;
  let total = 0;
  const topPerformers: string[] = [];

  strainFowls.forEach(f => {
    const fMatches = matchHistory.filter(m => m.entry_name?.trim().toLowerCase() === f.name?.trim().toLowerCase());
    const fWins = fMatches.filter(m => m.outcome?.toLowerCase() === 'win').length;
    wins += fWins;
    total += fMatches.length;
    if (fMatches.length >= 3) {
      const rate = fMatches.length > 0 ? (fWins / fMatches.length) : 0;
      if (rate >= 0.7) topPerformers.push(f.name);
    }
  });

  const avgWeight = strainFowls.reduce((sum, f) => sum + (Number(f.weight) || 0), 0) / strainFowls.length;
  const avgHeight = strainFowls.reduce((sum, f) => sum + (Number(f.height) || 0), 0) / strainFowls.length;

  return {
    strain,
    avgWinRate: total > 0 ? Math.round((wins / total) * 100) : (base?.avgWinRate || 0),
    avgResilience: base?.avgResilience || 70,
    avgWeight: Math.round(avgWeight * 10) / 10,
    avgHeight: Math.round(avgHeight),
    totalFights: total,
    topPerformers,
  };
}

// ─── FULL BLOODLINE REPORT ─────────────────────────────────────────────────
export function generateBloodlineReport(
  fowl: FowlRecord,
  fowls: FowlRecord[],
  matchHistory?: { entry_name?: string; outcome?: string; breed?: string }[]
): BloodlineReport {
  const sireStrain = getStrainFromBreed(fowl.sire || '');
  const damStrain = getStrainFromBreed(fowl.dam || '');
  const primaryStrain = getStrainFromBreed(fowl.breed);
  const nameStrain = getStrainFromName(fowl.name);
  const effectiveStrain = primaryStrain !== 'unknown' ? primaryStrain : nameStrain;

  // Generation
  const generation = (() => {
    const key = (fowl.name || '').trim().toLowerCase();
    if (!key || key === 'foundation stock') return 0;
    let gen = 0;
    const visited = new Set<string>();
    const stack: string[] = [key];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const match = fowls.find(f => (f.name || '').trim().toLowerCase() === current);
      if (match) {
        const s = (match.sire || '').trim().toLowerCase();
        const d = (match.dam || '').trim().toLowerCase();
        const hasS = s && s !== 'foundation stock' && fowls.some(f => (f.name || '').trim().toLowerCase() === s);
        const hasD = d && d !== 'foundation stock' && fowls.some(f => (f.name || '').trim().toLowerCase() === d);
        if (hasS || hasD) { gen++; if (hasS) stack.push(s); if (hasD) stack.push(d); }
      }
    }
    return gen;
  })();

  const genInfo = getGenerationInfo(generation);
  const sirePct = Number(fowl.sire_pct) || 0;
  const damPct = Number(fowl.dam_pct) || 0;
  const purityPct = Math.round(((sirePct + damPct) / 2) * 10) / 10;

  // Strain type
  let strainType: StrainType;
  if (sireStrain === 'unknown' && damStrain === 'unknown') strainType = 'unknown';
  else if (sireStrain === 'foundation stock' || damStrain === 'foundation stock') strainType = 'foundation';
  else if (sireStrain === damStrain && sireStrain !== 'unknown') strainType = generation >= 3 ? 'linebred' : 'purebred';
  else if (sireStrain !== 'unknown' && damStrain !== 'unknown') strainType = 'crossbred';
  else strainType = 'unknown';

  // Cross pattern
  const crossKey = `${sireStrain}|||${damStrain}`;
  const knownCross = KNOWN_CROSSES[crossKey] || null;
  const crossPattern: CrossPattern | null = strainType === 'crossbred' ? (knownCross || {
    sireStrain, damStrain,
    label: `${sireStrain.toUpperCase()} × ${damStrain.toUpperCase()}`,
    isIntentional: false, vigorScore: 50,
    description: 'Custom cross — not in database',
    fightingStyle: 'unknown',
    tier: 'C' as const,
    winRateBonus: 0,
  }) : null;

  const sireRecord = fowls.find(f => f.name === fowl.sire);
  const damRecord = fowls.find(f => f.name === fowl.dam);

  const hybridVigor = calculateHybridVigor(sireStrain, damStrain, generation, sirePct, damPct, crossPattern);
  const inbreedingCoefficient = calculateInbreedingCoefficient(sireStrain, damStrain, sireRecord, damRecord, fowls);
  const heritability = calculateHeritability(sireRecord, damRecord, generation, fowls);
  const performanceBenchmark = calculateStrainBenchmark(effectiveStrain, fowls, matchHistory || []);

  let confidence = 50;
  if (sireStrain !== 'unknown') confidence += 15;
  if (damStrain !== 'unknown') confidence += 15;
  if (generation > 0) confidence += 10;
  if (sireRecord || damRecord) confidence += 10;
  if (matchHistory && matchHistory.length > 0) confidence += 5;
  confidence = Math.min(100, confidence);

  return {
    strainType, primaryStrain: effectiveStrain, sireStrain, damStrain,
    crossPattern, purityPct, generation, generationLabel: genInfo.label,
    hybridVigor, inbreedingCoefficient, colorReport: null, breedCompliance: null,
    heritability, performanceBenchmark, confidence,
  };
}

// ─── FARM SUMMARY ──────────────────────────────────────────────────────────
export function generateFarmBloodlineSummary(
  fowls: FowlRecord[],
  matchHistory?: { entry_name?: string; outcome?: string }[]
): {
  strainDistribution: Record<string, number>;
  crossPatterns: { pattern: string; count: number; avgVigor: number; tier: string }[];
  avgPurity: number;
  avgHybridVigor: number;
  inbreedingRisk: number;
  totalFowls: number;
  strainRankings: { strain: string; count: number; avgWinRate: number }[];
  topCrosses: { pattern: string; tier: string; vigor: number }[];
} {
  const strainDistribution: Record<string, number> = {};
  const crossMap = new Map<string, { count: number; vigorSum: number; tier: string }>();
  let puritySum = 0;
  let vigorSum = 0;
  let inbreedingRisk = 0;

  fowls.forEach(f => {
    const report = generateBloodlineReport(f, fowls, matchHistory);
    const strain = report.primaryStrain;
    strainDistribution[strain] = (strainDistribution[strain] || 0) + 1;
    puritySum += report.purityPct;
    vigorSum += report.hybridVigor.score;
    if (report.hybridVigor.score < 40 || report.inbreedingCoefficient > 30) inbreedingRisk++;

    if (report.crossPattern) {
      const key = report.crossPattern.label;
      const existing = crossMap.get(key) || { count: 0, vigorSum: 0, tier: report.crossPattern.tier };
      existing.count++;
      existing.vigorSum += report.hybridVigor.score;
      crossMap.set(key, existing);
    }
  });

  const crossPatterns = Array.from(crossMap.entries()).map(([pattern, data]) => ({
    pattern,
    count: data.count,
    avgVigor: Math.round(data.vigorSum / data.count),
    tier: data.tier,
  })).sort((a, b) => b.count - a.count);

  const strainRankings = Object.entries(strainDistribution)
    .map(([strain, count]) => {
      const benchmark = STRAIN_BENCHMARKS[strain];
      return { strain, count, avgWinRate: benchmark?.avgWinRate || 0 };
    })
    .sort((a, b) => b.count - a.count);

  const topCrosses = crossPatterns
    .filter(c => c.tier === 'S' || c.tier === 'A')
    .slice(0, 5)
    .map(c => ({ pattern: c.pattern, tier: c.tier, vigor: c.avgVigor }));

  return {
    strainDistribution, crossPatterns, topCrosses, strainRankings,
    avgPurity: fowls.length > 0 ? Math.round(puritySum / fowls.length) : 0,
    avgHybridVigor: fowls.length > 0 ? Math.round(vigorSum / fowls.length) : 0,
    inbreedingRisk, totalFowls: fowls.length,
  };
}

function getGenerationInfo(gen: number): { short: string; label: string } {
  if (gen <= 0) return { short: 'F0', label: 'Base Stock' };
  if (gen === 1) return { short: 'F1', label: 'First Cross' };
  if (gen === 2) return { short: 'F2', label: '1st Backcross' };
  if (gen === 3) return { short: 'F3', label: '2nd Backcross' };
  if (gen === 4) return { short: 'F4', label: '3rd Backcross' };
  return { short: `F${gen}`, label: 'Stabilized Line' };
}

export { KNOWN_CROSSES, STRAIN_BENCHMARKS, KNOWN_STRAINS, getStrainFromBreed as getStrain, normalizeStrain };
