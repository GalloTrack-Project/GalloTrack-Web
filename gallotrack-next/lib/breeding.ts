import type { FowlRecord } from './types';

/** Pairing status values stored in `breeding_pairings.outcome`. */
export const PAIRING_OUTCOMES = ['Active', 'Completed', 'Discontinued'] as const;
export type PairingOutcome = (typeof PAIRING_OUTCOMES)[number];

/** Incident categories stored in `safety_incidents.type`. */
export const INCIDENT_TYPES = ['Injury', 'Illness', 'Accident', 'Fight Wound', 'Environmental'] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

/** Incident severity levels, ordered from least to most urgent. */
export const INCIDENT_SEVERITIES = ['Minor', 'Moderate', 'Severe', 'Critical'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

/** Incident resolution states stored in `safety_incidents.status`. */
export const INCIDENT_STATUSES = ['Treated', 'Monitoring', 'Recovered', 'Deceased'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/** Gender labels that count as a sire (male / rooster side of a pairing). */
const SIRE_GENDERS = ['rooster', 'cock', 'stag', 'male'];

/** True when the chicken can be used as the sire (number-coded side). */
export function isSireGender(fowl: Pick<FowlRecord, 'gender'>): boolean {
  return SIRE_GENDERS.includes((fowl.gender || '').trim().toLowerCase());
}

/** Split a flock into the sire (number) and dam (letter) sides. */
export function splitByGender(fowls: FowlRecord[]): { sires: FowlRecord[]; dams: FowlRecord[] } {
  return {
    sires: fowls.filter(isSireGender),
    dams: fowls.filter((f) => !isSireGender(f)),
  };
}

/**
 * Base code of every offspring of a pairing: sire code + dam code.
 * Sire `1` + Dam `A` → `1A` (children then become 1A1, 1A2, 1A3...).
 * Returns `''` when either side is still uncoded.
 */
export function offspringBaseCode(sireCode?: string | null, damCode?: string | null): string {
  const sire = (sireCode || '').trim();
  const dam = (damCode || '').trim();
  if (!sire || !dam) return '';
  return `${sire}${dam}`;
}

/** Classification of a bird code under the adviser coding scheme. */
export type CodeKind = 'sire' | 'dam' | 'offspring' | 'custom';

export function classifyBirdCode(code?: string | null): CodeKind {
  const value = (code || '').trim().toUpperCase();
  if (/^\d+$/.test(value)) return 'sire';
  if (/^[A-Z]+$/.test(value)) return 'dam';
  if (/^\d+[A-Z]\d+$/.test(value)) return 'offspring';
  return 'custom';
}

/**
 * Validation for a new pairing. Returns an error message, or `null` when the
 * selection is usable.
 */
export function validatePairing(
  sire: FowlRecord | null | undefined,
  dam: FowlRecord | null | undefined
): string | null {
  if (!sire || !dam) return 'Pumili ng sire at dam.';
  if (sire.id === dam.id) return 'Ang sire at dam ay dapat magkaibang manok.';
  if (!isSireGender(sire)) return `Si "${sire.name}" ay hindi lalaking manok (sire).`;
  if (isSireGender(dam)) return `Si "${dam.name}" ay hindi babaeng manok (dam).`;
  return null;
}

/** Count incidents per severity level. */
export function severityCounts<T extends { severity: IncidentSeverity }>(
  incidents: T[]
): Record<IncidentSeverity, number> {
  const counts = {
    Minor: 0,
    Moderate: 0,
    Severe: 0,
    Critical: 0,
  } as Record<IncidentSeverity, number>;
  incidents.forEach((incident) => {
    if (counts[incident.severity] !== undefined) counts[incident.severity] += 1;
  });
  return counts;
}

/** Urgent = Severe or Critical — drives the safety tab badge. */
export function countUrgentIncidents<T extends { severity: IncidentSeverity }>(incidents: T[]): number {
  return incidents.filter((i) => i.severity === 'Severe' || i.severity === 'Critical').length;
}

export function countPairingsByOutcome<T extends { outcome: PairingOutcome }>(
  pairings: T[],
  outcome: PairingOutcome
): number {
  return pairings.filter((p) => p.outcome === outcome).length;
}

/** Most urgent severity first, then newest date first. */
export function sortIncidents<
  T extends { severity: IncidentSeverity; incident_date: string | null | undefined },
>(incidents: T[]): T[] {
  const rank = (severity: IncidentSeverity) => INCIDENT_SEVERITIES.length - INCIDENT_SEVERITIES.indexOf(severity);
  return [...incidents].sort(
    (a, b) => rank(b.severity) - rank(a.severity) || String(b.incident_date || '').localeCompare(String(a.incident_date || ''))
  );
}
