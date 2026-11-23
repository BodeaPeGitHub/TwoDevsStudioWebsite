import sharp from 'sharp';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { coffeePrograms } from '../shared/coffee-programs.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const review = path.join(root, 'artwork-source/new-cards-review');
const layouts = {
  letscoffee: { xs: [.214, .404, .594, .784], ys: [.64, .825], logo: [.36, .06, .28, .155] },
  orso: { xs: [.203, .398, .593, .788], ys: [.63, .819], logo: [.325, .05, .35, .135] },
  guau: { xs: [.203, .398, .594, .79], ys: [.655, .836], logo: [.325, .037, .35, .16] },
};

// The source raster is the user-approved imagegen artwork, preserved unchanged.
// Native SVG stamps represent application state, just as the existing CUC renderer
// does. Never regenerate an already published immutable artwork directory.
const cup = color => `<g fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M-28-15Q0-18 25-15L23 10Q21 31-3 31Q-27 30-28 10Z"/><path d="M26-10C53-17 54 19 25 17M-36 42Q0 48 34 41M-10-28Q-22-39-10-50M7-28Q-5-40 7-51"/></g>`;
for (const brand of Object.values(coffeePrograms).filter(brand => Object.hasOwn(layouts, brand.slug))) {
  const out = path.join(root, `public/${brand.slug}/wallet/v1/art/v2`);
  const assets = path.join(root, `public/${brand.slug}/assets`);
  await mkdir(out, { recursive: true });
  await mkdir(assets, { recursive: true });
  const sourcePath = path.join(review, brand.artwork);
  const source = await readFile(sourcePath);
  const { width, height } = await sharp(source).metadata();
  await copyFile(sourcePath, path.join(assets, 'approved-card-v2.png'));
  const layout = layouts[brand.slug];
  const [left, top, cropWidth, cropHeight] = layout.logo;
  const wordmark = await sharp(source).extract({ left: Math.round(left * width), top: Math.round(top * height), width: Math.round(cropWidth * width), height: Math.round(cropHeight * height) }).png().toBuffer();
  await sharp(wordmark).resize(1280, 400, { fit: 'contain', background: brand.background }).png().toFile(path.join(out, 'wide-logo.png'));
  await sharp(wordmark).resize(660, 660, { fit: 'contain', background: brand.background }).png().toFile(path.join(out, 'logo.png'));
  await copyFile(path.join(out, 'logo.png'), path.join(assets, `${brand.slug}-logo.png`));
  await copyFile(path.join(out, 'wide-logo.png'), path.join(assets, 'wide-logo.png'));
  for (let count = 0; count <= 7; count++) {
    let marks = '';
    for (let i = 0; i < 8; i++) {
      if (!(i < count || (i === 7 && count === 7))) continue;
      const x = layout.xs[i % 4] * width, y = layout.ys[Math.floor(i / 4)] * height;
      const radius = width * .065;
      const fill = brand.slug === 'orso' ? brand.accent : brand.ink;
      marks += `<g transform="translate(${x} ${y})"><circle r="${radius}" fill="${fill}"/><g transform="translate(0 -6) scale(${width / 1032})">${cup(brand.background)}</g></g>`;
    }
    const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${marks}</svg>`);
    const raster = count ? await sharp(source).composite([{ input: overlay }]).png().toBuffer() : source;
    await sharp(raster).resize(1032, 812, { fit: 'fill' }).png().toFile(path.join(out, `stamps-7-${count}.png`));
    await copyFile(path.join(out, `stamps-7-${count}.png`), path.join(assets, `stamps-7-${count}.png`));
  }
  console.log(`Created ${brand.brand} logo formats and eight progress states for the approved 7 + free card.`);
}
