import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FowlRecord, MatchRecord } from './types';
import {
  buildProfileReportDocument,
  buildProfileReportMeta,
  buildProfileReportSections,
  initialsOf,
  prepareProfileReportAssets,
  profilePhotoCaption,
  withProfileReportAssets,
  type ProfileReportLabels,
} from './profile-report';

const mocks = vi.hoisted(() => ({
  resolveFreshChickenPhotoUrl: vi.fn(),
  resolveChickenPhotoUrl: vi.fn(),
  preloadReportImage: vi.fn(),
}));

vi.mock('./chicken-photo', () => ({
  resolveFreshChickenPhotoUrl: mocks.resolveFreshChickenPhotoUrl,
  resolveChickenPhotoUrl: mocks.resolveChickenPhotoUrl,
}));

vi.mock('./report-export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./report-export')>();
  return {
    ...actual,
    preloadReportImage: mocks.preloadReportImage,
  };
});

const labels: ProfileReportLabels = {
  profile: 'Profile',
  bloodline: 'Bloodline Composition',
  performance: 'Performance Metrics',
  matchHistory: 'Match History',
  breeding: 'Breeding',
  totalFights: 'Total fights',
  wins: 'Wins',
  losses: 'Losses',
  draws: 'Draws',
  overallWinRate: 'Overall win rate (all time)',
  noFightsRecorded: 'No fights recorded',
  offspring: 'Offspring',
  pairingHistory: 'Pairing history',
  pairing: 'Pairing',
  partner: 'Partner',
  status: 'Status',
};

function bird(overrides: Partial<FowlRecord> = {}): FowlRecord {
  return {
    id: 1,
    name: 'Champion Stag',
    breed: 'Hatch',
    gender: 'Rooster',
    color: 'Red',
    color_category: 'Red',
    growth_stage: 'Stag',
    behavior_trait: '',
    eye_variant: '',
    birthdate: '2025-01-01',
    age: '1y',
    weight: '2.4',
    height: '40',
    leg_color: 'Yellow',
    sire: 'Sire One',
    dam: 'Dam A',
    status: 'Active',
    ...overrides,
  } as FowlRecord;
}

function cockFights(): MatchRecord[] {
  return [
    {
      id: 1,
      date: '2026-02-01',
      entry_name: 'Champion Stag',
      breed: 'Hatch',
      opponent: 'Opponent One',
      opponent_breed: 'Lemon',
      location: 'Arena',
      type: 'Derby',
      event_type: 'Main',
      outcome: 'Win',
      status: 'Completed',
      post_fight_condition: 'Fit',
    } as MatchRecord,
  ];
}

const record = { wins: 1, losses: 0, draws: 0, winRate: 100 };

