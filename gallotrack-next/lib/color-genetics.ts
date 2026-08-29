// Coat color genetics system for gamefowl
// Tracks dominant/recessive color traits, sex-linked inheritance, and plumage patterns

export type ColorTrait = {
  name: string;
  dominance: 'dominant' | 'recessive' | 'codominant' | 'polygenic' | 'sex-linked';
  code: string;
  description: string;
  inheritanceNote: string;
};

export type ColorInheritance = {
  sireTrait: ColorTrait | null;
  damTrait: ColorTrait | null;
  predictedOffspring: ColorTrait[];
  confidence: number;
  notes: string[];
  probabilityTable: { phenotype: string; probability: number }[];
};

export type ColorReport = {
  legColor: ColorTrait | null;
  plumageColor: string;
  plumagePattern: string;
  eyeColor: string;
  inheritance: ColorInheritance | null;
  dominantGenes: string[];
  recessiveGenes: string[];
  polygenicTraits: string[];
  colorComplement: string; // what colors complement this bird
};

// ─── LEG COLOR TRAITS (ordered by dominance) ────────────────────────────────
const LEG_COLOR_TRAITS: Record<string, ColorTrait> = {
  'willow':   { name: 'Willow',   dominance: 'dominant',     code: 'W',  description: 'Dark greenish-brown legs', inheritanceNote: 'Dominant over yellow, white, and slate' },
  'black':    { name: 'Black',    dominance: 'dominant',     code: 'Bk', description: 'Dark black legs', inheritanceNote: 'Strong dominant — masks lighter colors' },
  'green':    { name: 'Green / Slate', dominance: 'codominant', code: 'G', description: 'Blue-gray slate legs', inheritanceNote: 'Codominant with yellow — produces green in heterozygotes' },
  'slate':    { name: 'Green / Slate', dominance: 'codominant', code: 'G', description: 'Blue-gray slate legs', inheritanceNote: 'Codominant with yellow' },
  'yellow':   { name: 'Yellow',   dominance: 'recessive',    code: 'y',  description: 'Bright yellow legs', inheritanceNote: 'Recessive — both parents must carry yellow gene' },
  'white':    { name: 'White',    dominance: 'recessive',    code: 'w',  description: 'Pale white/pink legs', inheritanceNote: 'Recessive — requires both parents to contribute' },
};

// ─── PLUMAGE COLOR TRAITS ──────────────────────────────────────────────────
const PLUMAGE_TRAITS: Record<string, ColorTrait> = {
  'black':    { name: 'Black',    dominance: 'dominant',     code: 'B',   description: 'Solid black plumage', inheritanceNote: 'Strong dominant — masks most other colors' },
  'red':      { name: 'Red',      dominance: 'dominant',     code: 'R',   description: 'Red/brown plumage', inheritanceNote: 'Dominant over buff and yellow' },
  'spangled': { name: 'Spangled', dominance: 'dominant',     code: 'Sp',  description: 'Spangled/tipped feather pattern', inheritanceNote: 'Dominant over solid colors' },
  'white':    { name: 'White',    dominance: 'recessive',    code: 'w',   description: 'Pure white plumage', inheritanceNote: 'Recessive — requires both parents to carry white' },
  'buff':     { name: 'Buff',     dominance: 'recessive',    code: 'Bu',  description: 'Light tan/buff plumage', inheritanceNote: 'Recessive dilution of red' },
  'yellow':   { name: 'Yellow',   dominance: 'recessive',    code: 'Y',   description: 'Yellow/gold plumage', inheritanceNote: 'Recessive — lighter than buff' },
  'gray':     { name: 'Gray',     dominance: 'polygenic',    code: 'Gr',  description: 'Blue-gray plumage', inheritanceNote: 'Polygenic — multiple genes control shade' },
  'blue':     { name: 'Blue',     dominance: 'codominant',   code: 'Bl',  description: 'Blue/steel dilution of black', inheritanceNote: 'Incomplete dominance — heterozygotes are lighter' },
  'barred':   { name: 'Barred',   dominance: 'sex-linked',   code: 'Br',  description: 'Barred stripe pattern', inheritanceNote: 'Sex-linked — carried on Z chromosome' },
  'duckwing': { name: 'Duckwing', dominance: 'dominant',     code: 'Dw',  description: 'Wild-type pattern with sickle feathers', inheritanceNote: 'Dominant wild-type pattern' },
};

