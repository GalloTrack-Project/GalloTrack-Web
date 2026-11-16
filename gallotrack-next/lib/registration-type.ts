import { isFoundationStock } from './helpers';
import { previewBirdCode, type CodeSet } from './bird-code';
import type { FowlRecord } from './types';

export type RegistrationType = 'new' | 'offspring';

export const DEFAULT_REGISTRATION_TYPE: RegistrationType = 'new';

export function isOffspringRegistration(type: RegistrationType | undefined | null): boolean {
  return type === 'offspring';
}

/**
 * One display mapping for the legacy stored parent value. The database keeps
 * "Foundation Stock"; every user-facing surface renders the new wording.
 */
export function formatParentDisplayName(
  value: string | null | undefined,
  labels: { external: string; unknown: string },
): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return labels.unknown;
  if (isFoundationStock(trimmed)) return labels.external;
  return trimmed;
}

/**
 * Uses the existing identifier engine, but only feeds registered parent names
 * into it for an Offspring registration. External parent text on a New bird is
 * display-only and must not influence the code.
 */
export function previewRegistrationIdentifier(params: {
  registrationType: RegistrationType;
  gender?: string | null;
  sireName?: string | null;
  damName?: string | null;
  fowls: FowlRecord[];
  taken?: CodeSet;
}): string {
  const offspring = isOffspringRegistration(params.registrationType);
  return previewBirdCode({
    gender: params.gender,
    sireName: offspring ? params.sireName : '',
    damName: offspring ? params.damName : '',
    isOffspring: offspring,
    fowls: params.fowls,
    taken: params.taken,
  });
}