describe('profile report labels and structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses Cock or Hen instead of the raw stored value', () => {
    expect(buildProfileReportMeta(bird(), { code: '1A', breed: 'Hatch', status: 'Active' })).toBe(
      '1A · Hatch · Cock · Active',
    );
    expect(
      buildProfileReportMeta(bird({ gender: 'Hen' }), {
        code: 'E',
        breed: 'Hatch',
        status: 'Active',
      }),
    ).toContain('Hen');
    expect(
      buildProfileReportMeta(bird({ gender: 'Rooster' }), {
        code: '1',
        breed: 'Hatch',
        status: 'Active',
      }),
    ).not.toContain('Rooster');
  });

  it('builds the photo caption and initials with the expected wording', () => {
    expect(profilePhotoCaption('1A', 'Champion Stag')).toBe('1A - Champion Stag');
    expect(profilePhotoCaption('', 'Champion Stag')).toBe('Champion Stag');
    expect(initialsOf('Champion Stag')).toBe('CS');
    expect(initialsOf('Champion')).toBe('CH');
  });

  it('keeps Performance Metrics, win rate and Match History for a cock', () => {
    const sections = buildProfileReportSections({
      bird: bird(),
      fights: cockFights(),
      record,
      profileFields: [{ label: 'Name', value: 'Champion Stag' }],
      bloodlineRows: [['Hatch', 100]],
      labels,
      breeding: {
        offspring: 4,
        pairings: [{ pairing: '1A', partner: 'Dam A', status: 'Active', offspring: 4 }],
      },
    });

    expect(sections.map((section) => section.heading)).toEqual([
      'Profile',
      'Bloodline Composition',
      'Performance Metrics',
      'Match History',
    ]);
    expect(sections[2].fields).toContainEqual({
      label: 'Overall win rate (all time)',
      value: '100%',
    });
    expect(sections[3].table?.rows).toHaveLength(1);
  });

  it('shows No fights recorded and hides Match History for a cock with no fights', () => {
    const sections = buildProfileReportSections({
      bird: bird(),
      fights: [],
      record: { wins: 0, losses: 0, draws: 0, winRate: null },
      profileFields: [],
      bloodlineRows: [],
      labels,
    });

    expect(sections.map((section) => section.heading)).toEqual([
      'Profile',
      'Bloodline Composition',
      'Performance Metrics',
    ]);
    expect(sections[2].fields).toContainEqual({
      label: 'Total fights',
      value: 'No fights recorded',
    });
    expect(sections[2].fields).toContainEqual({
      label: 'Overall win rate (all time)',
      value: '—%',
    });
    expect(sections.some((section) => section.heading === 'Match History')).toBe(false);
  });

  it('omits performance, win rate and match history for a hen and shows breeding data', () => {
    const sections = buildProfileReportSections({
      bird: bird({ gender: 'Hen' }),
      fights: cockFights(),
      record,
      profileFields: [],
      bloodlineRows: [],
      labels,
      breeding: {
        offspring: 3,
        pairings: [{ pairing: '1A', partner: 'Sire One', status: 'Completed', offspring: 3 }],
      },
    });

    expect(sections.map((section) => section.heading)).not.toContain('Performance Metrics');
    expect(sections.map((section) => section.heading)).not.toContain('Match History');
    const breeding = sections.find((section) => section.heading === 'Breeding');
    expect(breeding).toBeDefined();
    expect(breeding?.fields).toContainEqual({ label: 'Offspring', value: '3' });
    expect(breeding?.table?.rows).toEqual([['1A', 'Sire One', 'Completed', 3]]);
  });

  it('omits the Breeding section when a hen has no breeding data', () => {
    const sections = buildProfileReportSections({
      bird: bird({ gender: 'Hen' }),
      fights: [],
      record: { wins: 0, losses: 0, draws: 0, winRate: null },
      profileFields: [],
      bloodlineRows: [],
      labels,
      breeding: { offspring: 0, pairings: [] },
    });

    expect(sections.map((section) => section.heading)).toEqual(['Profile', 'Bloodline Composition']);
  });

  it('keeps the profile fields and values passed by the modal unchanged', () => {
    const profileFields = [
      { label: 'Bird code', value: '1A' },
      { label: 'Sire', value: 'Sire One' },
      { label: 'Dam', value: 'Dam A' },
    ];
    const sections = buildProfileReportSections({
      bird: bird(),
      fights: [],
      record: { wins: 0, losses: 0, draws: 0, winRate: null },
      profileFields,
      bloodlineRows: [['Hatch', 100]],
      labels,
    });

    expect(sections[0].fields).toEqual(profileFields);
    expect(sections[1].table?.rows).toEqual([['Hatch', 100]]);
  });
});

