import type { MatchRecord, FowlRecord } from './types';
import type { ChickenMatchStats } from './win-rate';
import { canFight, sexLabel } from './helpers';
import { resolveChickenPhotoUrl, resolveFreshChickenPhotoUrl } from './chicken-photo';
import {
  REPORT_IMAGE_TIMEOUT_MS,
  preloadReportImage,
  type ReportDocument,
  type ReportField,
  type ReportPhoto,
  type ReportSection,
} from './report-export';

export const PROFILE_REPORT_LOGO_SRC = '/brand/logo-mark.svg';
export const PROFILE_REPORT_LOGO_ALT = 'GalloTrack';
export const PROFILE_REPORT_URL = 'https://gallotrack.app';
export const PROFILE_REPORT_TITLE = 'Gamefowl Profile';

export function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function profilePhotoCaption(code: string | null | undefined, name: string): string {
  const cleanCode = (code || '').trim();
  return cleanCode ? `${cleanCode} - ${name}` : name;
}

export function buildProfileReportPhoto(input: {
  src?: string | null;
  code?: string | null;
  name: string;
  noPhotoLabel: string;
}): ReportPhoto {
  const caption = profilePhotoCaption(input.code, input.name);
  return {
    src: input.src ?? null,
    caption,
    alt: caption,
    initials: initialsOf(input.name),
    noPhotoLabel: input.noPhotoLabel,
  };
}

export function buildProfileReportMeta(
  bird: FowlRecord,
  values: { code?: string | null; breed?: string | null; status?: string | null },
): string {
  return [values.code, values.breed, sexLabel(bird), values.status]
    .map((value) => (value || '').trim())
    .filter(Boolean)
    .join(' · ');
}

export type ProfilePairingRow = {
  pairing: string;
  partner: string;
  status: string;
  offspring: number;
};

export type ProfileBreedingSummary = {
  offspring: number;
  pairings: ProfilePairingRow[];
};

export type ProfileReportLabels = {
  profile: string;
  bloodline: string;
  performance: string;
  matchHistory: string;
  breeding: string;
  totalFights: string;
  wins: string;
  losses: string;
  draws: string;
  overallWinRate: string;
  noFightsRecorded: string;
  offspring: string;
  pairingHistory: string;
  pairing: string;
  partner: string;
  status: string;
};

export function buildProfileReportSections(input: {
  bird: FowlRecord;
  fights: MatchRecord[];
  record: Pick<ChickenMatchStats, 'wins' | 'losses' | 'draws' | 'winRate'>;
  profileFields: ReportField[];
  bloodlineRows: (string | number | null | undefined)[][];
  breeding?: ProfileBreedingSummary | null;
  labels: ProfileReportLabels;
}): ReportSection[] {
  const { bird, fights, record, profileFields, bloodlineRows, breeding, labels } = input;
  const sections: ReportSection[] = [
    {
      heading: labels.profile,
      fields: profileFields,
    },
    {
      heading: labels.bloodline,
      table: {
        columns: ['Strain', 'Share %'],
        rows: bloodlineRows,
      },
    },
  ];

  if (canFight(bird)) {
    sections.push({
      heading: labels.performance,
      fields: [
        {
          label: labels.totalFights,
          value: fights.length === 0 ? labels.noFightsRecorded : String(fights.length),
        },
        { label: labels.wins, value: String(record.wins) },
        { label: labels.losses, value: String(record.losses) },
        { label: labels.draws, value: String(record.draws) },
        {
          label: labels.overallWinRate,
          value: record.winRate === null ? '—%' : `${record.winRate}%`,
        },
      ],
    });

    if (fights.length > 0) {
      sections.push({
        heading: labels.matchHistory,
        table: {
          columns: [
            'Date',
            'Opponent',
            'Breed',
            'Event',
            'Outcome',
            'Location',
            'Post-Fight Condition',
          ],
          rows: fights.map((match) => [
            match.date,
            match.opponent,
            [match.breed, match.opponent_breed].filter(Boolean).join(' vs '),
            [match.event_type, match.type].filter(Boolean).join(' · '),
            match.outcome,
            match.location,
            match.post_fight_condition,
          ]),
        },
      });
    }
    return sections;
  }

  const hasBreedingData = breeding && (breeding.offspring > 0 || breeding.pairings.length > 0);
  if (!hasBreedingData) return sections;

  sections.push({
    heading: labels.breeding,
    fields: [{ label: labels.offspring, value: String(breeding.offspring) }],
    table:
      breeding.pairings.length > 0
        ? {
            heading: labels.pairingHistory,
            columns: [labels.pairing, labels.partner, labels.status, labels.offspring],
            rows: breeding.pairings.map((pairing) => [
              pairing.pairing,
              pairing.partner,
              pairing.status,
              pairing.offspring,
            ]),
          }
        : undefined,
  });

  return sections;
}

