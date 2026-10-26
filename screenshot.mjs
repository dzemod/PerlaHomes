// node screenshot.mjs <url> [label] [width] [height] [full=1]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const puppeteer = createRequire(path.join(root, 'tools', 'package.json'))('puppeteer-core');
const [url = 'http://localhost:3000', label, w = '1440', h = '900', full = '1'] = process.argv.slice(2);
const dir = path.join(root, 'temporary screenshots');
fs.mkdirSync(dir, { recursive: true });
const n = fs.readdirSync(dir).filter(f => f.startsWith('screenshot-')).length + 1;
const out = path.join(dir, `screenshot-${n}${label ? '-' + label : ''}.png`);

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h });
await page.goto(url, { waitUntil: 'networkidle0' });
if (full === '1') { // scroll through to trigger lazy images and reveals
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } window.scrollTo(0, 0); });
  await new Promise(r => setTimeout(r, 1800));
}
await page.screenshot({ path: out, fullPage: full === '1' });
await browser.close();
console.log(out);
