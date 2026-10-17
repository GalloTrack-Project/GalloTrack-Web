import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Build ICO file from PNG buffers (16x16, 32x32, 48x48)
// ICO format:
// 6-byte header: 0,0, 1,0 (type 1 for icon), count (2 bytes)
// For each image: 16 bytes directory entry
// [width, height, colors, reserved, planes(2), bpp(2), bytesize(4), offset(4)]
// followed by raw PNG data
function buildIco(pngBuffersWithSizes) {
  const count = pngBuffersWithSizes.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  let offset = 6 + count * 16;
  const entries = [];
  const datas = [];

  for (const { size, buffer } of pngBuffersWithSizes) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette (0 = no palette)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // Size of image data in bytes
    entry.writeUInt32LE(offset, 12); // Offset to image data
    entries.push(entry);
    datas.push(buffer);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...datas]);
}

// Design the official GalloTrack brand vector icon
// - Dark green rounded square tile (brand tokens: #064e3b -> #022c22)
// - Subtle emerald border (#10b981)
// - Shield contour from GalloTrack landing navbar/login (#059669 with vibrant emerald accent)
// - Stylized rooster glyph from ChickenIcon centered inside the shield
function createSvg({ size = 512, padding = 0, isMaskable = false, solidBg = false } = {}) {
  // If maskable, safe zone is 80% (10% padding on each side)
  const scale = isMaskable ? 0.76 : (solidBg ? 0.85 : 0.90);
  const cx = 256;
  const cy = 256;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <!-- Background Gradient: Rich GalloTrack Emerald -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="60%" stop-color="#043a2c" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>

    <!-- Shield Inner Gradient -->
    <linearGradient id="shieldFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#065f46" />
      <stop offset="100%" stop-color="#042f24" />
    </linearGradient>

    <!-- Shield Border Gradient -->
    <linearGradient id="shieldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>

    <!-- Subtle Top-Down Highlight -->
    <linearGradient id="tileBorder" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#34d399" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#059669" stop-opacity="0.2" />
    </linearGradient>

    <filter id="shadow" x="-10%" y="-10%" width="120%" height="125%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.4" />
    </filter>
  </defs>

  ${solidBg ? `
  <!-- Full bleed solid background for apple-icon / maskable -->
  <rect width="512" height="512" fill="url(#bgGrad)" />
  ` : `
  <!-- Rounded tile for favicon / standard app icon -->
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#bgGrad)" />
  <rect x="17" y="17" width="478" height="478" rx="111" fill="none" stroke="url(#tileBorder)" stroke-width="4" />
  `}

  <g transform="translate(${cx}, ${cy}) scale(${scale}) translate(-256, -256)" filter="url(#shadow)">
    <!-- Brand Shield (from GalloTrack landing/login/OG mark) -->
    <!-- ViewBox 24x24 mapped to 512x512 with margin -->
    <!-- Original path: M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z -->
    <!-- Scaled: center (12, 12) -> center 256, size ~ 380px -->
    <g transform="translate(256, 250) scale(18.5) translate(-12, -11.5)">
      <!-- Shield Fill & Stroke -->
      <path
        d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z"
        fill="url(#shieldFill)"
        stroke="url(#shieldStroke)"
        stroke-width="1.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Inside Shield: Rooster Silhouette (from ChickenIcon / Gamefowl mark) -->
      <!-- Scaled and centered inside shield -->
      <g transform="translate(12, 11) scale(0.64) translate(-12, -12)">
        <!-- Comb (bold gold/amber accent) -->
        <path
          d="M13.2 5c-.5-1.2-.5-2.5.2-3.4.6.9 1 1.8 1.1 2.7.4-1.2 1.1-2.1 2-2.4.1 1 .1 2-.1 2.9"
          fill="#fbbf24"
        />
        <!-- Beak (sharp gold beak) -->
        <path d="M17.5 6.2 21.2 7.3l-3.7 1.1Z" fill="#f59e0b" />
        <!-- Head, arching neck, gamefowl breast & body (pure crisp white) -->
        <path
          d="M14.5 3.4c1.7 0 3 1.3 3.1 3 .1.9-.1 1.7-.5 2.3-.2.9-.4 1.9-.5 2.8.3 1.7.2 3.6-.5 5.2-.8 1.9-2.4 3.2-4.3 3.5-1.9.3-3.6-.5-4.5-1.9-.4-.6-.6-1.3-.6-2-.8-2.7-2.1-5.7-3.5-8.1-.6-1-1.1-1.9-1.2-2.6-.1-.5.4-.8.8-.4 1.6 1.5 3.4 3.5 4.5 5.4 1.2-.7 2.5-1.2 3.8-1.2 1.1 0 2-.9 2.5-2.2.3-1.1.5-2.5.7-3.7Z"
          fill="#ffffff"
        />
        <!-- Wing detail highlight (mint green / emerald accent) -->
        <path
          d="M9.3 15c2-1.5 4.5-1 5.8.9-1.6 1.6-4.1 2-5.8 1v-1.9Z"
          fill="#6ee7b7"
        />
        <!-- Eye -->
        <circle cx="15.7" cy="6" r="0.9" fill="#042f24" />
      </g>
    </g>
  </g>
</svg>`;
}

async function run() {
  console.log('Generating GalloTrack Favicon and Icon suite...');

  const baseSvg = createSvg({ size: 512, solidBg: false });
  const appleSvg = createSvg({ size: 512, solidBg: true });
  const maskableSvg = createSvg({ size: 512, isMaskable: true, solidBg: true });

  // 1. Write app/icon.svg (App Router vector icon)
  const appDir = path.resolve('app');
  const publicDir = path.resolve('public');

  fs.writeFileSync(path.join(appDir, 'icon.svg'), baseSvg, 'utf8');
  console.log('✓ Created app/icon.svg');

  // 2. Generate PNG buffers at 16x16, 32x32, 48x48 for favicon.ico
  const p16 = await sharp(Buffer.from(baseSvg)).resize(16, 16).png().toBuffer();
  const p32 = await sharp(Buffer.from(baseSvg)).resize(32, 32).png().toBuffer();
  const p48 = await sharp(Buffer.from(baseSvg)).resize(48, 48).png().toBuffer();

  const icoBuffer = buildIco([
    { size: 16, buffer: p16 },
    { size: 32, buffer: p32 },
    { size: 48, buffer: p48 },
  ]);

  // Write app/favicon.ico and public/favicon.ico for compatibility
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('✓ Created app/favicon.ico and public/favicon.ico (16, 32, 48px)');

  // 3. Apple Touch Icon (180x180 solid background)
  const p180 = await sharp(Buffer.from(appleSvg)).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), p180);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), p180);
  console.log('✓ Created app/apple-icon.png (180x180)');

  // 4. PWA Icons (192x192, 512x512, and maskable 512x512)
  const p192 = await sharp(Buffer.from(baseSvg)).resize(192, 192).png().toBuffer();
  const p512 = await sharp(Buffer.from(baseSvg)).resize(512, 512).png().toBuffer();
  const pMaskable = await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toBuffer();

  fs.writeFileSync(path.join(publicDir, 'icon-192x192.png'), p192);
  fs.writeFileSync(path.join(publicDir, 'icon-512x512.png'), p512);
  fs.writeFileSync(path.join(publicDir, 'icon-maskable-512x512.png'), pMaskable);
  console.log('✓ Created public/icon-192x192.png, public/icon-512x512.png, public/icon-maskable-512x512.png');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
