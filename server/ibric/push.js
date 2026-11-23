import { program, programEnv } from './program.js';
import { ECDH, randomUUID } from 'node:crypto';
import webpush from 'web-push';
import { database, result } from './database.js';
import { digest } from './auth.js';

const invalid = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
export const pushPublicKey = () => programEnv('PUSH_PUBLIC_KEY') || '';
export const pushConfigured = () => !!(pushPublicKey() && programEnv('PUSH_PRIVATE_KEY') && programEnv('PUSH_WORKER_SECRET'));

// Subscriptions are untrusted input. Only known browser push services are allowed;
// never let a customer turn the sender into an HTTP client for arbitrary URLs.
function endpointUrl(value) {
  let url;
  try { url = new URL(value); } catch { invalid('Abonamentul de notificări nu este valid.'); }
  const allowed = url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com' ||
    url.hostname === 'web.push.apple.com' || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname);
  if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || url.href.length > 2048) {
    invalid('Serviciul de notificări al acestui browser nu este acceptat.');
  }
  return url.href;
}

function subscriptionInput(input) {
  const endpoint = endpointUrl(input?.endpoint);
  const { p256dh, auth } = input?.keys || {};
  if (typeof p256dh !== 'string' || !/^[A-Za-z0-9_-]{87}={0,1}$/.test(p256dh) ||
      typeof auth !== 'string' || !/^[A-Za-z0-9_-]{22}={0,2}$/.test(auth)) invalid('Cheile abonamentului nu sunt valide.');
  try {
    const key = Buffer.from(p256dh, 'base64url');
    if (key.length !== 65 || key[0] !== 4 || Buffer.from(auth, 'base64url').length !== 16) throw new Error();
    ECDH.convertKey(key, 'prime256v1');
  } catch { invalid('Cheile abonamentului nu sunt valide.'); }
  return { endpoint, p256dh, auth };
}

export async function savePushSubscription(member, input) {
  if (input.consent !== `${program().slug}-offers-v1` || input.applicationServerKey !== pushPublicKey()) invalid('Confirmă activarea notificărilor pentru acest browser.');
  const value = subscriptionInput(input.subscription);
  const db = database();
  const previous = result(await db.from('ibric_push_subscriptions').select('id,member_id').eq('endpoint', value.endpoint).maybeSingle());
  if (previous && previous.member_id !== member.id) {
    throw Object.assign(new Error('Acest browser este asociat altui card. Dezactivează întâi notificările existente.'), { status: 409 });
  }
  const values = {
    ...value, member_id: member.id, application_server_key: pushPublicKey(), active: true,
    consent_version: `${program().slug}-offers-v1`, consent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const saved = result(await (previous
    ? db.from('ibric_push_subscriptions').update(values).eq('id', previous.id).eq('member_id', member.id)
    : db.from('ibric_push_subscriptions').insert(values)).select('id').single());
  // The unique endpoint prevents duplicate notifications for the same browser.
  return { subscribed: true, id: saved.id };
}

export async function findPushSubscription(member, endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) invalid('Abonament invalid.');
  const row = result(await database().from('ibric_push_subscriptions').select('id,active,application_server_key')
    .eq('member_id', member.id).eq('endpoint', endpoint).maybeSingle());
  return row && row.active && row.application_server_key === pushPublicKey() ? row : null;
}

export async function removePushSubscription(member, endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) invalid('Abonament invalid.');
  result(await database().from('ibric_push_subscriptions').update({ active: false, updated_at: new Date().toISOString() })
    .eq('member_id', member.id).eq('endpoint', endpoint));
  return { subscribed: false };
}

export async function enqueuePush({ id, header, body, memberId = null, actor }) {
  const response = await database().rpc('ibric_enqueue_push', {
    p_id: id, p_header: header, p_body: body, p_member: memberId, p_actor: actor, p_key: pushPublicKey(),
  });
  if (response.error?.message.includes('push_no_subscribers')) {
    throw Object.assign(new Error('Nu există browsere abonate pentru destinatarii aleși.'), { status: 409 });
  }
  result(response);
}

function options(ttl, id) {
  return { vapidDetails: {
    subject: `https://www.twodevsstudio.com/${program().slug}`, publicKey: pushPublicKey(), privateKey: programEnv('PUSH_PRIVATE_KEY'),
  }, TTL: ttl, timeout: 10000, urgency: 'normal', topic: digest(id).slice(0, 32) };
}

