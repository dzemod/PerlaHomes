// images/raw/*  ->  images/<name>.jpg + .webp (max 2400px)
//                ->  site/assets/img/<name>-<w>.jpg + .webp (responsive sizes)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = path.join(root, 'images', 'raw');
const imgDir = path.join(root, 'images');
const siteDir = path.join(root, 'site', 'assets', 'img');
fs.mkdirSync(siteDir, { recursive: true });

const WIDTHS = [640, 1280, 1920, 2400];

for (const f of fs.readdirSync(rawDir)) {
  const name = path.parse(f).name;
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