export type ProfileReportAssets = {
  photoSrc: string | null;
  photoFailed: boolean;
  gallerySrcs: string[];
};

/**
 * Resolve the full-size photo with a fresh signed URL at print time, then wait
 * for it (and any gallery photos) to decode. A failed main photo falls back to
 * the neutral "No photo" box; failed gallery photos are simply skipped.
 */
export async function prepareProfileReportAssets(input: {
  photoPath?: string | null;
  imageUrl?: string | null;
  galleryUrls?: string[];
  timeoutMs?: number;
}): Promise<ProfileReportAssets> {
  const timeoutMs = input.timeoutMs ?? REPORT_IMAGE_TIMEOUT_MS;
  const fullPath = (input.photoPath || '').trim();
  const legacyUrl = (input.imageUrl || '').trim();

  let photoSrc = fullPath ? await resolveFreshChickenPhotoUrl(fullPath) : null;
  if (!photoSrc && legacyUrl) photoSrc = legacyUrl;

  const galleryUrls = (input.galleryUrls ?? []).filter(Boolean).slice(0, 3);
  const [photoLoaded, gallerySrcs] = await Promise.all([
    photoSrc ? preloadReportImage(photoSrc, timeoutMs) : Promise.resolve(false),
    Promise.all(
      galleryUrls.map(async (url) => {
        const resolved = await resolveChickenPhotoUrl(url);
        if (!resolved) return null;
        const loaded = await preloadReportImage(resolved, timeoutMs);
        return loaded ? resolved : null;
      }),
    ),
  ]);

  return {
    photoSrc: photoSrc && photoLoaded ? photoSrc : null,
    photoFailed: Boolean(photoSrc) && !photoLoaded,
    gallerySrcs: gallerySrcs.filter((url): url is string => Boolean(url)),
  };
}

/**
 * Wait for the report assets, then run the print callback. Keeping the order
 * here makes it impossible for a caller to open the dialog before the photo
 * has loaded or the timeout has elapsed.
 */
export async function withProfileReportAssets(
  input: Parameters<typeof prepareProfileReportAssets>[0],
  onReady: (assets: ProfileReportAssets) => void,
): Promise<ProfileReportAssets> {
  const assets = await prepareProfileReportAssets(input);
  onReady(assets);
  return assets;
}

export function buildProfileReportDocument(input: {
  bird: FowlRecord;
  code?: string | null;
  breed?: string | null;
  sections: ReportSection[];
  photoSrc: string | null;
  gallerySrcs: string[];
  noPhotoLabel: string;
  galleryHeading: string;
}): ReportDocument {
  return {
    title: `${PROFILE_REPORT_TITLE} — ${input.bird.name}`,
    meta: buildProfileReportMeta(input.bird, {
      code: input.code,
      breed: input.breed,
      status: input.bird.status,
    }),
    sections: input.sections,
    photo: buildProfileReportPhoto({
      src: input.photoSrc,
      code: input.code,
      name: input.bird.name,
      noPhotoLabel: input.noPhotoLabel,
    }),
    gallery:
      input.gallerySrcs.length > 0
        ? {
            heading: input.galleryHeading,
            images: input.gallerySrcs.map((src, index) => ({
              src,
              alt: `${input.bird.name} gallery photo ${index + 1}`,
            })),
          }
        : undefined,
    brand: {
      logoSrc: PROFILE_REPORT_LOGO_SRC,
      logoAlt: PROFILE_REPORT_LOGO_ALT,
      name: 'GalloTrack',
    },
    footerUrl: PROFILE_REPORT_URL,
  };
}
