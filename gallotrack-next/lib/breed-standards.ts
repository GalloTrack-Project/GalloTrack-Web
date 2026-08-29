// Breed standard compliance for gamefowl
// Compares fowl physical traits against known breed standards with scoring

export type BreedStandard = {
  name: string;
  strain: string;
  weightRange: { min: number; max: number; ideal: number };
  heightRange: { min: number; max: number; ideal: number };
  legColors: string[];
  plumageColors: string[];
  eyeColors: string[];
  fightingStyle: string;
  temperament: string;
  origin: string;
  notes: string;
};

export type BreedCompliance = {
  breed: string;
  standards: BreedStandard[];
  matchedStandard: BreedStandard | null;
  weightCompliance: { actual: number; expected: string; status: 'within' | 'underweight' | 'overweight' | 'unknown'; deviation: number };
  heightCompliance: { actual: number; expected: string; status: 'within' | 'short' | 'tall' | 'unknown'; deviation: number };
  legColorCompliance: { actual: string; expected: string[]; status: 'matches' | 'uncommon' | 'unknown' };
  plumageCompliance: { actual: string; expected: string[]; status: 'matches' | 'uncommon' | 'unknown' };
  overallScore: number;
  complianceGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  notes: string[];
  recommendations: string[];
};

// ─── BREED STANDARDS DATABASE ──────────────────────────────────────────────
const BREED_STANDARDS: BreedStandard[] = [
  {
    name: 'American Kelso',
    strain: 'kelso',
    weightRange: { min: 1.8, max: 2.5, ideal: 2.1 },
    heightRange: { min: 35, max: 42, ideal: 38 },
    legColors: ['Yellow', 'White', 'Willow'],
    plumageColors: ['Red', 'Spangled', 'Yellow-Red', 'Duckwing'],
    eyeColors: ['Orange', 'Red'],
    fightingStyle: 'All-around — intelligence, speed, and power',
    temperament: 'Alert, intelligent, versatile',
    origin: 'USA (Texas) — Walter Kelso bloodline',
    notes: 'The most versatile gamefowl. Known for exceptional intelligence and adaptability to any fighting style.',
  },
  {
    name: 'Hatch',
    strain: 'hatch',
    weightRange: { min: 2.0, max: 2.8, ideal: 2.4 },
    heightRange: { min: 36, max: 44, ideal: 40 },
    legColors: ['Yellow', 'White', 'Green / Slate'],
    plumageColors: ['Red', 'Black', 'White', 'Spangled'],
    eyeColors: ['Orange', 'Yellow'],
    fightingStyle: 'Power — hard-hitting, aggressive forward pressure',
    temperament: 'Aggressive, powerful, relentless',
    origin: 'USA (Alabama) — John Hatch bloodline',
    notes: 'Powerhouse breed. Larger frame with strong bone structure. Dominates in close-range combat.',
  },
  {
    name: 'Roundhead',
    strain: 'roundhead',
    weightRange: { min: 1.7, max: 2.4, ideal: 2.0 },
    heightRange: { min: 34, max: 41, ideal: 37 },
    legColors: ['Yellow', 'White', 'Green / Slate'],
    plumageColors: ['Black', 'Red', 'Spangled', 'Duckwing'],
    eyeColors: ['Orange', 'Red'],
    fightingStyle: 'Endurance — smart, durable, outlasts opponents',
    temperament: 'Smart, patient, excellent stamina',
    origin: 'USA — Roundhead bloodline',
    notes: 'Endurance champion. Known for outlasting opponents with intelligent fighting and superior conditioning.',
  },
  {
    name: 'Sweater',
    strain: 'sweater',
    weightRange: { min: 1.8, max: 2.6, ideal: 2.2 },
    heightRange: { min: 35, max: 43, ideal: 39 },
    legColors: ['Yellow', 'White', 'Green / Slate'],
    plumageColors: ['Red', 'Spangled', 'Yellow-Red'],
    eyeColors: ['Orange', 'Red'],
    fightingStyle: 'Speed — lightning-fast strikes and evasive movement',
    temperament: 'Quick, aggressive, athletic',
    origin: 'USA — Sweater bloodline',
    notes: 'Speed demon. Athletic build with quick reflexes. Excels in speed-based fighting styles.',
  },
  {
    name: 'Lemon 84',
    strain: 'lemon 84',
    weightRange: { min: 1.7, max: 2.4, ideal: 2.0 },
    heightRange: { min: 34, max: 41, ideal: 37 },
    legColors: ['Yellow', 'White'],
    plumageColors: ['Yellow', 'Buff', 'Red', 'Lemon'],
    eyeColors: ['Orange', 'Yellow'],
    fightingStyle: 'Balanced — consistent performer with good all-around skills',
    temperament: 'Reliable, consistent, adaptable',
    origin: 'USA — Lemon 84 bloodline',
    notes: 'Classic strain. Reliable and consistent performer. Medium build with predictable traits.',
  },
  {
    name: 'Albany',
    strain: 'albany',
    weightRange: { min: 1.8, max: 2.5, ideal: 2.1 },
    heightRange: { min: 35, max: 42, ideal: 38 },
    legColors: ['Yellow', 'White', 'Green / Slate'],
    plumageColors: ['Black', 'Red', 'Spangled', 'Duckwing'],
    eyeColors: ['Orange', 'Red'],
    fightingStyle: 'Versatile — adaptable to any fighting situation',
    temperament: 'Versatile, balanced, intelligent',
    origin: 'USA — Albany bloodline',
    notes: 'The all-rounder. Balanced build for various fighting styles. Excellent crossbreeding foundation.',
  },
  {
    name: 'Claret',
    strain: 'claret',
    weightRange: { min: 2.0, max: 2.7, ideal: 2.3 },
    heightRange: { min: 36, max: 43, ideal: 39 },
    legColors: ['White', 'Yellow', 'Green / Slate'],
    plumageColors: ['Red', 'Claret', 'Dark Red', 'Brick Red'],
    eyeColors: ['Orange', 'Red'],
    fightingStyle: 'Power + toughness — British grit meets combat',
    temperament: 'Tough, powerful, determined',
    origin: 'England — Claret bloodline',
    notes: 'British import. Powerful and tough. Larger frame with strong fighting instinct and never-give-up attitude.',
  },
  {
    name: 'Whitehackle',
    strain: 'whitehackle',
    weightRange: { min: 1.8, max: 2.5, ideal: 2.1 },
    heightRange: { min: 35, max: 42, ideal: 38 },
    legColors: ['White', 'Yellow'],
    plumageColors: ['White', 'Spangled', 'Red', 'White-Hackled'],
    eyeColors: ['Orange', 'Yellow'],
    fightingStyle: 'Speed + aggression — fast and fierce',
    temperament: 'Aggressive, fast, fiery',
    origin: 'USA — Whitehackle bloodline',
    notes: 'Speed and aggression combined. Light to medium build with devastating speed advantage.',
  },
  {
    name: 'Melsin',
    strain: 'melsin',
    weightRange: { min: 1.8, max: 2.5, ideal: 2.0 },
    heightRange: { min: 34, max: 41, ideal: 37 },
    legColors: ['Yellow', 'White', 'Green / Slate'],
    plumageColors: ['Red', 'Black', 'Spangled'],
    eyeColors: ['Orange', 'Red'],
    fightingStyle: 'Local fighter — adapted to local conditions',
    temperament: 'Hardy, adaptable, local champion',
    origin: 'Philippines — Local strain',
    notes: 'Filipino-bred strain. Hardy and adapted to tropical conditions. Popular in local derbies.',
  },
  {
    name: 'Bennie',
    strain: 'bennie',
    weightRange: { min: 1.8, max: 2.5, ideal: 2.0 },
    heightRange: { min: 34, max: 41, ideal: 37 },
    legColors: ['Yellow', 'White'],
    plumageColors: ['Red', 'Black', 'Spangled'],
    eyeColors: ['Orange', 'Red'],
    fightingStyle: 'Gritty fighter — tenacious and hard to finish',
    temperament: 'Tenacious, tough, determined',
    origin: 'USA — Bennie bloodline',
    notes: 'Known for tenacity and fighting spirit. Hard to finish in a fight.',
  },
  {
    name: 'Joe Madigin',
    strain: 'joe madigin',
    weightRange: { min: 1.8, max: 2.5, ideal: 2.1 },
    heightRange: { min: 34, max: 42, ideal: 38 },
    legColors: ['Yellow', 'White', 'Green / Slate'],
    plumageColors: ['Red', 'Spangled', 'Black'],
    eyeColors: ['Orange', 'Red'],
    fightingStyle: 'Smart fighter — tactical and adaptive',
    temperament: 'Intelligent, tactical, adaptive',
    origin: 'USA — Joe Madigin bloodline',
    notes: 'Tactical fighter. Known for reading opponents and adapting mid-fight.',
  },
  {
    name: 'Black',
    strain: 'black',
    weightRange: { min: 1.9, max: 2.6, ideal: 2.2 },
    heightRange: { min: 35, max: 43, ideal: 38 },
    legColors: ['Black', 'Green / Slate', 'Willow'],
    plumageColors: ['Black', 'Dark Red'],
    eyeColors: ['Orange', 'Red', 'Dark'],
    fightingStyle: 'Power fighter — intimidating presence',
    temperament: 'Intimidating, powerful, dominant',
    origin: 'Various — Black phenotype strains',
    notes: 'Dark phenotype strain. Intimidating appearance with powerful fighting style.',
  },
];

