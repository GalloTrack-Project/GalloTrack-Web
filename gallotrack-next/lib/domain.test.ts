import { describe, it, expect } from 'vitest';
import {
  generateBreedCompliance,
  findMatchingStandards,
  BREED_STANDARDS,
} from './breed-standards';
import { generateColorReport } from './color-genetics';
import { generateBloodlineReport, generateFarmBloodlineSummary } from './bloodlines';
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

  it('generates bloodline report for a fowl', () => {
    const report = generateBloodlineReport(mockFowls[2], mockFowls, mockMatches);
    expect(report).toHaveProperty('purityPct');
    expect(report).toHaveProperty('hybridVigor');
    expect(report).toHaveProperty('inbreedingCoefficient');
  });

  it('generates farm summary', () => {
    const summary = generateFarmBloodlineSummary(mockFowls, mockMatches);
    expect(summary).toHaveProperty('totalFowls');
    expect(summary).toHaveProperty('avgPurity');
    expect(summary.totalFowls).toBe(3);
  });
});
