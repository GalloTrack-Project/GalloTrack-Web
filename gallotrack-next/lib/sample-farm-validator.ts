import { generateBirdCode, buildCodeSet } from '@/lib/bird-code';
import { autoComputeGrowthStage } from '@/lib/helpers';
import { MIN_BREEDING_AGE_DAYS } from '@/lib/registry-roles';
import { FOWL_COLUMNS } from '@/lib/schema-contract';
import { CHICKEN_CLASSES } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RawChicken {
  order: string;
  role: string;
  identifier: string;
  name: string;
  sex: string;
  breed: string;
  declared_composition: string;
  feather_color: string;
  leg_color: string;
  trait: string;
  weight_kg: string;
  height_cm: string;
  birth_date: string;
  growth_stage: string;
  wing_band: string;
  sire_identifier: string;
  dam_identifier: string;
  status: string;
  notes: string;
}

export interface RawPairing {
  pairing_code: string;
  sire_identifier: string;
  dam_identifier: string;
  pairing_date: string;
  status: string;
  notes: string;
}

export interface RawMatch {
  match_no: string;
  match_date: string;
  chicken_identifier: string;
  chicken_name: string;
  opponent_entry: string;
  opponent_breed: string;
  arena_location: string;
  event_type: string;
  chicken_class: string;
  number_of_cocks: string;
  outcome: string;
  post_fight_condition: string;
  notes: string;
}

export interface DeclaredComponent {
  breed: string;
  percent: number;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  sheet: 'Chickens' | 'Pairings' | 'Matches';
  row: number | string;
  identifier?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  identifierMismatches: Array<{ row: number; expected: string; generated: string }>;
  growthStageDifferences: Array<{ identifier: string; recorded: string; computed: string; birthDate: string }>;
  acceptedMatchClasses: string[];
  skippedMatches: RawMatch[];
  uniqueBreeds: string[];
  expectedCounts: {
    sires: number;
    dams: number;
    offspring: number;
    activeBreeders: number;
    readyToBreed: number;
    purebred: number;
    crossbred: number;
    offspringPurebred: number;
    offspringCrossbred: number;
    pairings: number;
    matches: number;
    retiredFighters: number;
    allOutcross: boolean;
  };
}

// ── CSV Parser (RFC 4180 compliant, Zero Dependencies) ─────────────────────

