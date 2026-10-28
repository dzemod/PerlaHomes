// Official Perla logo → site assets.
// Source: brand_assets/logo_perla.png (892×892, round emblem on white; never modified).
// The emblem fills the frame, so it is cut to the largest inscribed circle with an
// anti-aliased transparent edge — no white corners. Nothing is redrawn or recoloured.
// Usage: node tools/make-logo.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
sharp.cache(false); // OneDrive: avoid stale handles when overwriting

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'brand_assets', 'logo_perla.png');
const img = path.join(root, 'site', 'assets', 'img');
const GREEN_900 = '#16302A';

const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2;

// RGBA with a circular, 1px anti-aliased alpha edge
const rgba = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    const a = Math.max(0, Math.min(1, R - d - 0.5)); // edge pulled in 0.5px so no white bleeds into the fringe
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
}
const round = () => sharp(rgba, { raw: { width: W, height: H, channels: 4 } });

for (const size of [512, 256]) {
  const buf = await round().resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
  fs.writeFileSync(path.join(img, `logo-perla-${size}.png`), await sharp(buf).png({ compressionLevel: 9 }).toBuffer());
  fs.writeFileSync(path.join(img, `logo-perla-${size}.webp`), await sharp(buf).webp({ quality: 90, alphaQuality: 100 }).toBuffer());
}

// Favicons
const site = path.join(root, 'site');
fs.writeFileSync(path.join(site, 'favicon-32.png'), await round().resize(32, 32, { kernel: 'lanczos3' }).png().toBuffer());
fs.writeFileSync(path.join(site, 'icon-512.png'), await round().resize(512, 512, { kernel: 'lanczos3' }).png().toBuffer());
// iOS fills transparency with black, so the touch icon sits on the brand's darkest green
const emblem = await round().resize(164, 164, { kernel: 'lanczos3' }).png().toBuffer();
fs.writeFileSync(path.join(site, 'apple-touch-icon.png'),
  await sharp({ create: { width: 180, height: 180, channels: 4, background: GREEN_900 } })
    .composite([{ input: emblem, left: 8, top: 8 }]).png().toBuffer());

console.log('logo assets written');
