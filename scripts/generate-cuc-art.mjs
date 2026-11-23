import sharp from 'sharp';
import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'public/cuc/wallet/v5/art/v2');
const source = path.join(root, 'public/cuc/assets/cuc-logo.png');
const logoData = (await readFile(source)).toString('base64');
// Preserve the approved official logo silhouette in cream ink on the mug.
const mugLogo = `<defs><filter id="cuc-cream" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.996078 0 0 0 0 1 0 0 0 0 0.929412 0 0 0 1 0"/></filter></defs><image x="-45" y="0" width="92" height="47" preserveAspectRatio="xMidYMid meet" filter="url(#cuc-cream)" href="data:image/png;base64,${logoData}"/>`;
const cream = '#FEFFED', ink = '#902639', pale = '#E8D2CB';
await mkdir(out, { recursive: true });
const star = (x, y, r, color) => `<path d="M${x} ${y-r}Q${x+3} ${y-3} ${x+r} ${y}Q${x+3} ${y+3} ${x} ${y+r}Q${x-3} ${y+3} ${x-r} ${y}Q${x-3} ${y-3} ${x} ${y-r}" fill="${color}"/>`;
const cup = (color, fill) => `<g stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M-25-13Q-4-17 22-13L19 9Q17 28-3 28Q-24 27-25 8Z" fill="${fill}"/><path d="M23-8C48-14 47 16 22 14M-32 36Q-1 41 29 35M-10-26Q-22-37-10-46M5-26Q-6-37 6-48" fill="none"/></g>`;

function hero(threshold, count) {
  const cells = threshold + 1;
  const cols = cells <= 8 ? 4 : cells <= 10 ? 5 : cells <= 18 ? 6 : 8;
  const rows = Math.ceil(cells / cols), step = Math.min(150, 410 / rows);
  const radius = Math.min(62, step * .39), xStep = 920 / cols;
  let stamps = '';
  for (let i = 0; i < cells; i++) {
    const reward = i === threshold, active = i < count, unlocked = reward && count >= threshold;
    const row = Math.floor(i / cols), inRow = Math.min(cols, cells - row * cols);
    const x = 516 + (i % cols - (inRow - 1) / 2) * xStep;
    const y = 330 + step / 2 + row * step;
    stamps += `<g transform="translate(${x} ${y}) rotate(${i % 2 ? 5 : -4})"><circle r="${radius}" fill="${active || unlocked ? ink : reward ? pale : cream}" stroke="${ink}" stroke-opacity="${active || reward ? 1 : .35}" stroke-width="${reward ? 3 : 2}" ${!active && !reward ? 'stroke-dasharray="3 8" stroke-linecap="round"' : ''}/><g transform="translate(0 -1) scale(${radius/70})">${cup(active || unlocked ? cream : ink, active || unlocked ? 'none' : cream)}</g>${reward ? star(radius*.72, -radius*.72, 15, ink) + `<text y="${radius + 28}" text-anchor="middle" fill="${ink}" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="2">GRATIS</text>` : ''}</g>`;
  }
  // Custom vector artwork: a generous ceramic mug and hand-drawn stamp grid.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1032" height="812" viewBox="0 0 1032 812"><rect width="1032" height="812" fill="${cream}"/><path d="M70 35H962" stroke="${ink}" stroke-opacity=".2" stroke-width="2"/><g transform="translate(510 175) rotate(-6)" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="0" cy="104" rx="122" ry="15" fill="${pale}"/><path d="M-124 98Q0 135 126 98" fill="none" stroke="${ink}" stroke-width="5"/><path d="M77-26C146-46 147 57 73 51" fill="none" stroke="${ink}" stroke-width="17"/><path d="M-84-37Q-84 48-51 73Q-2 106 48 76Q79 55 80-37Z" fill="${ink}"/><ellipse cx="-2" cy="-37" rx="82" ry="27" fill="${cream}" stroke="${ink}" stroke-width="5"/><ellipse cx="-2" cy="-37" rx="68" ry="19" fill="#650D23"/><path d="M-2-25C-67-42-25-62-3-43C19-62 63-42-2-25Z" fill="${cream}"/><path d="M-2-28L-2-49" stroke="#650D23" stroke-width="2"/><path d="M-63-6Q-62 43-38 55" fill="none" stroke="${cream}" stroke-opacity=".65" stroke-width="6"/>${mugLogo}<path d="M-35-84C-59-106-22-111-38-119M1-84C-21-109 18-112 4-121M36-84C16-104 54-111 39-117" fill="none" stroke="${ink}" stroke-width="5"/></g>${star(240,150,27,ink)}${star(806,205,18,ink)}${stamps}<path d="M90 772H942" stroke="${ink}" stroke-opacity=".2" stroke-width="2"/></svg>`;
}

// Reuse the official CUC logo unchanged on the Wallet format canvases.
const logo = await sharp(source).resize(510, 360, { fit: 'inside' }).toBuffer();
await sharp({ create: { width: 660, height: 660, channels: 4, background: cream } })
  .composite([{ input: logo, gravity: 'centre' }]).png().toFile(path.join(out, 'logo.png'));
const wordmark = await sharp(source).resize(550, 290, { fit: 'inside' }).toBuffer();
const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="400"><path d="M660 100V300" stroke="${ink}" stroke-opacity=".35" stroke-width="2"/><g fill="${ink}" font-family="Arial,sans-serif" font-size="43" letter-spacing="7"><text x="716" y="183">COFFEE</text><text x="716" y="248">CLUB</text></g></svg>`);
await sharp({ create: { width: 1280, height: 400, channels: 4, background: cream } })
  .composite([{ input: wordmark, left: 52, top: 60 }, { input: label }]).png().toFile(path.join(out, 'wide-logo.png'));
await copyFile(path.join(out, 'wide-logo.png'), path.join(root, 'public/cuc/assets/wide-logo.png'));
for (let threshold = 1; threshold <= 30; threshold++) {
  for (let count = 0; count <= threshold; count++) {
    const svg = hero(threshold, count), filename = `stamps-${threshold}-${count}.png`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(out, filename));
    if (threshold === 7) await copyFile(path.join(out, filename), path.join(root, 'public/cuc/assets', filename));
    if (threshold === 7 && [0, 4, 7].includes(count)) {
      await writeFile(path.join(root, 'public/cuc/assets', `stamps-${threshold}-${count}.svg`), svg);
    }
  }
}
console.log('Created CUC logos and all 495 stamp images (thresholds 1–30).');
