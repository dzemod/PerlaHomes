// Selected properties → site images.
// Source: images/properties-raw/<slug>/ (unzipped client galleries, not committed).
// Picks were chosen by eye: no text, logos, name signs, watermarks, plans or maps.
// Index 0 = main card photo (shown 4:3 via object-fit), the rest are extras for a later gallery.
// Output: site/assets/img/properties/<slug>/<slug>-N.webp (1600w) and <slug>-N-800.webp (800w), quality 80.
// Usage: node tools/make-properties.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
sharp.cache(false); // OneDrive: avoid stale handles when overwriting

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = path.join(root, 'images', 'properties-raw');
const out = path.join(root, 'site', 'assets', 'img', 'properties');

const PICKS = {
  'jardines-de-las-lagunas-2': ['JDL II_garden02.jpeg', 'jardinesII-1.jpg', 'jardinesII-2.jpg', 'jardinesII-4.jpg'],
  biubay: ['04.jpg', '06.jpg', '21.jpg', '17.jpg'],
  'atelier-4': ['001.jpg', '003.jpg', '014.png', '006.jpg'],
  'santa-clara-homes': ['13 - santa clara.jpg', '02 - santa clara.jpg', '07 - santa clara.jpg', '05 - santa clara.jpg'],
  lakun: ['LAKUN-IMG05.jpg', 'LAKUN-IMG04.jpg', 'LAKUN-IMG10.jpg', 'LAKUN-IMG03.jpg'],
  'elysea-suites': ['Elysea-1.jpg', 'Elysea-2.jpg', 'Elysea-7.jpg', 'Elysea-9.jpg'],
};

// galleries may keep their photos in a sub-folder
const find = (dir, name) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { const hit = find(p, name); if (hit) return hit; } else if (e.name === name) return p;
  }
  return null;
};

for (const [slug, files] of Object.entries(PICKS)) {
  const dir = path.join(out, slug);
  fs.mkdirSync(dir, { recursive: true });
  for (const [i, name] of files.entries()) {
    const src = find(path.join(raw, slug), name);
    if (!src) throw new Error(`missing ${slug}/${name}`);
    for (const [w, suffix] of [[1600, ''], [800, '-800']]) {
      await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 })
        .toFile(path.join(dir, `${slug}-${i + 1}${suffix}.webp`));
    }
  }
  console.log(slug, 'ok');
}
