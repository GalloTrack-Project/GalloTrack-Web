import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.avif', '.bmp',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.pdf', '.zip', '.gz', '.7z', '.rar', '.xlsx', '.xls', '.docx', '.doc',
  '.mp3', '.mp4', '.mov', '.webm', '.wav', '.ogg', '.bin', '.exe', '.dll', '.wasm',
]);

// Built from codepoints so this file never contains the mojibake it detects.
// The regexes match the cp1252 decoding of a UTF-8 lead byte plus a continuation
// byte (for example U+2014 em dash -> bytes E2 80 94), which is the corruption
// signature we have actually observed in this repository.
const MOJIBAKE_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: 'cp1252 mojibake lead E2 80', re: /\u00e2\u20ac/ },
  { label: 'cp1252 mojibake lead E2 9C', re: /\u00e2\u0153/ },
  { label: 'cp1252 mojibake lead E2 94', re: /\u00e2\u201d/ },
  { label: 'cp1252 mojibake lead E2 95', re: /\u00e2\u2022/ },
  { label: 'cp1252 mojibake lead E2 86', re: /\u00e2\u2020/ },
  { label: 'cp1252 mojibake lead C3 97', re: /\u00c3\u2014/ },
  { label: 'cp1252 mojibake lead C2 B7', re: /\u00c2\u00b7/ },
  { label: 'UTF-8 BOM rendered as text', re: /\u00ef\u00bb\u00bf/ },
  { label: 'Unicode replacement character U+FFFD', re: /\ufffd/ },
];

type Violation = { file: string; line: number; kind: string; detail: string };

function listTrackedFiles(): string[] {
  const out = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  return out.split('\0').filter(Boolean);
}

function checkFile(relPath: string): Violation[] {
  const violations: Violation[] = [];
  const absPath = resolve(root, relPath);
  const bytes = readFileSync(absPath);

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    violations.push({ file: relPath, line: 1, kind: 'utf8-bom', detail: 'UTF-8 BOM at start of file' });
  }
  if (bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff))) {
    violations.push({ file: relPath, line: 1, kind: 'utf16-bom', detail: 'UTF-16 BOM detected; expected UTF-8' });
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    violations.push({ file: relPath, line: 1, kind: 'invalid-utf8', detail: 'File is not valid UTF-8' });
    return violations;
  }

  const crlf = (text.match(/\r\n/g) || []).length;
  const lfOnly = (text.match(/(?<!\r)\n/g) || []).length;
  const loneCr = (text.match(/\r(?!\n)/g) || []).length;
  if ((crlf > 0 && (lfOnly > 0 || loneCr > 0)) || loneCr > 0) {
    violations.push({
      file: relPath,
      line: 1,
      kind: 'mixed-line-endings',
      detail: `CRLF=${crlf}, LF=${lfOnly}, loneCR=${loneCr}`,
    });
  }

  const lines = text.split(/\r\n|\r|\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of MOJIBAKE_PATTERNS) {
      if (pattern.re.test(lines[i])) {
        violations.push({
          file: relPath,
          line: i + 1,
          kind: 'mojibake',
          detail: `${pattern.label}: ${lines[i].trim().slice(0, 80)}`,
        });
        break;
      }
    }
  }

  return violations;
}

const files = listTrackedFiles().filter((rel) => !BINARY_EXTENSIONS.has(extname(rel).toLowerCase()));
const violations = files.flatMap(checkFile);

if (violations.length > 0) {
  console.error(`[check:encoding] ${violations.length} encoding issue(s) found:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} [${v.kind}] ${v.detail}`);
  }
  process.exitCode = 1;
} else {
  console.log(`[check:encoding] Clean: ${files.length} files checked (UTF-8, no BOM/mojibake, consistent EOL).`);
}
