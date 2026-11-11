import type { RelatednessClassification } from './relatedness-classification';

export const BLOODLINE_REPORT_CARD = 'bloodline-report min-w-0';
export const BLOODLINE_REPORT_SUMMARY = 'bloodline-report-summary min-w-0';
export const BLOODLINE_REPORT_PARENTAGE = 'bloodline-report-parentage';

type ParentageInput =
  | Pick<RelatednessClassification, 'type' | 'label' | 'relationship' | 'fullLabel'>
  | null
  | undefined;

export function formatBloodlineDisplayValue(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return 'Unknown';
  return trimmed
    .toLowerCase()
    .replace(/(^|[\s/-])([a-z])/g, (_match, prefix: string, letter: string) => {
      return `${prefix}${letter.toUpperCase()}`;
    });
}

export function getBloodlineParentageDisplay(relatedness: ParentageInput): {
  primary: string;
  secondary: string;
  title: string;
} {
  const label = relatedness?.label?.trim() ?? '';
  const relationship = relatedness?.relationship?.trim() ?? '';
  const fullLabel = relatedness?.fullLabel?.trim() ?? '';
  const isFoundation = /foundation stock/i.test(label) || /foundation stock/i.test(relationship);

  if (isFoundation) {
    return {
      primary: 'Unknown',
      secondary: 'Foundation stock, no recorded parents',
      title: fullLabel || label || 'Unknown (foundation stock, no recorded parents)',
    };
  }

  if (!relatedness || relatedness.type === 'unknown') {
    return {
      primary: formatBloodlineDisplayValue(label) || 'Unknown',
      secondary: relationship || 'Parentage not recorded',
      title: fullLabel || label || 'Unknown (not enough lineage data)',
    };
  }

  return {
    primary: formatBloodlineDisplayValue(label),
    secondary: relationship,
    title: fullLabel || label,
  };
}
