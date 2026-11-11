import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_KPI_CAPTION,
  DASHBOARD_KPI_CARD,
  DASHBOARD_KPI_LABEL,
  DASHBOARD_KPI_SEX_ROW,
  DASHBOARD_KPI_STAT_GRID,
  DASHBOARD_KPI_STAT_VALUE,
  DASHBOARD_KPI_VALUE,
  DASHBOARD_SUMMARY_GRID,
} from './dashboard-kpi';

const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

function cssRule(name: string): string {
  const match = css.match(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`, 's'));
  if (!match) throw new Error(`Missing CSS rule .${name}`);
  return match[1];
}

describe('dashboard KPI layout utilities', () => {
  it('applies the shared container and shrink-safe classes', () => {
    expect(DASHBOARD_KPI_CARD).toContain('dashboard-kpi-card');
    expect(DASHBOARD_KPI_CARD).toContain('min-w-0');
    expect(DASHBOARD_KPI_LABEL).toContain('dashboard-kpi-label');
    expect(DASHBOARD_KPI_LABEL).toContain('dashboard-kpi-clamp');
    expect(DASHBOARD_KPI_VALUE).toBe('dashboard-kpi-value');
    expect(DASHBOARD_KPI_STAT_VALUE).toBe('dashboard-kpi-stat-value');
    expect(DASHBOARD_KPI_STAT_GRID).toBe('dashboard-kpi-stat-grid');
    expect(DASHBOARD_KPI_SEX_ROW).toBe('dashboard-kpi-sex-row');
    expect(DASHBOARD_SUMMARY_GRID).toContain('dashboard-summary-grid');
    expect(DASHBOARD_SUMMARY_GRID).toContain('min-w-0');
    expect(DASHBOARD_KPI_CAPTION).toBe('dashboard-kpi-caption');
  });

  it('defines zoom-safe container-query text rules in globals.css', () => {
    const card = cssRule('dashboard-kpi-card');
    expect(card).toContain('container-type: inline-size');
    expect(card).toContain('min-width: 0');

    const label = cssRule('dashboard-kpi-label');
    expect(label).toContain('clamp(0.625rem, 4cqi, 0.875rem)');
    expect(label).toContain('overflow-wrap: anywhere');
    expect(label).toContain('text-wrap: balance');
    expect(label).toContain('white-space: normal');

    const value = cssRule('dashboard-kpi-value');
    expect(value).toContain('clamp(1.25rem, 10cqi, 2rem)');

    const statValue = cssRule('dashboard-kpi-stat-value');
    expect(statValue).toContain('clamp(1rem, 7cqi, 1.25rem)');

    const statGrid = cssRule('dashboard-kpi-stat-grid');
    expect(statGrid).toContain('repeat(auto-fit, minmax(min(100%, 5.5rem), 1fr))');

    const sexRow = cssRule('dashboard-kpi-sex-row');
    expect(sexRow).toContain('flex-wrap: wrap');

    const summaryGrid = cssRule('dashboard-summary-grid');
    expect(summaryGrid).toContain('repeat(auto-fit, minmax(min(100%, 7rem), 1fr))');
  });
});
