// Generates the Perla Homes site images with Google Gemini (see GEMINI_IMAGE_GENERATION.md).
// Usage:  node generate-images.mjs            -> generate all missing images
//         node generate-images.mjs hero-villa -> (re)generate selected images
// Reads GOOGLE_AI_API_KEY from ../.env or the environment.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'images', 'raw');
fs.mkdirSync(outDir, { recursive: true });

const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const key = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
if (!key) { console.error('No GOOGLE_AI_API_KEY in .env or environment'); process.exit(1); }

const MODEL = 'gemini-3-pro-image-preview';
const STYLE = 'Quiet luxury editorial style of a high-end architecture magazine. Warm natural light, soft muted palette of deep green, pearl white, warm milk, sand and a hint of gold, natural not oversaturated colours. Straight vertical lines, architecturally correct proportions. Photorealistic, ultra-realistic professional photography, high resolution, 4K. No people, no faces, no text, no letters, no signs, no logos, no brand names, no watermark.';

const IMAGES = [
  ['hero-villa', '16:9', 'Wide view of a modern white Mediterranean villa in the hills of Marbella, Spain, at golden hour turning into early dusk. Clean white cubic volumes, large glass sliding doors with warm lights glowing inside, a long infinity pool in the foreground reflecting the sky, tall palm trees and olive trees, the Mediterranean Sea calm in the far distance under a soft peach and lavender sky. Eye-level wide-angle architectural shot, generous calm sky in the upper part of the frame.'],
  ['property-01', '4:3', 'Contemporary villa in the Benahavís hills near Marbella, Spain. Flat-roofed white and natural stone architecture, floor-to-ceiling glass, rectangular pool on a wide travertine terrace, view over green hills down to the Mediterranean Sea. Soft late-afternoon light, three-quarter view.'],
  ['property-02', '4:3', 'Elegant Andalusian-style villa on the Golden Mile, Marbella. White walls, terracotta roof tiles, a row of graceful arches forming a shaded porch, wrought-iron details, lush manicured garden with bougainvillea, cypress and olive trees, stone path. Warm soft morning light.'],
  ['property-03', '4:3', 'Modern penthouse terrace in Puerto Banús, Marbella, at sunset. Large terrace with natural teak decking, low linen lounge sofa, glass balustrade, potted olive tree, view over the Mediterranean Sea and the marina with distant masts. Warm golden sunset light, calm sea.'],
  ['property-04', '4:3', 'Bright minimalist apartment living room in Estepona, Spain, with a sea view. Pale oak floor, cream linen sofa, travertine coffee table, sheer white curtains, large window and open sliding door to a balcony overlooking the blue Mediterranean Sea. Soft diffused daylight, airy and calm.'],
  ['property-05', '4:3', 'Frontline beach villa on the Costa del Sol, Spain. Low white modern villa with a green lawn garden that leads directly to a sandy beach and the calm sea, two cream sun loungers with folded towels, palm trees, natural stone path. Bright gentle morning light.'],
  ['property-06', '4:3', 'Modern townhouse in Marbella with a private garden. Two-storey white contemporary facade with wooden slats, glass doors opened to a small green lawn with olive tree, lavender and a stone patio, the Sierra Blanca mountains visible in the background. Soft warm afternoon light.'],
  ['property-wide', '21:9', 'Panoramic ultra-wide exterior of a luxury contemporary villa near Marbella at dusk. Long horizontal white architecture with cantilevered roofs, glass walls glowing with warm interior light, a long illuminated infinity pool in front reflecting the deep blue evening sky, palm silhouettes, the sea and a faint horizon glow. Symmetrical eye-level composition.'],
  ['costa-sea', '4:3', 'Calm Mediterranean coastline near Marbella, Spain, in soft morning light. Quiet sandy beach, gentle clear water, a low rocky point, hazy mountains along the coast in the distance, pale sky. Serene, minimal composition.'],
  ['costa-golf', '4:3', 'Lush green golf course on the Costa del Sol near Marbella, rolling fairway with a flag on a manicured green, umbrella pines and olive trees, the Sierra Blanca mountains behind. Soft warm morning light, no people.'],
  ['costa-yacht', '4:3', 'Elegant white yachts moored in Puerto Banús marina, Marbella, at golden hour. Calm water with soft reflections, white hulls and teak decks, distant mountains under a warm sky. No people, no visible names on the boats.'],
  ['costa-oldtown', '4:3', 'Narrow white-washed street in Marbella old town, Spain. Cobblestone path, white walls with pots of red geraniums and bougainvillea, a wooden door, wrought-iron balcony, soft morning sunlight and gentle shadows. No people, no shop signs.'],
  ['pearl-underwater', '16:9', 'Underwater photograph in open clear turquoise sea, far from any shore or object. Soft sunlight rays streaming down diagonally from the rippled water surface into deep blue-green water, tiny particles floating, an empty smooth sandy seabed far below. No pillars, no columns, no structures, no rocks, no animals. Calm, meditative, minimal, lots of empty water.'],
  ['pearl-shell', '4:5', 'A single natural lustrous white pearl resting in an open oyster shell with iridescent nacre, placed on smooth wet sand at the water edge, a thin film of seawater. Close-up macro still life, soft warm natural light, very minimal composition with lots of empty space.'],
  ['cta-terrace', '21:9', 'Elegant terrace overlooking the Mediterranean Sea at sunset near Marbella. Two cream outdoor chairs and a small round stone table with two glasses, potted olive tree, travertine floor, glass balustrade, the sun low over a calm sea, warm golden light. Wide cinematic composition with empty space on the left and right.'],
  ['contact-facade', '21:9', 'Close-up of the white lime-plastered facade of a Mediterranean villa in Marbella, Spain: an elegant tall arched doorway with a recessed dark wooden door, simple stone threshold, a potted olive tree beside it. Soft rippling reflections of sea water light (caustics) dance across the white wall, cast by sunlit water nearby, late afternoon warm low sun, gentle long shadows. Calm, premium, architectural, a sea mood. Straight frontal composition with generous empty white wall on the right side.'],
];

async function generate(name, aspect, prompt) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${prompt} ${STYLE}` }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect, imageSize: '2K' } },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) throw new Error('No image in response: ' + JSON.stringify(data).slice(0, 400));
  const ext = part.inlineData.mimeType.includes('png') ? 'png' : 'jpg';
  const file = path.join(outDir, `${name}.${ext}`);
  fs.writeFileSync(file, Buffer.from(part.inlineData.data, 'base64'));
  return file;
}

const only = process.argv.slice(2);
for (const [name, aspect, prompt] of IMAGES) {
  const exists = fs.readdirSync(outDir).some(f => f.startsWith(name + '.'));
  if (only.length ? !only.includes(name) : exists) continue;
  try { console.log('OK', await generate(name, aspect, prompt)); }
  catch (e) { console.error('FAIL', name, e.message); }
}