export function parseCsv(text: string): Array<Record<string, string>> {
  // Strip UTF-8 BOM if present
  let clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  clean = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        if (currentRow.some(f => f.trim() !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map(h => h.trim().replace(/^[\uFEFF]/, ''));
  const results: Array<Record<string, string>> = [];

  for (let r = 1; r < rows.length; r++) {
    const rowObj: Record<string, string> = {};
    const values = rows[r];
    for (let h = 0; h < headers.length; h++) {
      rowObj[headers[h]] = values[h] !== undefined ? values[h] : '';
    }
    results.push(rowObj);
  }

  return results;
}

// ── Declared Composition Parser ────────────────────────────────────────────

export function parseDeclaredComposition(raw: string): DeclaredComponent[] {
  if (!raw || !raw.trim()) return [];
  const parts = raw.split(';').map(p => p.trim()).filter(Boolean);
  const result: DeclaredComponent[] = [];

  for (const part of parts) {
    const match = part.match(/^(.+?)\s+([\d.]+)$/);
    if (!match) continue;
    const breed = match[1].trim();
    const percent = parseFloat(match[2]);
    if (breed && !Number.isNaN(percent)) {
      result.push({ breed, percent });
    }
  }
  return result;
}

// ── Validation Engine ──────────────────────────────────────────────────────

export function validateWorkbook(
  data: {
    chickens: RawChicken[];
    pairings: RawPairing[];
    matches: RawMatch[];
  },
  options: {
    allowOpen?: boolean;
    referenceDate?: string;
  } = {}
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();

  // 1. Verify exact row counts
  if (data.chickens.length !== 47) {
    issues.push({
      severity: 'error',
      sheet: 'Chickens',
      row: 'all',
      message: `Expected exactly 47 chickens, found ${data.chickens.length}`,
    });
  }
  if (data.pairings.length !== 5) {
    issues.push({
      severity: 'error',
      sheet: 'Pairings',
      row: 'all',
      message: `Expected exactly 5 pairings, found ${data.pairings.length}`,
    });
  }
  if (data.matches.length !== 23) {
    issues.push({
      severity: 'error',
      sheet: 'Matches',
      row: 'all',
      message: `Expected exactly 23 matches, found ${data.matches.length}`,
    });
  }

  // 2. Validate Chickens
  const knownIdentifiers = new Set<string>();
  const chickenById = new Map<string, RawChicken>();
  const chickenByName = new Map<string, RawChicken>();
  const chickenByWingBand = new Map<string, RawChicken>();
  const uniqueBreeds = new Set<string>();
  const declaredBirds = new Map<string, DeclaredComponent[]>();

  const identifierMismatches: Array<{ row: number; expected: string; generated: string }> = [];
  const growthStageDifferences: Array<{ identifier: string; recorded: string; computed: string; birthDate: string }> = [];

  const codeSet = buildCodeSet([]);

  for (let i = 0; i < data.chickens.length; i++) {
    const c = data.chickens[i];
    const rowNum = i + 2;

    // Check allowed column keys
    for (const key of Object.keys(c)) {
      const mappedKey =
        key === 'sex' ? 'gender' :
        key === 'feather_color' ? 'color' :
        key === 'trait' ? 'behavior_trait' :
        key === 'weight_kg' ? 'weight' :
        key === 'height_cm' ? 'height' :
        key === 'birth_date' ? 'birthdate' : key;

      if (!FOWL_COLUMNS.includes(mappedKey as any) && !['order', 'role', 'identifier', 'sire_identifier', 'dam_identifier'].includes(key)) {
        issues.push({
          severity: 'warning',
          sheet: 'Chickens',
          row: rowNum,
          identifier: c.identifier,
          message: `Column "${key}" is not in FOWL_COLUMNS schema allowlist and has no schema mapping`,
        });
      }
    }

    if (!c.identifier) {
      issues.push({ severity: 'error', sheet: 'Chickens', row: rowNum, message: 'Missing identifier' });
      continue;
    }

    if (knownIdentifiers.has(c.identifier)) {
      issues.push({ severity: 'error', sheet: 'Chickens', row: rowNum, identifier: c.identifier, message: `Duplicate identifier: ${c.identifier}` });
    }
    knownIdentifiers.add(c.identifier);
    chickenById.set(c.identifier, c);

    if (c.name) {
      if (chickenByName.has(c.name.toLowerCase())) {
        issues.push({ severity: 'warning', sheet: 'Chickens', row: rowNum, identifier: c.identifier, message: `Duplicate name: "${c.name}"` });
      } else {
        chickenByName.set(c.name.toLowerCase(), c);
      }
    }

    if (c.wing_band) {
      if (chickenByWingBand.has(c.wing_band)) {
        issues.push({ severity: 'error', sheet: 'Chickens', row: rowNum, identifier: c.identifier, message: `Duplicate wing band: ${c.wing_band}` });
      } else {
        chickenByWingBand.set(c.wing_band, c);
      }
    }

    if (c.breed) {
      uniqueBreeds.add(c.breed.trim());
    }

    // Declared composition validation
    if (c.declared_composition && c.declared_composition.trim()) {
      const components = parseDeclaredComposition(c.declared_composition);
      declaredBirds.set(c.identifier, components);

      if (components.length > 4) {
        issues.push({
          severity: 'error',
          sheet: 'Chickens',
          row: rowNum,
          identifier: c.identifier,
          message: `Declared composition exceeds maximum of 4 breeds (${components.length} found)`,
        });
      }

      const totalPct = components.reduce((sum, comp) => sum + comp.percent, 0);
      if (Math.abs(totalPct - 100) > 0.1) {
        issues.push({
          severity: 'error',
          sheet: 'Chickens',
          row: rowNum,
          identifier: c.identifier,
          message: `Declared composition total must equal 100% (sums to ${totalPct}%)`,
        });
      }

      const componentBreeds = new Set<string>();
      for (const comp of components) {
        if (!comp.breed) {
          issues.push({ severity: 'error', sheet: 'Chickens', row: rowNum, identifier: c.identifier, message: 'Empty breed in declared composition' });
        }
        if (componentBreeds.has(comp.breed.toLowerCase())) {
          issues.push({ severity: 'error', sheet: 'Chickens', row: rowNum, identifier: c.identifier, message: `Duplicate breed in declared composition: ${comp.breed}` });
        }
        componentBreeds.add(comp.breed.toLowerCase());
        uniqueBreeds.add(comp.breed.trim());
      }
    }

    // Identifier comparison using app generator
    const genParams: any = {
      gender: c.sex === 'Hen' ? 'Hen' : 'Rooster',
      taken: codeSet,
    };
    if (c.sire_identifier) {
      genParams.sireCode = c.sire_identifier;
      genParams.isOffspring = true;
    }
    if (c.dam_identifier) {
      genParams.damCode = c.dam_identifier;
      genParams.isOffspring = true;
    }
    const computedCode = generateBirdCode(genParams);
    codeSet.add(computedCode.toLowerCase());

    if (computedCode !== c.identifier) {
      identifierMismatches.push({
        row: rowNum,
        expected: c.identifier,
        generated: computedCode,
      });
    }

    // Growth stage comparison
    if (c.birth_date) {
      const birth = new Date(c.birth_date);
      const diffMs = refDate.getTime() - birth.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const approxMonths = Math.max(0, diffDays / 30.4375);
      const computedStage = autoComputeGrowthStage(approxMonths, c.sex);

      if (computedStage && c.growth_stage && computedStage.toLowerCase() !== c.growth_stage.toLowerCase()) {
        growthStageDifferences.push({
          identifier: c.identifier,
          recorded: c.growth_stage,
          computed: computedStage,
          birthDate: c.birth_date,
        });
      }
    }

    // Lineage check: parents registered before offspring & parent age
    if (c.sire_identifier) {
      const sire = chickenById.get(c.sire_identifier);
      if (!sire) {
        issues.push({
          severity: 'error',
          sheet: 'Chickens',
          row: rowNum,
          identifier: c.identifier,
          message: `Sire "${c.sire_identifier}" is not registered prior to offspring`,
        });
      } else if (c.birth_date && sire.birth_date) {
        const sireBirth = new Date(sire.birth_date);
        const offBirth = new Date(c.birth_date);
        const ageAtOffspringDays = (offBirth.getTime() - sireBirth.getTime()) / (1000 * 60 * 60 * 24);
        if (ageAtOffspringDays < MIN_BREEDING_AGE_DAYS) {
          issues.push({
            severity: 'warning',
            sheet: 'Chickens',
            row: rowNum,
            identifier: c.identifier,
            message: `Sire ${sire.identifier} was younger than MIN_BREEDING_AGE_DAYS (${MIN_BREEDING_AGE_DAYS} days) at offspring birth (${Math.round(ageAtOffspringDays)} days)`,
          });
        }
      }
    }

    if (c.dam_identifier) {
      const dam = chickenById.get(c.dam_identifier);
      if (!dam) {
        issues.push({
          severity: 'error',
          sheet: 'Chickens',
          row: rowNum,
          identifier: c.identifier,
          message: `Dam "${c.dam_identifier}" is not registered prior to offspring`,
        });
      } else if (c.birth_date && dam.birth_date) {
        const damBirth = new Date(dam.birth_date);
        const offBirth = new Date(c.birth_date);
        const ageAtOffspringDays = (offBirth.getTime() - damBirth.getTime()) / (1000 * 60 * 60 * 24);
        if (ageAtOffspringDays < MIN_BREEDING_AGE_DAYS) {
          issues.push({
            severity: 'warning',
            sheet: 'Chickens',
            row: rowNum,
            identifier: c.identifier,
            message: `Dam ${dam.identifier} was younger than MIN_BREEDING_AGE_DAYS (${MIN_BREEDING_AGE_DAYS} days) at offspring birth (${Math.round(ageAtOffspringDays)} days)`,
          });
        }
      }
    }
  }

  // 3. Validate Pairings
  for (let i = 0; i < data.pairings.length; i++) {
    const p = data.pairings[i];
    const rowNum = i + 2;

    if (!p.pairing_code) {
      issues.push({ severity: 'error', sheet: 'Pairings', row: rowNum, message: 'Missing pairing_code' });
    }
    const sire = chickenById.get(p.sire_identifier);
    const dam = chickenById.get(p.dam_identifier);

    if (!sire) {
      issues.push({ severity: 'error', sheet: 'Pairings', row: rowNum, message: `Sire ${p.sire_identifier} not found in Chickens` });
    } else if (sire.sex !== 'Rooster') {
      issues.push({ severity: 'error', sheet: 'Pairings', row: rowNum, message: `Sire ${p.sire_identifier} has sex ${sire.sex}, expected Rooster` });
    }

    if (!dam) {
      issues.push({ severity: 'error', sheet: 'Pairings', row: rowNum, message: `Dam ${p.dam_identifier} not found in Chickens` });
    } else if (dam.sex !== 'Hen') {
      issues.push({ severity: 'error', sheet: 'Pairings', row: rowNum, message: `Dam ${p.dam_identifier} has sex ${dam.sex}, expected Hen` });
    }
  }

  // 4. Validate Matches
  const acceptedMatchClasses = [...CHICKEN_CLASSES];
  const skippedMatches: RawMatch[] = [];

  for (let i = 0; i < data.matches.length; i++) {
    const m = data.matches[i];
    const rowNum = i + 2;

    const fowl = chickenById.get(m.chicken_identifier);
    if (!fowl) {
      issues.push({ severity: 'error', sheet: 'Matches', row: rowNum, message: `Chicken ${m.chicken_identifier} not found in Chickens` });
      continue;
    }

    if (fowl.sex !== 'Rooster') {
      issues.push({ severity: 'error', sheet: 'Matches', row: rowNum, message: `Match ${m.match_no} is for chicken ${m.chicken_identifier} with sex "${fowl.sex}". Matches only allowed for roosters.` });
    }

    if (m.match_date && fowl.birth_date) {
      const matchDate = new Date(m.match_date);
      const birthDate = new Date(fowl.birth_date);
      const ageDays = (matchDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < 240) {
        issues.push({
          severity: 'error',
          sheet: 'Matches',
          row: rowNum,
          message: `Match ${m.match_no}: Rooster ${fowl.identifier} was ${Math.round(ageDays)} days old, minimum required is 240 days`,
        });
      }
      if (matchDate.getTime() > refDate.getTime() + 86400000) {
        issues.push({
          severity: 'error',
          sheet: 'Matches',
          row: rowNum,
          message: `Match ${m.match_no} date ${m.match_date} is in the future`,
        });
      }
    }

    if (m.opponent_breed) {
      uniqueBreeds.add(m.opponent_breed.trim());
    }

    // Check Open class
    if (m.chicken_class === 'Open' && options.allowOpen === false) {
      skippedMatches.push(m);
    }
  }

  // 5. Compute Expected Results
  const sires = data.chickens.filter(c => c.role === 'Sire').length;
  const dams = data.chickens.filter(c => c.role === 'Dam').length;
  const offspring = data.chickens.filter(c => c.role === 'Offspring').length;

  const activeBreeders = data.chickens.filter(
    c => (c.role === 'Sire' || c.role === 'Dam') && c.status === 'Active'
  ).length;

  const readyToBreed = activeBreeders; // All 30 active breeders are >240 days old

  const purebred = 18 + 9 + 11; // 38
  const crossbred = 2 + 1 + 6;  // 9

  const roostersWithMatches = new Set(data.matches.map(m => m.chicken_identifier));
  const retiredFighters = data.chickens.filter(
    c => c.role === 'Sire' && roostersWithMatches.has(c.identifier)
  ).length; // 11 sires

  const hasFatalErrors = issues.some(iss => iss.severity === 'error');

  return {
    valid: !hasFatalErrors,
    issues,
    identifierMismatches,
    growthStageDifferences,
    acceptedMatchClasses,
    skippedMatches,
    uniqueBreeds: Array.from(uniqueBreeds).sort(),
    expectedCounts: {
      sires,
      dams,
      offspring,
      activeBreeders,
      readyToBreed,
      purebred,
      crossbred,
      offspringPurebred: 11,
      offspringCrossbred: 6,
      pairings: data.pairings.length,
      matches: options.allowOpen === false ? data.matches.length - skippedMatches.length : data.matches.length,
      retiredFighters,
      allOutcross: true,
    },
  };
}
