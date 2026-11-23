import sharp from 'sharp';
import { mkdir, readFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { coffeePrograms } from '../shared/coffee-programs.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const brand = coffeePrograms.brewkai;
const sourcePath = path.join(root, 'artwork-source/brewkai/brewkai-card-v1.png');
const assets = path.join(root, 'public/brewkai/assets');
const out = path.join(root, 'public/brewkai/wallet/v1/art/v2');
await mkdir(assets, { recursive: true });
await mkdir(out, { recursive: true });
const source = await readFile(sourcePath);
const { width, height } = await sharp(source).metadata();
await copyFile(sourcePath, path.join(assets, 'approved-card-v1.png'));

// Technical logo formats from the approved illustration. The source is preserved.
const baseLeft = Math.round(width * .28), baseTop = Math.round(height * .008);
// Separate the emblem and two text lines so the mascot's nearby ear does not
// become part of the technical header logo crop.
const pieces = [];
for (const [x, y, w, h] of [[.28, .008, .103, .192], [.399, .008, .531, .116], [.439, .126, .491, .074]]) {
  const rect = { left: Math.round(width * x), top: Math.round(height * y), width: Math.round(width * w), height: Math.round(height * h) };
  pieces.push({ input: await sharp(source).extract(rect).png().toBuffer(), left: rect.left - baseLeft, top: rect.top - baseTop });
}
const wordmark = await sharp({ create: { width: Math.ceil(width * .65) + 2, height: Math.ceil(height * .192) + 2, channels: 4, background: brand.background } })
  .composite(pieces).png().toBuffer();
await sharp(wordmark).resize(1280, 400, { fit: 'contain', background: brand.background }).png().toFile(path.join(out, 'wide-logo.png'));
await copyFile(path.join(out, 'wide-logo.png'), path.join(assets, 'wide-logo.png'));
await copyFile(path.join(out, 'wide-logo.png'), path.join(assets, 'brewkai-logo.png'));
const size = Math.round(width * .145);
await sharp(source).extract({
  left: Math.round(width * .828 - size / 2), top: Math.round(height * .846 - size / 2), width: size, height: size,
}).resize(660, 660, { fit: 'contain', background: brand.background }).png().toFile(path.join(out, 'logo.png'));

const xs = [.169, .39, .61, .828], ys = [.643, .846];
const cup = `<g fill="none" stroke="${brand.background}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M-28-10Q-3-15 25-10L22 11Q19 31-4 31Q-25 29-28 11Z"/><path d="M25-5C51-12 51 20 23 18M-34 40Q-2 45 31 39M-7-22Q-17-30-8-39Q6-50-1-58M8-22Q1-30 13-40"/></g>`;
// Native SVG stamp overlays represent changing balances; the approved character,
// paper, empty stamp outlines and cat reward artwork stay intact in every state.
for (let count = 0; count <= 7; count++) {
  let stamps = '';
  for (let i = 0; i < count; i++) {
    const x = xs[i % 4] * width, y = ys[Math.floor(i / 4)] * height;
    stamps += `<g transform="translate(${x} ${y})"><circle r="${width * .064}" fill="${brand.accent}"/><g transform="translate(0 -4) scale(${width / 1032})">${cup}</g></g>`;
  }
  if (count === 7) {
    const x = xs[3] * width + width * .053, y = ys[1] * height - width * .053;
    stamps += `<g transform="translate(${x} ${y})"><circle r="${width * .022}" fill="${brand.ink}"/><path d="m-12 0 8 8 16-19" fill="none" stroke="${brand.background}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${stamps}</svg>`);
  const raster = count ? await sharp(source).composite([{ input: overlay }]).png().toBuffer() : source;
  await sharp(raster).resize(1032, 812).png().toFile(path.join(out, `stamps-7-${count}.png`));
  await copyFile(path.join(out, `stamps-7-${count}.png`), path.join(assets, `stamps-7-${count}.png`));
}
console.log('Created Brewkai logo formats and all eight 7 + free card progress states.');
