import type { TranslationKey } from './i18n';
import { sexLabel } from './helpers';

/**
 * Gender Class display options.
 *
 * The stored values MUST stay 'Rooster' and 'Hen' — every existing row,
 * filter, and API payload uses them. Only the human-readable label changes
 * from the old parent-role wording (Sire/Dam) to sex wording (Cock/Hen).
 */
export const GENDER_CLASS_OPTIONS = [
  { value: 'Rooster', labelKey: 'registry.cockOption' },
  { value: 'Hen', labelKey: 'registry.henOption' },
] as const satisfies readonly { value: string; labelKey: TranslationKey }[];

export type GenderClassValue = (typeof GENDER_CLASS_OPTIONS)[number]['value'];

/**
 * Display label for a stored gender value. Known Gender Class values use the
 * translated Cock/Hen labels; legacy/custom values fall back to sexLabel.
 */
export function genderClassLabel(
  value: string,
  t: (key: TranslationKey) => string
): string {
  const option = GENDER_CLASS_OPTIONS.find((entry) => entry.value === value);
  return option ? t(option.labelKey) : sexLabel(value);
}
