// images/raw/*  ->  images/<name>.jpg + .webp (max 2400px)
//                ->  site/assets/img/<name>-<w>.jpg + .webp (responsive sizes)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
sharp.cache(false); // OneDrive keeps cached handles open otherwise

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = path.join(root, 'images', 'raw');
const imgDir = path.join(root, 'images');
const siteDir = path.join(root, 'site', 'assets', 'img');
fs.mkdirSync(siteDir, { recursive: true });

const WIDTHS = [640, 1280, 1920, 2400];

const only = process.argv.slice(2);
for (const f of fs.readdirSync(rawDir)) {
  const name = path.parse(f).name;
  if (only.length && !only.includes(name)) continue;
  const src = sharp(path.join(rawDir, f)).rotate();
  const { width } = await src.metadata();
  const full = src.clone().resize({ width: Math.min(width, 2400), withoutEnlargement: true });
  await full.clone().jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(imgDir, `${name}.jpg`));
  await full.clone().webp({ quality: 80 }).toFile(path.join(imgDir, `${name}.webp`));
  for (const w of WIDTHS.filter(w => w <= width)) {
    const r = src.clone().resize({ width: w });
    await r.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(siteDir, `${name}-${w}.jpg`));
    await r.clone().webp({ quality: 76 }).toFile(path.join(siteDir, `${name}-${w}.webp`));
  }
  console.log('done', name, width);
}

// Portrait crops for phones (art direction): full-bleed photos are cover-cropped there,
// so a narrow crop is much lighter than the wide original.  name -> [aspect w/h, horizontal centre 0..1]
const MOBILE_CROPS = { 'hero-villa': [9 / 16, 0.6], 'property-wide': [3 / 4, 0.5], 'contact-facade': [3 / 4, 0.68] };
for (const [name, [aspect, cx]] of Object.entries(MOBILE_CROPS)) {
  if (only.length && !only.includes(name)) continue;
  const file = fs.readdirSync(rawDir).find((f) => path.parse(f).name === name);
  if (!file) continue;
  const buf = fs.readFileSync(path.join(rawDir, file));
  const { width, height } = await sharp(buf).metadata();
  const w = Math.round(height * aspect);
  const left = Math.min(width - w, Math.max(0, Math.round(width * cx - w / 2)));
  const crop = sharp(buf).extract({ left, top: 0, width: w, height });
  for (const out of [640, 960]) {
    const r = crop.clone().resize({ width: out });
    await r.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(siteDir, `${name}-m-${out}.jpg`));
    await r.clone().webp({ quality: 74 }).toFile(path.join(siteDir, `${name}-m-${out}.webp`));
  }
  console.log('mobile crop', name, w, height);
}
