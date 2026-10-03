import { expect } from 'vitest';
import { axe } from 'vitest-axe';

export type A11yImpact = 'minor' | 'moderate' | 'serious' | 'critical' | null;

/**
 * Gate 6 (Std §08): a primitive fails if axe reports a serious or critical
 * violation. Lower impacts are not blocked here — the gate is deliberately
 * about the violations that break a real assistive-technology user.
 */
export async function expectNoSeriousA11yViolations(container: Element) {
  const results = await axe(container);
  const blocking = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(
    blocking.map((v) => `${v.id} (${v.impact ?? 'n/a'}): ${v.help}`),
    'axe found serious/critical accessibility violations',
  ).toEqual([]);
}
