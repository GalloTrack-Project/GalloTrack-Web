#!/usr/bin/env node
/**
 * stitch-video.mjs — convert recordings/raw/*.webm → .mp4 and stitch.
 *
 *   node scripts/stitch-video.mjs              # convert + stitch
 *   node scripts/stitch-video.mjs --no-concat   # convert only
 *
 * Output: recordings/scene-NN-*.mp4 + recordings/gallotrack-full.mp4
 * (webm originals kept in recordings/raw/ until you delete them).
 * ffmpeg resolution: PATH → FFMPEG_DIR env → WinGet install locations.
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.env.REC_OUT || 'recordings';
const RAW = join(OUT, 'raw');
const NO_CONCAT = process.argv.includes('--no-concat');

function walk(dir, name, depth) {
  if (depth > 6 || !existsSync(dir)) return null;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isFile() && e.name.toLowerCase() === name + '.exe') return full;
    if (e.isDirectory() && !e.name.startsWith('.')) {
      const hit = walk(full, name, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

function findTool(name) {
  if (process.env.FFMPEG_DIR) {
    const p = join(process.env.FFMPEG_DIR, name + '.exe');
    if (existsSync(p)) return p;
  }
  try {
    execSync(`${name} -version`, { stdio: 'ignore' });
    return name;
  } catch {
    /* not on PATH (agent shells cache env) — search WinGet */
  }
  const base = process.env.LOCALAPPDATA;
  const roots = base ? [join(base, 'Microsoft', 'WinGet', 'Links'), join(base, 'Microsoft', 'WinGet', 'Packages')] : [];
  for (const root of roots) {
    const hit = walk(root, name, 0);
    if (hit) return hit;
  }
  throw new Error(`${name} not found. Install with: winget install Gyan.FFmpeg (or set FFMPEG_DIR)`);
}

function durationSec(tool, file) {
  try {
    const out = execFileSync(tool, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
      encoding: 'utf8',
    });
    return Number.parseFloat(out.trim());
  } catch {
    return NaN;
  }
}

const ffmpeg = findTool('ffmpeg');
const ffprobe = findTool('ffprobe');
console.log(`ffmpeg: ${ffmpeg}`);

if (!existsSync(RAW)) throw new Error(`${RAW} not found — run: npx tsx scripts/record-video.ts`);
// only our named scene files — Playwright can leave hash-named temp copies behind
const webms = readdirSync(RAW)
  .filter((f) => f.endsWith('.webm') && f.startsWith('scene-'))
  .sort();
if (webms.length === 0) throw new Error('no .webm files in ' + RAW);

let total = 0;
const mp4s = [];
for (const f of webms) {
  const src = join(RAW, f);
  const dst = join(OUT, f.replace(/\.webm$/, '.mp4'));
  mp4s.push(dst);
  const needConvert = !existsSync(dst) || existsSync(src) && new Date(src).mtimeMs > new Date(dst).mtimeMs;
  if (needConvert) {
    console.log(`convert ${f} → ${dst}`);
    execFileSync(
      ffmpeg,
      ['-y', '-i', src, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-an', dst],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
  } else {
    console.log(`up-to-date ${f}`);
  }
  const d = durationSec(ffprobe, dst);
  total += d;
  console.log(`  ${dst}  ${d.toFixed(1)}s`);
}

if (!NO_CONCAT) {
  const listPath = join(OUT, 'concat.txt');
  // concat demuxer resolves entries relative to the list file's own directory
  writeFileSync(listPath, mp4s.map((p) => `file '${p.split(/[\\/]/).pop()}'`).join('\n') + '\n');
  const full = join(OUT, 'gallotrack-full.mp4');
  console.log(`stitch ${mp4s.length} clip(s) → ${full}`);
  execFileSync(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', full], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const fullDur = durationSec(ffprobe, full);
  console.log(`  ${full}  ${fullDur.toFixed(1)}s`);
  if (!(Math.abs(fullDur - total) < Math.max(2, total * 0.02))) {
    throw new Error(`stitched duration ${fullDur.toFixed(1)}s != sum of clips ${total.toFixed(1)}s`);
  }
}

console.log(`done — ${mp4s.length} clip(s), ${(total / 60).toFixed(1)} min total.`);
