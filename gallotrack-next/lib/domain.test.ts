import { describe, it, expect } from 'vitest';
import {
  generateBreedCompliance,
  findMatchingStandards,
} from './breed-standards';
import { generateColorReport } from './color-genetics';
import { generateBloodlineReport, generateFarmBloodlineSummary } from './bloodlines';
import { weightFromStorage } from './units';
import type { FowlRecord, MatchRecord } from './types';

describe('breed-standards', () => {
  describe('findMatchingStandards', () => {
    it('finds standards by strain name', () => {
      const results = findMatchingStandards('Kelso');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Kelso');
    });

    it('finds standards by full breed name', () => {
      const results = findMatchingStandards('American Kelso');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty for unknown breed', () => {
      const results = findMatchingStandards('UnknownBreedXYZ');
      expect(results).toHaveLength(0);
    });

    it('is case-insensitive', () => {
      const lower = findMatchingStandards('hatch');
      const upper = findMatchingStandards('HATCH');
      expect(lower.length).toBe(upper.length);
    });
  });

  describe('generateBreedCompliance', () => {
    it('returns unknown status for no match', () => {
      const report = generateBreedCompliance('UnknownBreed', '2.0', '38', 'Yellow', 'Red');
      expect(report.matchedStandard).toBeNull();
      expect(report.weightCompliance.status).toBe('unknown');
      expect(report.heightCompliance.status).toBe('unknown');
    });

    it('scores within range for compliant fowl', () => {
      const report = generateBreedCompliance('Kelso', '2.1', '38', 'Yellow', 'Red');
      expect(report.matchedStandard).not.toBeNull();
      expect(report.weightCompliance.status).toBe('within');
      expect(report.heightCompliance.status).toBe('within');
      expect(report.overallScore).toBeGreaterThan(50);
    });

    it('detects underweight', () => {
      const report = generateBreedCompliance('Kelso', '1.5', '38', 'Yellow', 'Red');
      expect(report.weightCompliance.status).toBe('underweight');
    });

    it('detects overweight', () => {
      const report = generateBreedCompliance('Kelso', '3.0', '38', 'Yellow', 'Red');
      expect(report.weightCompliance.status).toBe('overweight');
    });

    it('detects uncommon leg color', () => {
      const report = generateBreedCompliance('Kelso', '2.1', '38', 'Black', 'Red');
      expect(report.legColorCompliance.status).toBe('uncommon');
    });

    it('detects matching leg color', () => {
      const report = generateBreedCompliance('Kelso', '2.1', '38', 'Yellow', 'Red');
      expect(report.legColorCompliance.status).toBe('matches');
    });

    it('returns valid grade', () => {
      const report = generateBreedCompliance('Kelso', '2.1', '38', 'Yellow', 'Red');
      expect(['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']).toContain(report.complianceGrade);
    });

    it('restricts fightingStyle for female parent records (Dams)', () => {
      const maleReport = generateBreedCompliance('Kelso', '2.1', '38', 'Yellow', 'Red', 'Rooster', 'Breeding Male');
      expect(maleReport.matchedStandard?.fightingStyle).toBeDefined();
      expect(maleReport.notes.some(n => n.includes('Fighting style'))).toBe(true);

      const femaleReport = generateBreedCompliance('Kelso', '2.1', '38', 'Yellow', 'Red', 'Hen', 'Breeding Female');
      expect(femaleReport.matchedStandard?.fightingStyle).toBeUndefined();
      expect(femaleReport.notes.some(n => n.includes('Fighting style'))).toBe(false);
    });
  });
});

describe('color-genetics', () => {
  describe('generateColorReport', () => {
    it('returns report for valid leg color', () => {
      const report = generateColorReport('Yellow', 'Red', undefined, undefined, undefined, undefined);
      expect(report.legColor).not.toBeNull();
      expect(report.legColor?.name).toBe('Yellow');
    });

    it('returns null leg color for unknown', () => {
      const report = generateColorReport('UnknownColor', 'Red', undefined, undefined, undefined, undefined);
      expect(report.legColor).toBeNull();
    });

    it('includes dominant and recessive genes', () => {
      const report = generateColorReport('Yellow', 'Red', undefined, undefined, undefined, undefined);
      expect(Array.isArray(report.dominantGenes)).toBe(true);
      expect(Array.isArray(report.recessiveGenes)).toBe(true);
    });

    it('returns color complement', () => {
      const report = generateColorReport('Yellow', 'Red', undefined, undefined, undefined, undefined);
      expect(typeof report.colorComplement).toBe('string');
    });
  });
});

