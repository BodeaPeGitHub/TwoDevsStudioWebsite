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
const refreshDesign = process.argv.includes('--refresh-design');
if (refreshDesign && !selectedSlug) throw new Error('Choose one program before refreshing existing cards.');

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
  const read = async route => {
    const response = await fetch(`${origin}/api/${brand.slug}/${route}`, {
      headers: { Cookie: cookie }, signal: AbortSignal.timeout(90000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`${brand.brand}: ${data.error || response.status}`);
    return data;
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
    if (refreshDesign) {
      // Refresh only existing members of the explicitly selected shop. The
      // backend's per-member lease always uses the latest saved balance/name.
      let offset = 0, refreshed = 0;
      do {
        const page = await read(`admin/members?offset=${offset}`);
        for (const member of page.members) {
          const { data: updated } = await send(`admin/members/${member.id}/sync`, { refreshDesign: true });
          if (!updated.walletSynced) throw new Error(`${brand.brand}: an existing card could not be refreshed; retry the scoped setup.`);
          refreshed++;
        }
        if (!page.hasMore) break;
        offset += 25;
        if (offset > 10000) throw new Error('Member pagination limit reached; remaining cards need a scoped refresh.');
      } while (true);
      console.log(`Refreshed the Wallet design for ${refreshed} existing ${brand.brand} cards.`);
    }
  } finally {
    if (cookie) await send('admin/logout', {}).catch(() => {});
  }
}