function findMatchingStandards(strain: string): BreedStandard[] {
  const normalized = (strain || '').trim().toLowerCase();
  return BREED_STANDARDS.filter(s => normalized.includes(s.strain));
}

function checkWeightCompliance(weight: number | string, standard: BreedStandard | null): BreedCompliance['weightCompliance'] {
  if (!standard) return { actual: Number(weight) || 0, expected: 'No standard', status: 'unknown', deviation: 0 };
  const w = Number(weight) || 0;
  if (w === 0) return { actual: 0, expected: `${standard.weightRange.min}–${standard.weightRange.max}kg (ideal: ${standard.weightRange.ideal}kg)`, status: 'unknown', deviation: 0 };
  const deviation = Math.round(((w - standard.weightRange.ideal) / standard.weightRange.ideal) * 100);
  if (w >= standard.weightRange.min && w <= standard.weightRange.max) {
    return { actual: w, expected: `${standard.weightRange.min}–${standard.weightRange.max}kg`, status: 'within', deviation };
  }
  return {
    actual: w,
    expected: `${standard.weightRange.min}–${standard.weightRange.max}kg`,
    status: w < standard.weightRange.min ? 'underweight' : 'overweight',
    deviation,
  };
}

function checkHeightCompliance(height: number | string, standard: BreedStandard | null): BreedCompliance['heightCompliance'] {
  if (!standard) return { actual: Number(height) || 0, expected: 'No standard', status: 'unknown', deviation: 0 };
  const h = Number(height) || 0;
  if (h === 0) return { actual: 0, expected: `${standard.heightRange.min}–${standard.heightRange.max}cm (ideal: ${standard.heightRange.ideal}cm)`, status: 'unknown', deviation: 0 };
  const deviation = Math.round(((h - standard.heightRange.ideal) / standard.heightRange.ideal) * 100);
  if (h >= standard.heightRange.min && h <= standard.heightRange.max) {
    return { actual: h, expected: `${standard.heightRange.min}–${standard.heightRange.max}cm`, status: 'within', deviation };
  }
  return {
    actual: h,
    expected: `${standard.heightRange.min}–${standard.heightRange.max}cm`,
    status: h < standard.heightRange.min ? 'short' : 'tall',
    deviation,
  };
}