export async function sendSubscriptionPreview(member, endpoint) {
  const row = await findPushSubscription(member, endpoint);
  if (!row) throw Object.assign(new Error('Activează notificările înainte de previzualizare.'), { status: 409 });
  const subscription = result(await database().from('ibric_push_subscriptions').select('*').eq('id', row.id).single());
  try {
    endpointUrl(subscription.endpoint);
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify({ title: program().name, body: 'Notificările sunt activate. Ne vedem la o cafea!', tag: `${program().slug}-preview`, url: `/${program().slug}` }), options(300, row.id));
  } catch (error) {
    if ([404, 410].includes(error.statusCode)) {
      await removePushSubscription(member, endpoint);
      throw Object.assign(new Error('Abonamentul a expirat. Dezactivează și reactivează notificările.'), { status: 409 });
    }
    throw Object.assign(new Error('Serviciul de notificări nu răspunde momentan. Reîncearcă.'), { status: 502 });
  }
  return { accepted: true };
}

export async function pushOverview() {
  return { ready: pushConfigured(), ...result(await database().rpc('ibric_push_overview', { p_key: pushPublicKey() })) };
}

// The outbox survives requests and closed dashboards. Expiring leases permit
// recovery after a terminated Vercel invocation. Acceptance is not a read receipt.
export async function processPushQueue({ budgetMs = 35000 } = {}) {
  if (!pushConfigured()) throw Object.assign(new Error('Notificările web nu sunt configurate.'), { status: 503 });
  const db = database(), deadline = Date.now() + budgetMs;
  let processed = 0;
  while (Date.now() < deadline) {
    const token = randomUUID();
    const jobs = result(await db.rpc('ibric_claim_push', { p_token: token, p_limit: 5 }));
    if (!jobs.length) break;
    const [subscriptions, campaigns] = await Promise.all([
      db.from('ibric_push_subscriptions').select('*').in('id', jobs.map(j => j.subscription_id)).then(result),
      db.from('ibric_push_campaigns').select('*').in('id', [...new Set(jobs.map(j => j.campaign_id))]).then(result),
    ]);
    await Promise.all(jobs.map(async job => {
      const sub = subscriptions.find(s => s.id === job.subscription_id);
      const campaign = campaigns.find(c => c.id === job.campaign_id);
      let patch = { status: 'skipped', error: null, lease_token: null, lease_until: null };
      const ttl = campaign ? Math.floor((Date.parse(campaign.expires_at) - Date.now()) / 1000) : 0;
      if (ttl <= 0) patch.status = 'expired';
      else if (job.attempts > 6) Object.assign(patch, { status: 'failed', error: 'Limita de reîncercări a fost atinsă.' });
      else if (sub?.active && sub.application_server_key === pushPublicKey()) {
        try {
          // Validate stored endpoints as well, to keep imported rows safe.
          endpointUrl(sub.endpoint);
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: campaign.header, body: campaign.body, url: `/${program().slug}`, tag: `${program().slug}-${campaign.id}` }), options(ttl, campaign.id));
          Object.assign(patch, { status: 'accepted', accepted_at: new Date().toISOString() });
        } catch (error) {
          const code = error.statusCode;
          if ([404, 410].includes(code)) {
            result(await db.from('ibric_push_subscriptions').update({ active: false, updated_at: new Date().toISOString() }).eq('id', sub.id));
            patch.status = 'expired';
          } else {
            const retry = !error.status && (!code || code === 429 || code >= 500) && job.attempts < 6;
            const retryAfter = Number(error.headers?.['retry-after']);
            const delay = Math.max(Math.min(3600, 30 * 2 ** job.attempts), Number.isFinite(retryAfter) ? Math.min(86400, retryAfter) : 0);
            Object.assign(patch, { status: retry ? 'pending' : 'failed',
              next_attempt_at: new Date(Date.now() + delay * 1000).toISOString(),
              error: code ? `Serviciul push a răspuns HTTP ${code}.` : 'Trimiterea nu a fost confirmată de serviciul push.' });
          }
        }
      }
      result(await db.from('ibric_push_deliveries').update(patch).eq('campaign_id', job.campaign_id)
        .eq('subscription_id', job.subscription_id).eq('lease_token', token));
    }));
    processed += jobs.length;
  }
  return { processed };
}
