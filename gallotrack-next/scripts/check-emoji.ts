import { scanEmoji } from '../lib/emoji-guard';

const matches = scanEmoji({ baseDir: process.cwd() });

if (matches.length > 0) {
  console.error(`[check:emoji] Found ${matches.length} emoji character(s):\n`);
  for (const match of matches) {
    console.error(
      `${match.file}:${match.line}:${match.column} ${match.codePoint} ${JSON.stringify(match.char)}`,
    );
  }
  process.exit(1);
}

console.log('[check:emoji] Clean: no emoji found in app source, locale files, or docs.');
