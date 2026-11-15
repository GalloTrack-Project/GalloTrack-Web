import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  buildReportHtml,
  escapeHtml,
  preloadReportImage,
  toCsv,
  type ReportDocument,
} from './report-export';

describe('toCsv', () => {
  it('separates rows with CRLF and starts with a UTF-8 BOM', () => {
    const csv = toCsv([
      ['Date', 'Outcome'],
      ['2026-01-05', 'Win'],
    ]);

    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(csv).toContain('Date,Outcome\r\n2026-01-05,Win');
  });

  it('quotes fields that contain commas, quotes or newlines', () => {
    const csv = toCsv([['vs "Big Bird", main event', 'line 1\nline 2']]);

    expect(csv).toContain('"vs ""Big Bird"", main event"');
    expect(csv).toContain('"line 1\nline 2"');
  });

  it('doubles embedded quotes', () => {
    expect(toCsv([['say "hi"']])).toContain('"say ""hi"""');
  });

  it('renders empty cells as an em dash', () => {
    expect(toCsv([['', null, undefined, 'x']])).toBe('\ufeff—,—,—,x');
  });
});

describe('escapeHtml', () => {
  it('escapes the characters that would otherwise break the report markup', () => {
    expect(escapeHtml(`<img src="x" alt='y'>&`)).toBe(
      '&lt;img src=&quot;x&quot; alt=&#39;y&#39;&gt;&amp;',
    );
  });

  it('keeps ordinary text untouched', () => {
    expect(escapeHtml('Kelso 50% · Hatch 50%')).toBe('Kelso 50% · Hatch 50%');
  });
});

const baseReport: ReportDocument = {
  title: 'Gamefowl Profile — Champion',
  meta: '1A · Cock',
  sections: [
    {
      heading: 'Profile',
      fields: [{ label: 'Name', value: 'Champion' }],
    },
    {
      heading: 'Match History',
      table: {
        columns: ['Date', 'Outcome'],
        rows: [],
        emptyText: 'No fights recorded',
      },
    },
  ],
};

describe('buildReportHtml', () => {
  it('renders the logo, framed photo, caption and loaded gallery', () => {
    const html = buildReportHtml({
      ...baseReport,
      brand: { logoSrc: '/brand/logo-mark.svg', logoAlt: 'GalloTrack', name: 'GalloTrack' },
      photo: {
        src: 'https://signed.test/full.webp',
        caption: '1A - Champion',
        alt: 'Champion',
        initials: 'CH',
        noPhotoLabel: 'No photo',
      },
      gallery: {
        heading: 'Gallery',
        images: [{ src: 'https://signed.test/gallery.webp', alt: 'Champion gallery' }],
      },
      footerUrl: 'https://gallotrack.app',
      showPrintFooter: true,
    });

    expect(html).toContain('/brand/logo-mark.svg');
    expect(html).toContain('https://signed.test/full.webp');
    expect(html).toContain('1A - Champion');
    expect(html).toContain('Gallery');
    expect(html).toContain('https://signed.test/gallery.webp');
    expect(html).toContain('Page ');
  });

  it('uses the initials and No photo placeholder instead of a broken image', () => {
    const html = buildReportHtml({
      ...baseReport,
      photo: {
        src: null,
        caption: 'Champion',
        initials: 'CH',
        noPhotoLabel: 'No photo',
      },
    });

    expect(html).not.toContain('class="report-photo-image"');
    expect(html).toContain('CH');
    expect(html).toContain('No photo');
    expect(html).toContain('display:flex');
  });

  it('prints empty tables with the supplied wording and A4 print CSS', () => {
    const html = buildReportHtml(baseReport);

    expect(html).toContain('No fights recorded');
    expect(html).toContain('size: A4 portrait');
    expect(html).toContain('margin: 12mm');
    expect(html).toContain('print-color-adjust: exact');
    expect(html).toContain('break-inside: avoid');
    expect(html).toContain('@media print');
  });
});

describe('preloadReportImage', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('resolves true after load or decode', async () => {
    const instances: Array<{
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
      decode: () => Promise<void>;
    }> = [];
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      decode = () => Promise.resolve();
      constructor() {
        instances.push(this);
      }
    }
    vi.stubGlobal('Image', FakeImage);

    const result = preloadReportImage('https://signed.test/full.webp', 5000);
    expect(instances[0].src).toBe('https://signed.test/full.webp');
    await expect(result).resolves.toBe(true);
  });

  it('resolves false after an image error and after the timeout', async () => {
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      decode = () => Promise.reject(new Error('decode failed'));
      constructor() {
        instances.push(this);
      }
    }
    const instances: FakeImage[] = [];
    vi.stubGlobal('Image', FakeImage);
    vi.useFakeTimers();

    const failed = preloadReportImage('https://signed.test/broken.webp', 5000);
    instances[0].onerror?.();
    await expect(failed).resolves.toBe(false);

    const timedOut = preloadReportImage('https://signed.test/slow.webp', 5000);
    await vi.advanceTimersByTimeAsync(4999);
    let settled = false;
    void timedOut.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(timedOut).resolves.toBe(false);
  });
});
