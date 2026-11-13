import fs from 'node:fs';
import path from 'node:path';

export interface EmojiMatch {
  file: string;
  line: number;
  column: number;
  char: string;
  codePoint: string;
}

const EMOJI_RE = /(?:\p{Extended_Pictographic}|\uFE0F)/gu;

const DEFAULT_ROOTS = ['components', 'app', 'lib', 'locales', 'docs'];
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.md']);
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'coverage',
  '__tests__',
  'fixtures',
]);

function isTestFile(file: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(file);
}

export function findEmojiInText(text: string, file = '<fixture>'): EmojiMatch[] {
  const matches: EmojiMatch[] = [];
  text.split(/\r?\n/).forEach((line, lineIndex) => {
    for (const match of line.matchAll(EMOJI_RE)) {
      const char = match[0];
      matches.push({
        file,
        line: lineIndex + 1,
        column: (match.index ?? 0) + 1,
        char,
        codePoint: `U+${char.codePointAt(0)?.toString(16).toUpperCase()}`,
      });
    }
  });
  return matches;
}

function scanDirectory(
  root: string,
  baseDir: string,
  matches: EmojiMatch[],
): void {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, baseDir, matches);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    if (isTestFile(fullPath)) continue;
    const text = fs.readFileSync(fullPath, 'utf8');
    const relative = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    matches.push(...findEmojiInText(text, relative));
  }
}

export function scanEmoji(options?: {
  baseDir?: string;
  roots?: string[];
}): EmojiMatch[] {
  const baseDir = options?.baseDir ?? process.cwd();
  const roots = options?.roots ?? DEFAULT_ROOTS;
  const matches: EmojiMatch[] = [];
  for (const root of roots) {
    const fullRoot = path.join(baseDir, root);
    if (fs.existsSync(fullRoot)) scanDirectory(fullRoot, baseDir, matches);
  }
  return matches;
}
