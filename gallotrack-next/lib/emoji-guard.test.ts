import { describe, expect, it } from 'vitest';
import { findEmojiInText, scanEmoji } from './emoji-guard';

describe('emoji guard', () => {
  it('detects emoji and variation selectors in a fixture', () => {
    const matches = findEmojiInText('Clean text then \u{1F389} and \u2694\uFE0F');
    expect(matches).toHaveLength(3);
    expect(matches.map((match) => match.char)).toEqual(['\u{1F389}', '\u2694', '\uFE0F']);
    expect(matches[0]).toMatchObject({
      file: '<fixture>',
      line: 1,
      codePoint: 'U+1F389',
    });
  });

  it('passes on the repository source, locale files, and docs', () => {
    const matches = scanEmoji({ baseDir: process.cwd() });
    expect(matches).toEqual([]);
  });
});
