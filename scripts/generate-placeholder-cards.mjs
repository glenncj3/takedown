// Generates a placeholder PNG for each card in src/data/cards.json. Each
// PNG is a colored rectangle with the card's name centered on it. The
// output goes to public/images/<id>.png; running `npm run images:convert`
// afterward emits AVIF and WebP siblings that the <picture> element
// prefers in the browser.
//
// This is one-shot scaffolding so a designer can replace the PNGs later
// without changing any code or data.

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const cardsJsonPath = path.join(root, 'src', 'data', 'cards.json');
const outDir = path.join(root, 'public', 'images');

const PALETTES = [
  { from: '#1e40af', to: '#3730a3' }, // blue → indigo
  { from: '#7e22ce', to: '#581c87' }, // purple
  { from: '#9d174d', to: '#831843' }, // pink
  { from: '#b45309', to: '#7c2d12' }, // amber → brown
  { from: '#15803d', to: '#14532d' }, // emerald
  { from: '#0e7490', to: '#155e75' }, // cyan
];

function pickPalette(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c],
  );
}

function svg(card, palette) {
  return `<svg width="240" height="320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${palette.from}" />
      <stop offset="1" stop-color="${palette.to}" />
    </linearGradient>
  </defs>
  <rect width="240" height="320" rx="20" fill="url(#g)" />
  <rect x="14" y="14" width="212" height="292" rx="12" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2" />
  <text x="120" y="170" text-anchor="middle" font-size="26" font-family="Arial, Helvetica, sans-serif" fill="#ffffff" font-weight="700" letter-spacing="1">${escapeXml(card.name)}</text>
</svg>`;
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const force = process.argv.includes('--force');
  const cards = JSON.parse(await readFile(cardsJsonPath, 'utf8'));

  for (const card of cards) {
    const out = path.join(outDir, `${card.id}.png`);
    if (!force && (await exists(out))) {
      console.log('Skipped (exists)', path.relative(root, out));
      continue;
    }
    const buf = await sharp(Buffer.from(svg(card, pickPalette(card.id))))
      .png()
      .toBuffer();
    await writeFile(out, buf);
    console.log('Generated', path.relative(root, out));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
