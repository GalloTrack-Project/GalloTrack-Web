// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseCsv,
  parseDeclaredComposition,
  validateWorkbook,
  RawChicken,
  RawPairing,
  RawMatch,
} from './sample-farm-validator';

describe('Sample Farm Import Engine', () => {
  const dataDir = path.resolve(__dirname, '../scripts/data');
  const chickensCsv = fs.readFileSync(path.join(dataDir, 'Chickens.csv'), 'utf8');
  const pairingsCsv = fs.readFileSync(path.join(dataDir, 'Pairings.csv'), 'utf8');
  const matchesCsv = fs.readFileSync(path.join(dataDir, 'Matches.csv'), 'utf8');

  it('parses CSV correctly, stripping BOM and preserving string types without number coercion', () => {
    const raw = '\uFEFFid,code,notes\n1,"05","Sample, with comma"\n2,"1A1","Normal"\n';
    const parsed = parseCsv(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('1');
    expect(typeof parsed[0].id).toBe('string');
    expect(parsed[0].code).toBe('05');
    expect(parsed[0].notes).toBe('Sample, with comma');
    expect(parsed[1].code).toBe('1A1');
  });

  it('parses the actual CSV files with expected row counts (47 chickens, 5 pairings, 23 matches)', () => {
    const chickens = parseCsv(chickensCsv);
    const pairings = parseCsv(pairingsCsv);
    const matches = parseCsv(matchesCsv);

    expect(chickens).toHaveLength(47);
    expect(pairings).toHaveLength(5);
    expect(matches).toHaveLength(23);

    // Verify identifiers remain strings
    expect(chickens[0].identifier).toBe('1');
    expect(typeof chickens[0].identifier).toBe('string');
    expect(chickens[20].identifier).toBe('A');
    expect(chickens[30].identifier).toBe('1A1');
  });

  it('parses declared composition accurately for foundation birds', () => {
    const sire11 = parseDeclaredComposition('Lemon 75; Hatch 25');
    expect(sire11).toEqual([
      { breed: 'Lemon', percent: 75 },
      { breed: 'Hatch', percent: 25 },
    ]);

    const sire18 = parseDeclaredComposition('Sweater 87.5; Kelso 12.5');
    expect(sire18).toEqual([
      { breed: 'Sweater', percent: 87.5 },
      { breed: 'Kelso', percent: 12.5 },
    ]);

    const damF = parseDeclaredComposition('Lemon 75; Whitehackle 25');
    expect(damF).toEqual([
      { breed: 'Lemon', percent: 75 },
      { breed: 'Whitehackle', percent: 25 },
    ]);
  });

  it('validates the complete workbook and produces exact expected counts', () => {
    const chickens = parseCsv(chickensCsv) as unknown as RawChicken[];
    const pairings = parseCsv(pairingsCsv) as unknown as RawPairing[];
    const matches = parseCsv(matchesCsv) as unknown as RawMatch[];

    const result = validateWorkbook(
      { chickens, pairings, matches },
      { allowOpen: true, referenceDate: '2026-10-19' }
    );

    const errors = result.issues.filter(i => i.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(result.valid).toBe(true);

    // Exact expected counts
    expect(result.expectedCounts.sires).toBe(20);
    expect(result.expectedCounts.dams).toBe(10);
    expect(result.expectedCounts.offspring).toBe(17);
    expect(result.expectedCounts.activeBreeders).toBe(30);
    expect(result.expectedCounts.readyToBreed).toBe(30);
    expect(result.expectedCounts.purebred).toBe(38);
    expect(result.expectedCounts.crossbred).toBe(9);
    expect(result.expectedCounts.offspringPurebred).toBe(11);
    expect(result.expectedCounts.offspringCrossbred).toBe(6);
    expect(result.expectedCounts.pairings).toBe(5);
    expect(result.expectedCounts.matches).toBe(23);
    expect(result.expectedCounts.retiredFighters).toBe(11);
    expect(result.expectedCounts.allOutcross).toBe(true);

    // Identifiers match 100%
    expect(result.identifierMismatches).toHaveLength(0);
  });

  it('detects invalid declared composition (total != 100 or duplicate breeds)', () => {
    const chickens = parseCsv(chickensCsv) as unknown as RawChicken[];
    const modified = [...chickens];
    modified[0] = { ...modified[0], declared_composition: 'Lemon 60; Hatch 30' }; // 90%

    const result = validateWorkbook(
      { chickens: modified, pairings: [], matches: [] },
      { allowOpen: true }
    );
    const err = result.issues.find(i => i.message.includes('must equal 100%'));
    expect(err).toBeDefined();
  });

  it('detects duplicate wing bands', () => {
    const chickens = parseCsv(chickensCsv) as unknown as RawChicken[];
    const modified = [...chickens];
    modified[1] = { ...modified[1], wing_band: 'WB-001' }; // Duplicate with row 1

    const result = validateWorkbook(
      { chickens: modified, pairings: [], matches: [] },
      { allowOpen: true }
    );
    const err = result.issues.find(i => i.message.includes('Duplicate wing band'));
    expect(err).toBeDefined();
  });

  it('skips Open class matches when allowOpen is false', () => {
    const chickens = parseCsv(chickensCsv) as unknown as RawChicken[];
    const pairings = parseCsv(pairingsCsv) as unknown as RawPairing[];
    const matches = parseCsv(matchesCsv) as unknown as RawMatch[];

    const result = validateWorkbook(
      { chickens, pairings, matches },
      { allowOpen: false, referenceDate: '2026-10-19' }
    );

    expect(result.skippedMatches).toHaveLength(2);
    expect(result.expectedCounts.matches).toBe(21);
    expect(result.skippedMatches.map(m => m.match_no)).toEqual(['14', '23']);
  });
});
