import { readFileSync } from 'node:fs';
import { coffeePrograms } from '../shared/coffee-programs.mjs';

const root = new URL('../', import.meta.url);
const link = JSON.parse(readFileSync(new URL('.vercel/project.json', root), 'utf8'));
if (link.projectId !== 'prj_R1ktU7jfQ5sQQP36l6tpaZQa7rWV') throw new Error('Use the existing Two Devs Studio Vercel project.');
const secrets = JSON.parse(readFileSync(new URL('.vercel/new-coffee-secrets.json', root), 'utf8'));
const origin = 'https://www.twodevsstudio.com';
const option = process.argv.indexOf('--program');
const selectedSlug = option < 0 ? null : process.argv[option + 1];
if (option >= 0 && !Object.hasOwn(coffeePrograms, selectedSlug)) throw new Error('Choose a known coffee program.');

// Configure the real classes through the Vercel backend. Sensitive production
// Google/service-role credentials stay in Vercel and are never downloaded.
for (const brand of Object.values(coffeePrograms).filter(brand => !selectedSlug || brand.slug === selectedSlug)) {
  let cookie;
  const send = async (route, payload) => {
    const response = await fetch(`${origin}/api/${brand.slug}/${route}`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(90000),
    });
    let data;
    try { data = await response.json(); } catch { throw new Error(`${brand.brand}: Vercel did not return JSON (${response.status}).`); }
    if (!response.ok) throw new Error(`${brand.brand}: ${data.error || response.status}`);
    return { response, data };
  };
  try {
    const login = await send('admin/login', { password: secrets[brand.slug].password });
    cookie = login.response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    if (!cookie) throw new Error(`${brand.brand}: Staff session not available.`);
    const { data } = await send('admin/settings', {
      programName: brand.name, threshold: 7,
      assetBase: `${origin}/${brand.slug}/wallet/v1`, background: brand.background,
    });
    if (!data.walletSynced) throw new Error(`${brand.brand}: ${data.warning || 'Wallet class configuration is pending.'}`);
    console.log(`Configured ${brand.brand} Google Wallet class through its own Vercel backend.`);
  } finally {
    if (cookie) await send('admin/logout', {}).catch(() => {});
  }
}