describe('prepareProfileReportAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveFreshChickenPhotoUrl.mockResolvedValue('https://signed.test/full.webp');
    mocks.resolveChickenPhotoUrl.mockResolvedValue('https://signed.test/gallery.webp');
    mocks.preloadReportImage.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requests a fresh full-size URL and waits for the photo before resolving', async () => {
    const result = await prepareProfileReportAssets({
      photoPath: 'user-1/42/full.webp',
      imageUrl: 'https://legacy.test/photo.jpg',
      galleryUrls: ['a.webp', 'b.webp', 'c.webp', 'd.webp'],
    });

    expect(mocks.resolveFreshChickenPhotoUrl).toHaveBeenCalledWith('user-1/42/full.webp');
    expect(result.photoSrc).toBe('https://signed.test/full.webp');
    expect(result.gallerySrcs).toHaveLength(3);
    expect(mocks.preloadReportImage).toHaveBeenCalledWith(
      'https://signed.test/full.webp',
      5000,
    );
  });

  it('falls back to image_url when the full path cannot be signed', async () => {
    mocks.resolveFreshChickenPhotoUrl.mockResolvedValue(null);
    const result = await prepareProfileReportAssets({
      photoPath: 'user-1/42/full.webp',
      imageUrl: 'https://legacy.test/photo.jpg',
    });

    expect(result.photoSrc).toBe('https://legacy.test/photo.jpg');
  });

  it('returns the placeholder state when the image fails to load', async () => {
    mocks.preloadReportImage.mockResolvedValue(false);
    const result = await prepareProfileReportAssets({
      photoPath: 'user-1/42/full.webp',
      imageUrl: 'https://legacy.test/photo.jpg',
    });

    expect(result.photoSrc).toBeNull();
    expect(result.photoFailed).toBe(true);
    expect(result.gallerySrcs).toEqual([]);
  });

  it('does not settle until the image preload resolves or times out', async () => {
    let releaseImage: (loaded: boolean) => void = () => {};
    mocks.preloadReportImage.mockReturnValue(
      new Promise<boolean>((resolve) => {
        releaseImage = resolve;
      }),
    );

    const pending = prepareProfileReportAssets({
      photoPath: 'user-1/42/full.webp',
    });
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    releaseImage?.(true);
    await expect(pending).resolves.toMatchObject({
      photoSrc: 'https://signed.test/full.webp',
      photoFailed: false,
    });
  });

  it('does not report a photo failure when the bird has no photo', async () => {
    const result = await prepareProfileReportAssets({
      photoPath: null,
      imageUrl: '',
    });

    expect(result.photoSrc).toBeNull();
    expect(result.photoFailed).toBe(false);
    expect(mocks.resolveFreshChickenPhotoUrl).not.toHaveBeenCalled();
  });

  it('skips gallery images that fail to resolve or load', async () => {
    mocks.resolveChickenPhotoUrl
      .mockResolvedValueOnce('https://signed.test/a.webp')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('https://signed.test/c.webp');
    mocks.preloadReportImage
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await prepareProfileReportAssets({
      photoPath: null,
      imageUrl: null,
      galleryUrls: ['a.webp', 'b.webp', 'c.webp'],
    });

    expect(result.gallerySrcs).toEqual(['https://signed.test/a.webp']);
  });

  it('calls the print callback only after the photo preload settles', async () => {
    let releaseImage: (loaded: boolean) => void = () => {};
    mocks.preloadReportImage.mockReturnValue(
      new Promise<boolean>((resolve) => {
        releaseImage = resolve;
      }),
    );
    const print = vi.fn();

    const pending = withProfileReportAssets(
      { photoPath: 'user-1/42/full.webp' },
      print,
    );
    await Promise.resolve();
    expect(print).not.toHaveBeenCalled();

    releaseImage(true);
    await pending;
    expect(print).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledWith(
      expect.objectContaining({ photoSrc: 'https://signed.test/full.webp' }),
    );
  });
});

describe('buildProfileReportDocument', () => {
  it('includes the brand, photo placeholder and gallery metadata', () => {
    const doc = buildProfileReportDocument({
      bird: bird({ gender: 'Hen' }),
      code: 'E',
      breed: 'Hatch',
      sections: [],
      photoSrc: 'https://signed.test/full.webp',
      gallerySrcs: ['https://signed.test/gallery.webp'],
      noPhotoLabel: 'No photo',
      galleryHeading: 'Gallery',
    });

    expect(doc.title).toContain('Champion Stag');
    expect(doc.meta).toContain('Hen');
    expect(doc.meta).not.toContain('Rooster');
    expect(doc.brand?.logoSrc).toBe('/brand/logo-mark.svg');
    expect(doc.photo?.caption).toBe('E - Champion Stag');
    expect(doc.gallery?.images).toHaveLength(1);
    expect(doc.footerUrl).toBe('https://gallotrack.app');
  });
});