// ─── PLUMAGE PATTERNS ──────────────────────────────────────────────────────
const PLUMAGE_PATTERNS: Record<string, { name: string; dominant: boolean; description: string }> = {
  'solid':     { name: 'Solid',     dominant: false, description: 'Uniform color throughout' },
  'spangled':  { name: 'Spangled',  dominant: true,  description: 'Dark body with light-tipped feathers' },
  'barred':    { name: 'Barred',    dominant: true,  description: 'Horizontal stripe pattern (sex-linked)' },
  'stippled':  { name: 'Stippled',  dominant: false, description: 'Fine speckling pattern' },
  'mottled':   { name: 'Mottled',   dominant: true,  description: 'Irregular white patches on dark base' },
  'penciled':  { name: 'Penciled',  dominant: false, description: 'Fine parallel lines on feathers' },
  'laced':     { name: 'Laced',     dominant: true,  description: 'Each feather bordered with contrasting color' },
};

function getLegColorTrait(color: string): ColorTrait | null {
  const normalized = (color || '').trim().toLowerCase();
  return LEG_COLOR_TRAITS[normalized] || null;
}

function getPlumageTrait(color: string): ColorTrait | null {
  const normalized = (color || '').trim().toLowerCase();
  return PLUMAGE_TRAITS[normalized] || null;
}

// ─── INHERITANCE PREDICTION ────────────────────────────────────────────────
export function predictColorInheritance(
  sireLegColor: string,
  damLegColor: string,
  sireColorCategory: string,
  damColorCategory: string
): ColorInheritance {
  const notes: string[] = [];
  const predicted: ColorTrait[] = [];
  const probabilityTable: { phenotype: string; probability: number }[] = [];

  const sireTrait = getLegColorTrait(sireLegColor);
  const damTrait = getLegColorTrait(damLegColor);

  // ── Leg Color Inheritance ──
  if (sireTrait && damTrait) {
    // Dominant × anything = dominant
    if (sireTrait.dominance === 'dominant' && damTrait.dominance !== 'dominant') {
      predicted.push(sireTrait);
      notes.push(`${sireTrait.name} (${sireTrait.code}) is dominant over ${damTrait.name} (${damTrait.code})`);
      notes.push(sireTrait.inheritanceNote);
      if (damTrait.dominance === 'recessive') {
        probabilityTable.push({ phenotype: sireTrait.name, probability: 75 });
        probabilityTable.push({ phenotype: `Carrier ${damTrait.name}`, probability: 25 });
      } else {
        probabilityTable.push({ phenotype: sireTrait.name, probability: 100 });
      }
    } else if (damTrait.dominance === 'dominant' && sireTrait.dominance !== 'dominant') {
      predicted.push(damTrait);
      notes.push(`${damTrait.name} (${damTrait.code}) is dominant over ${sireTrait.name} (${sireTrait.code})`);
      notes.push(damTrait.inheritanceNote);
      if (sireTrait.dominance === 'recessive') {
        probabilityTable.push({ phenotype: damTrait.name, probability: 75 });
        probabilityTable.push({ phenotype: `Carrier ${sireTrait.name}`, probability: 25 });
      } else {
        probabilityTable.push({ phenotype: damTrait.name, probability: 100 });
      }
    }
    // Same dominant × dominant = 100% dominant
    else if (sireTrait.dominance === 'dominant' && damTrait.dominance === 'dominant') {
      predicted.push(sireTrait);
      notes.push('Both dominant — offspring will show dominant trait');
      probabilityTable.push({ phenotype: sireTrait.name, probability: 100 });
    }
    // Codominant × anything
    else if (sireTrait.dominance === 'codominant' || damTrait.dominance === 'codominant') {
      const codom = sireTrait.dominance === 'codominant' ? sireTrait : damTrait;
      const other = sireTrait.dominance === 'codominant' ? damTrait : sireTrait;
      predicted.push(codom, other);
      notes.push(`Codominant expression — expect blended phenotype`);
      notes.push(codom.inheritanceNote);
      if (other.dominance === 'recessive') {
        probabilityTable.push({ phenotype: `${codom.name} (heterozygous)`, probability: 50 });
        probabilityTable.push({ phenotype: other.name, probability: 50 });
      } else {
        probabilityTable.push({ phenotype: `${codom.name} × ${other.name}`, probability: 100 });
      }
    }
    // Same recessive × same recessive = 100% recessive
    else if (sireTrait.code === damTrait.code) {
      predicted.push(sireTrait);
      notes.push(`Both ${sireTrait.name} — 100% ${sireTrait.name} offspring`);
      probabilityTable.push({ phenotype: sireTrait.name, probability: 100 });
    }
    // Different recessives
    else {
      predicted.push(sireTrait, damTrait);
      notes.push('Both recessive different — 50/50 chance of each');
      probabilityTable.push({ phenotype: sireTrait.name, probability: 50 });
      probabilityTable.push({ phenotype: damTrait.name, probability: 50 });
    }
  } else if (sireTrait) {
    predicted.push(sireTrait);
    notes.push(`Sire: ${sireTrait.name} — dam trait unknown`);
    probabilityTable.push({ phenotype: sireTrait.name, probability: 50 });
  } else if (damTrait) {
    predicted.push(damTrait);
    notes.push(`Dam: ${damTrait.name} — sire trait unknown`);
    probabilityTable.push({ phenotype: damTrait.name, probability: 50 });
  }

  // ── Plumage Inheritance ──
  const sirePlumage = getPlumageTrait(sireColorCategory);
  const damPlumage = getPlumageTrait(damColorCategory);
  if (sirePlumage && damPlumage) {
    if (sirePlumage.dominance === 'dominant' || damPlumage.dominance === 'dominant') {
      const dom = sirePlumage.dominance === 'dominant' ? sirePlumage : damPlumage;
      notes.push(`Plumage: ${dom.name} expected (dominant)`);
    } else if (sirePlumage.code === damPlumage.code) {
      notes.push(`Plumage: ${sirePlumage.name} expected (both parents)`);
    } else {
      notes.push(`Plumage: mixed expression possible`);
    }
  }

  const confidence = (sireTrait && damTrait) ? 75 : (sireTrait || damTrait) ? 45 : 20;

  return { sireTrait, damTrait, predictedOffspring: predicted, confidence, notes, probabilityTable };
}

