import { describe, it, expect } from 'vitest';
import { escapeHtml, toCsv } from './report-export';

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