describe('bloodlines', () => {
  const mockFowls: FowlRecord[] = [
    { id: 1, name: 'Alpha', sire: '', dam: '', gender: 'Rooster', breed: 'Kelso', bloodline_pct: 100 } as FowlRecord,
    { id: 2, name: 'Beta', sire: 'Alpha', dam: '', gender: 'Hen', breed: 'Hatch', bloodline_pct: 50 } as FowlRecord,
    { id: 3, name: 'Gamma', sire: 'Alpha', dam: 'Beta', gender: 'Rooster', breed: 'Kelso', bloodline_pct: 75 } as FowlRecord,
  ];

  const mockMatches: MatchRecord[] = [
    { id: 1, entry_name: 'Gamma', breed: 'Kelso', outcome: 'Win', date: '2026-01-01', opponent: 'X', location: 'A', type: 'Derby', status: 'Verified' } as MatchRecord,
  ];

  it('generates bloodline report for an offspring fowl', () => {
    const report = generateBloodlineReport(mockFowls[2], mockFowls, mockMatches);
    expect(report).toHaveProperty('purityPct');
    expect(report).toHaveProperty('hybridVigor');
    expect(report.inbreedingCoefficient).toBe(25); // Alpha x daughter Beta
    expect(report.relatedness.type).toBe('close');
  });

  it('generates bloodline report for a foundation fowl (no vigor verdict, inbreeding null)', () => {
    const report = generateBloodlineReport(mockFowls[0], mockFowls, mockMatches);
    expect(report.inbreedingCoefficient).toBeNull();
    expect(report.hybridVigor.label).toBe('—');
    expect(report.relatedness.type).toBe('unknown');
    expect(report.relatedness.label).toBe('Unknown (foundation stock, no recorded parents)');
  });

  it('generates farm summary', () => {
    const summary = generateFarmBloodlineSummary(mockFowls, mockMatches);
    expect(summary).toHaveProperty('totalFowls');
    expect(summary).toHaveProperty('avgPurity');
    expect(summary).toHaveProperty('closeBreedingCount');
    expect(summary.totalFowls).toBe(3);
  });

  it('restricts fightingStyle on crossPattern for Dam / female records', () => {
    const crossSire: FowlRecord = { id: 10, name: 'KelsoSire', sire: '', dam: '', gender: 'Rooster', breed: 'Kelso', bloodline_pct: 100 } as FowlRecord;
    const crossDam: FowlRecord = { id: 11, name: 'HatchDam', sire: '', dam: '', gender: 'Hen', breed: 'Hatch', bloodline_pct: 100 } as FowlRecord;

    const maleCross: FowlRecord = {
      id: 12,
      name: 'CrossCock',
      sire: 'KelsoSire',
      dam: 'HatchDam',
      gender: 'Rooster',
      breed: 'Kelso x Hatch',
      registry_role: 'Breeding Male',
      bloodline_pct: 50,
    } as FowlRecord;

    const femaleCross: FowlRecord = {
      id: 13,
      name: 'CrossHen',
      sire: 'KelsoSire',
      dam: 'HatchDam',
      gender: 'Hen',
      breed: 'Kelso x Hatch',
      registry_role: 'Breeding Female',
      bloodline_pct: 50,
    } as FowlRecord;

    const flock = [crossSire, crossDam, maleCross, femaleCross];
    const maleReport = generateBloodlineReport(maleCross, flock, []);
    const femaleReport = generateBloodlineReport(femaleCross, flock, []);

    expect(maleReport.crossPattern).not.toBeNull();
    expect(maleReport.crossPattern?.fightingStyle).toBeDefined();

    expect(femaleReport.crossPattern).not.toBeNull();
    expect(femaleReport.crossPattern?.fightingStyle).toBeUndefined();
  });

  it('preserves individual registered structural_weight without overriding it with strain benchmark average', () => {
    const fowls: FowlRecord[] = [
      { id: 20, name: 'HeavyKelso', breed: 'Kelso', weight: '2.8 kg', structural_weight: 2.8, bloodline_pct: 100 } as FowlRecord,
      { id: 21, name: 'LightKelso', breed: 'Kelso', weight: '2.0 kg', structural_weight: '2.0', bloodline_pct: 100 } as FowlRecord,
    ];
    const matches: MatchRecord[] = [
      { id: 100, entry_name: 'HeavyKelso', outcome: 'win' } as MatchRecord,
    ];

    const report = generateBloodlineReport(fowls[0], fowls, matches);
    expect(report.performanceBenchmark).not.toBeNull();
    expect(report.performanceBenchmark?.avgWeight).toBe(2.4); // average of 2.8 and 2.0

    // Ensure the individual fowl retains its registered value
    const individualRegWeight = fowls[0].structural_weight ?? fowls[0].weight;
    expect(individualRegWeight).toBe(2.8);
    expect(weightFromStorage(individualRegWeight, 'kg')).toBe('2.8');
    expect(weightFromStorage(fowls[1].structural_weight ?? fowls[1].weight, 'kg')).toBe('2');
  });
});
