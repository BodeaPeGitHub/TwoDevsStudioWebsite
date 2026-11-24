import sharp from 'sharp';
import { mkdir, readFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { coffeePrograms } from '../shared/coffee-programs.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const brand = coffeePrograms.acadeea;
const sourcePath = path.join(root, 'artwork-source/acadeea/acadeea-card-v7.png');
const assets = path.join(root, 'public/acadeea/assets');
const out = path.join(root, `public/acadeea/wallet/v1/art/${brand.walletArtVersion}`);
await mkdir(assets, { recursive: true });
await mkdir(out, { recursive: true });
const source = await readFile(sourcePath);
const { width, height } = await sharp(source).metadata();
await copyFile(sourcePath, path.join(assets, 'approved-card-v7.png'));

// Use the official transparent wordmark instead of a textured illustration crop.
// Transparent padding lets the Wallet card's background show through naturally.
const wordmark = path.join(root, 'artwork-source/acadeea/brand/wordmark.png');
await sharp(wordmark).resize(1280, 400, { fit: 'contain', background: '#00000000' })
  .png().toFile(path.join(out, 'wide-logo.png'));
await copyFile(path.join(out, 'wide-logo.png'), path.join(assets, 'acadeea-logo.png'));
await copyFile(path.join(out, 'wide-logo.png'), path.join(assets, 'wide-logo.png'));
// The Passes list uses Acadeea's official browser-tab cupcake icon.
await sharp(path.join(root, 'artwork-source/acadeea/brand/site-icon.png'))
  .resize(660, 660).png().toFile(path.join(out, 'logo.png'));
await copyFile(path.join(out, 'logo.png'), path.join(assets, 'notification-icon.png'));

// Balance overlays use the same coffee/cookie/croissant sequence as the
// approved artwork. The eighth circle stays pink, with no reward lettering.
const xs = [.198, .398, .598, .799], ys = [.667, .881];
const cup = '<path d="M-29-9h49v18a24.5 24.5 0 0 1-49 0zM20-4h7a12 12 0 0 1 0 24h-7M-35 39q31 10 65 0M-11-23q-7-8 0-16t0-16M5-23q-7-8 0-16"/>';
const cookie = '<circle r="33"/><g fill="currentColor" stroke="none"><circle cx="-13" cy="-15" r="4"/><circle cx="12" cy="-19" r="4"/><circle cx="-2" cy="1" r="4"/><circle cx="21" cy="6" r="4"/><circle cx="-18" cy="12" r="4"/><circle cx="8" cy="22" r="4"/></g>';
const croissant = '<path d="M-44 20q-10-17 4-30 0-15 18-18 19-17 38-5 21 1 24 16 15 10 10 29-2 8-10 2-11-12-24-11H-8q-17 0-27 17-5 6-9 0ZM-39-10q17 0 21 17M-22-28q16 9 14 31M16-33q8 15-1 36M40-17q-3 15-14 23"/>';
const icons = [cup, cookie, croissant, cup, cookie, croissant, cup];
for (let count = 0; count <= 7; count++) {
  let stamps = '';
  for (let i = 0; i < count; i++) {
    const x = xs[i % 4] * width, y = ys[Math.floor(i / 4)] * height;
    stamps += `<g transform="translate(${x} ${y})"><circle r="${width * .063}" fill="${brand.accent}"/><g transform="scale(${width / 1120})" fill="none" color="${brand.background}" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${icons[i]}</g></g>`;
  }
  if (count === 7) {
    const x = xs[3] * width + width * .050, y = ys[1] * height - width * .050;
    stamps += `<g transform="translate(${x} ${y})"><circle r="${width * .020}" fill="${brand.ink}"/><path d="m-10 0 7 7 14-17" fill="none" stroke="${brand.background}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${stamps}</svg>`);
  const raster = count ? await sharp(source).composite([{ input: overlay }]).png().toBuffer() : source;
  await sharp(raster).resize(1032, 812).png().toFile(path.join(out, `stamps-7-${count}.png`));
  await copyFile(path.join(out, `stamps-7-${count}.png`), path.join(assets, `stamps-7-${count}.png`));
  // Wallet's web card overlaps the top of the hero image. Keep every part of
  // the artwork below that area, within the same recommended 1032×812 canvas.
  // Contain (never cover) preserves the complete wordmark and all eight circles.
  // The customer website continues to use the original, unpadded stamps file.
  await sharp(raster)
    .resize(1032, 660, { fit: 'contain', background: brand.background })
    .extend({ top: 128, bottom: 24, left: 0, right: 0, background: brand.background })
    .png().toFile(path.join(out, `${brand.walletHeroFilePrefix}-7-${count}.png`));
}
console.log('Created Acadeea logo formats and all eight 7 + reward progress states.');