function checkLegColorCompliance(legColor: string, standard: BreedStandard | null): BreedCompliance['legColorCompliance'] {
  if (!standard) return { actual: legColor || 'N/A', expected: [], status: 'unknown' };
  const normalized = (legColor || '').trim().toLowerCase();
  if (!normalized) return { actual: 'N/A', expected: standard.legColors, status: 'unknown' };
  const matches = standard.legColors.some(c => c.toLowerCase() === normalized);
  return { actual: legColor, expected: standard.legColors, status: matches ? 'matches' : 'uncommon' };
}

function checkPlumageCompliance(colorCategory: string, standard: BreedStandard | null): BreedCompliance['plumageCompliance'] {
  if (!standard) return { actual: colorCategory || 'N/A', expected: [], status: 'unknown' };
  const normalized = (colorCategory || '').trim().toLowerCase();
  if (!normalized) return { actual: 'N/A', expected: standard.plumageColors, status: 'unknown' };
  const matches = standard.plumageColors.some(c => c.toLowerCase() === normalized);
  return { actual: colorCategory, expected: standard.plumageColors, status: matches ? 'matches' : 'uncommon' };
}

function getGrade(score: number): BreedCompliance['complianceGrade'] {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// ─── FULL BREED COMPLIANCE REPORT ──────────────────────────────────────────
export function generateBreedCompliance(
  breed: string,
  weight: string | number,
  height: string | number,
  legColor: string,
  colorCategory: string
): BreedCompliance {
  const standards = findMatchingStandards(breed);
  const matchedStandard = standards[0] || null;

  const weightComp = checkWeightCompliance(weight, matchedStandard);
  const heightComp = checkHeightCompliance(height, matchedStandard);
  const legComp = checkLegColorCompliance(legColor, matchedStandard);
  const plumageComp = checkPlumageCompliance(colorCategory, matchedStandard);

  const notes: string[] = [];
  const recommendations: string[] = [];
  let score = 50;

  if (matchedStandard) {
    notes.push(`Matched: ${matchedStandard.name} (${matchedStandard.origin})`);
    notes.push(`Fighting style: ${matchedStandard.fightingStyle}`);
    notes.push(matchedStandard.notes);

    // Weight scoring
    if (weightComp.status === 'within') {
      score += 15;
      notes.push(`Weight ${weightComp.actual}kg — within standard (${Math.abs(weightComp.deviation)}% from ideal)`);
    } else if (weightComp.status !== 'unknown') {
      score -= 5;
      notes.push(`Weight ${weightComp.actual}kg — ${weightComp.status} (${weightComp.deviation}% from ideal)`);
      recommendations.push(weightComp.status === 'underweight'
        ? `Increase feed — currently ${Math.abs(weightComp.deviation)}% below ideal weight`
        : `Reduce feed or increase conditioning — currently ${weightComp.deviation}% above ideal weight`);
    }

    // Height scoring
    if (heightComp.status === 'within') {
      score += 15;
      notes.push(`Height ${heightComp.actual}cm — within standard (${Math.abs(heightComp.deviation)}% from ideal)`);
    } else if (heightComp.status !== 'unknown') {
      score -= 5;
      notes.push(`Height ${heightComp.actual}cm — ${heightComp.status} (${heightComp.deviation}% from ideal)`);
    }

    // Leg color scoring
    if (legComp.status === 'matches') {
      score += 10;
      notes.push(`Leg color matches standard`);
    } else if (legComp.status === 'uncommon') {
      score -= 2;
      notes.push(`Leg color uncommon for this strain — possible crossbreed indicator`);
    }

    // Plumage scoring
    if (plumageComp.status === 'matches') {
      score += 10;
      notes.push(`Plumage matches standard`);
    } else if (plumageComp.status === 'uncommon') {
      notes.push(`Plumage uncommon for this strain`);
    }
  } else {
    notes.push(`No breed standard found for "${breed}"`);
    recommendations.push('Consider adding breed standard data for this strain');
  }

  score = Math.max(0, Math.min(100, score));

  return {
    breed, standards, matchedStandard,
    weightCompliance: weightComp,
    heightCompliance: heightComp,
    legColorCompliance: legComp,
    plumageCompliance: plumageComp,
    overallScore: score,
    complianceGrade: getGrade(score),
    notes, recommendations,
  };
}

export { BREED_STANDARDS, findMatchingStandards };