// ─── FULL COLOR REPORT ─────────────────────────────────────────────────────
export function generateColorReport(
  legColor: string,
  colorCategory: string,
  sireLegColor: string | undefined,
  damLegColor: string | undefined,
  sireColorCategory: string | undefined,
  damColorCategory: string | undefined
): ColorReport {
  const legTrait = getLegColorTrait(legColor);
  const plumageTrait = getPlumageTrait(colorCategory);

  const inheritance = (sireLegColor || sireColorCategory) && (damLegColor || damColorCategory)
    ? predictColorInheritance(
        sireLegColor || '', damLegColor || '',
        sireColorCategory || '', damColorCategory || ''
      )
    : null;

  const dominantGenes: string[] = [];
  const recessiveGenes: string[] = [];
  const polygenicTraits: string[] = [];

  [...Object.values(LEG_COLOR_TRAITS), ...Object.values(PLUMAGE_TRAITS)].forEach(trait => {
    if (trait.dominance === 'dominant') dominantGenes.push(`${trait.code} (${trait.name})`);
    else if (trait.dominance === 'recessive') recessiveGenes.push(`${trait.code} (${trait.name})`);
    else if (trait.dominance === 'polygenic') polygenicTraits.push(`${trait.code} (${trait.name})`);
  });

  // Color complement suggestions
  const colorComplement = legTrait
    ? getComplementaryColors(legTrait.name, colorCategory)
    : 'Unknown — enter leg color for suggestions';

  return {
    legColor: legTrait,
    plumageColor: colorCategory || 'Unknown',
    plumagePattern: detectPattern(colorCategory),
    eyeColor: 'Not tracked',
    inheritance,
    dominantGenes: [...new Set(dominantGenes)],
    recessiveGenes: [...new Set(recessiveGenes)],
    polygenicTraits: [...new Set(polygenicTraits)],
    colorComplement,
  };
}

function detectPattern(colorCategory: string): string {
  const normalized = (colorCategory || '').trim().toLowerCase();
  for (const [key, pattern] of Object.entries(PLUMAGE_PATTERNS)) {
    if (normalized.includes(key)) return pattern.name;
  }
  return 'Solid (default)';
}

function getComplementaryColors(legColor: string, plumage: string): string {
  const combos: Record<string, Record<string, string>> = {
    'Yellow': {
      'Red': 'Classic and striking — Yellow legs with Red plumage is a time-tested combination',
      'Black': 'Bold contrast — Yellow legs stand out against dark plumage',
      'Spangled': 'Traditional — Yellow legs complement spangled patterns well',
    },
    'White': {
      'Red': 'Clean contrast — White legs with Red plumage',
      'Black': 'Elegant — White legs with Black plumage creates a refined look',
      'White': 'Albino look — all white phenotype',
    },
    'Green / Slate': {
      'Black': 'Stealth look — dark legs with dark plumage for a formidable appearance',
      'Red': 'Balanced — slate legs tone down bright plumage',
    },
    'Willow': {
      'Red': 'Classic gamefowl look — Willow legs with Red plumage',
      'Spangled': 'Natural appearance — blends with wild-type patterns',
    },
    'Black': {
      'Black': 'Dominant phenotype — black legs and plumage together',
      'Red': 'Intimidating — dark legs with bright plumage',
    },
  };
  return combos[legColor]?.[plumage] || `${legColor} legs — common in gamefowl`;
}

export { LEG_COLOR_TRAITS, PLUMAGE_TRAITS, PLUMAGE_PATTERNS };
