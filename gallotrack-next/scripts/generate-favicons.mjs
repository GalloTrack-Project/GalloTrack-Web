import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const appDir = path.resolve('app');
const publicDir = path.resolve('public');
const markPath = path.join(publicDir, 'brand', 'logo-mark.svg');
const markSvg = fs.readFileSync(markPath, 'utf8');
const markBuffer = Buffer.from(markSvg);

// Build ICO file from PNG buffers (16x16, 32x32, 48x48).
function buildIco(pngBuffersWithSizes) {
  const count = pngBuffersWithSizes.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const entries = [];
  const datas = [];

  for (const { size, buffer } of pngBuffersWithSizes) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    datas.push(buffer);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...datas]);
}

async function png(size = 512) {
  return sharp(markBuffer).resize(size, size).png().toBuffer();
}

async function maskablePng(size = 512) {
  const inner = Math.round(size * 0.8);
  const mark = await sharp(markBuffer).resize(inner, inner).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: '#022C22',
    },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function run() {
  console.log('Generating GalloTrack favicon and app icons from logo-mark.svg...');

  fs.writeFileSync(path.join(appDir, 'icon.svg'), markSvg);
  console.log('Created app/icon.svg');

  const p16 = await png(16);
  const p32 = await png(32);
  const p48 = await png(48);
  const ico = buildIco([
    { size: 16, buffer: p16 },
    { size: 32, buffer: p32 },
    { size: 48, buffer: p48 },
  ]);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), ico);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);
  console.log('Created app/favicon.ico and public/favicon.ico');

  const apple = await png(180);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), apple);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), apple);
  console.log('Created app/apple-icon.png and public/apple-touch-icon.png');

  fs.writeFileSync(path.join(publicDir, 'icon-192x192.png'), await png(192));
  fs.writeFileSync(path.join(publicDir, 'icon-512x512.png'), await png(512));
  fs.writeFileSync(path.join(publicDir, 'icon-maskable-512x512.png'), await maskablePng(512));
  console.log('Created PWA icons from logo-mark.svg');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
