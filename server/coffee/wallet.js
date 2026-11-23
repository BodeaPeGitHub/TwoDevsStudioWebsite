import { program, classId } from './program.js';
import { createPrivateKey, randomUUID, sign } from 'node:crypto';
import { database, result, memberById, settings } from './database.js';
import { walletPresentation, walletClassDesign } from './wallet-design.mjs';
let privateKey, cachedToken;
export function walletConfigured() {
  const env = process.env;
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && /^\d+$/.test(env.GOOGLE_WALLET_ISSUER_ID || '') &&
    classId()?.startsWith(`${env.GOOGLE_WALLET_ISSUER_ID}.`) &&
    (program().slug === 'ibric' || classId() !== env.GOOGLE_WALLET_CLASS_ID) && env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
}
function signJwt(payload) {
  privateKey ??= createPrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'));
  const unsigned = `${Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  return `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url')}`;
}
async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expires > now + 60) return cachedToken.token;
  const assertion = signJwt({ iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, scope: 'https://www.googleapis.com/auth/wallet_object.issuer', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(12000) });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error('Autentificarea Google Wallet a eșuat.');
  cachedToken = { token: data.access_token, expires: now + Number(data.expires_in || 3600) };
  return cachedToken.token;
}
export async function walletClient() {
  const token = await accessToken();
  return async (resource, method = 'GET', body) => {
    const response = await fetch(`https://walletobjects.googleapis.com/walletobjects/v1/${resource}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000),
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error('Google Wallet nu a putut finaliza actualizarea.'), {
      statusCode: response.status, googleMessage: data.error?.message,
      // A general API 429 is retryable, not proof that notification quota ran out.
      quota: /QuotaExceededException|notification.*(?:quota|limit|exceed|too many)|(?:quota|limit|exceed|too many).*notification/i.test(JSON.stringify(data.error || {})),
    });
    return data;
  };
}
function presentation(member, config) {
  return walletPresentation({ stampCount: member.stamp_count, rewardThreshold: member.reward_threshold }, config.asset_base, program());
}
function savedMessageStatus(message, notify, previousStatus) {
  if (!notify) return 'not_requested';
  const type = String(message.messageType || 'TEXT').replace(/_/g, '').toLowerCase();
  if (type === 'textandnotify') return 'accepted';
  return previousStatus === 'quota_reached' ? 'quota_reached' : 'saved_without_notification';
}
async function sendWalletMessage({ resource, id, header, body, notify, createdAt, previousStatus }) {
  const db = database(), token = randomUUID(), now = new Date();
  const expires_at = new Date(now.getTime() + 120000).toISOString();
  const inserted = await db.from('ibric_wallet_message_locks').insert({ resource, token, expires_at });
  if (inserted.error?.code === '23505') {
    const claimed = result(await db.from('ibric_wallet_message_locks').update({ token, expires_at })
      .eq('resource', resource).lt('expires_at', now.toISOString()).select('resource').maybeSingle());
    if (!claimed) return null;
  } else result(inserted);
  try {
    const api = await walletClient();
    const readMessages = async () => (await api(`${resource}?fields=messages`)).messages || [];
    let messages = await readMessages();
    const existing = messages.find((message) => message.id === id);
    if (existing) return savedMessageStatus(existing, notify, previousStatus);

    // Each class/object supports at most ten messages. Retire only our own older
    // messages; their content and delivery history remain in the database.
    const retained = [...messages];
    const safeToRetire = new Set();
    if (retained.length >= 10) {
      // A timed-out send may already be in Google while its ledger row is still
      // pending. Keep it available for reconciliation until that row is synced.
      for (const [prefix, table] of [[`${program().slug}-op-`, 'ibric_operations'], [`${program().slug}-broadcast-`, 'ibric_broadcasts']]) {
        const ids = retained.filter((message) => message.id?.startsWith(prefix)).map((message) => message.id.slice(prefix.length))
          .filter((id) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id));
        if (ids.length) {
          const rows = result(await db.from(table).select('id').in('id', ids).eq('status', 'synced'));
          rows.forEach((row) => safeToRetire.add(`${prefix}${row.id}`));
        }
      }
    }
    while (retained.length >= 10) {
      const removable = retained.filter((message) => safeToRetire.has(message.id))
        .sort((a, b) => (Date.parse(a.displayInterval?.start?.date || '') || 0) - (Date.parse(b.displayInterval?.start?.date || '') || 0))[0];
      if (!removable) throw new Error('Cardul are deja 10 mesaje care nu pot fi înlocuite automat.');
      retained.splice(retained.indexOf(removable), 1);
    }
    if (retained.length !== messages.length) await api(`${resource}?fields=id`, 'PATCH', { messages: retained });

    const message = { id, header, body, messageType: notify ? 'TEXT_AND_NOTIFY' : 'TEXT',
      displayInterval: { start: { date: new Date(createdAt).toISOString() } } };
    let response, quotaReached = false;
    try { response = await api(`${resource}/addMessage`, 'POST', { message }); }
    catch (error) {
      if (!notify || !error.quota) throw error;
      // Reconcile before fallback: Google message IDs are not idempotency keys.
      messages = await readMessages();
      const saved = messages.find((item) => item.id === id);
      if (saved) return savedMessageStatus(saved, notify, 'quota_reached');
      response = await api(`${resource}/addMessage`, 'POST', { message: { ...message, messageType: 'TEXT' } });
      quotaReached = true;
    }
    const saved = response.resource?.messages?.find((item) => item.id === id);
    if (!saved) throw new Error('Google nu a confirmat salvarea mesajului.');
    return quotaReached ? 'quota_reached' : savedMessageStatus(saved, notify, previousStatus);
  } finally {
    result(await db.from('ibric_wallet_message_locks').delete().eq('resource', resource).eq('token', token));
  }
}
export async function issueWalletLink(member, origin, programConfig) {
  if (!member.wallet_created_at) {
    const config = programConfig ?? await settings();
    if (program().slug !== 'ibric') await ensureClass(config);
    const api = await walletClient();
    try {
      await api('loyaltyObject?fields=id', 'POST', { id: member.wallet_object_id, classId: classId(), state: 'ACTIVE',
        accountId: member.account_id, accountName: member.first_name || `Membru ${program().brand}`, ...presentation(member, config),
        barcode: { type: 'QR_CODE', value: member.account_id, alternateText: `${program().brand} · ${member.account_id.slice(-8)}` } });
    } catch (error) {
      if (error.statusCode !== 409) throw error;
      // HTTP 409 already confirms the object exists. No extra GET or balance write.
    }
    result(await database().from('ibric_members').update({ wallet_created_at: new Date().toISOString() })
      .eq('id', member.id).is('wallet_created_at', null));
  }
  // Reopening a confirmed object needs neither Google OAuth nor a Google API call.
  return `https://pay.google.com/gp/v/save/${signJwt({ iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, aud: 'google', typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000), origins: [origin], payload: { loyaltyObjects: [{ id: member.wallet_object_id }] } })}`;
}
export async function syncOperation(id, recordedOperation) {
  const db = database();
  // The action handler already has the committed ledger row from its RPC.
  let op = recordedOperation ?? result(await db.from('ibric_operations').select('*').eq('id', id).maybeSingle());
  if (!op) throw Object.assign(new Error('Operațiunea nu există.'), { status: 404 });
  if (op.status === 'synced') return op;
  if (op.kind !== 'message') {
    await syncMember(op.member_id);
    return result(await db.from('ibric_operations').select('*').eq('id', id).single());
  }
  const claimTime = new Date().toISOString();
  const claimed = result(await db.from('ibric_operations').update({ status: 'syncing', updated_at: claimTime }).eq('id', id)
    .or(`status.in.(pending,sync_failed),and(status.eq.syncing,updated_at.lt.${new Date(Date.now() - 120000).toISOString()})`).select('*').maybeSingle());
  if (!claimed) return op;
  op = claimed;
  let notification = op.notification_status;
  try {
    const member = await memberById(op.member_id);
    const resource = `loyaltyObject/${encodeURIComponent(member.wallet_object_id)}`;
    notification = await sendWalletMessage({ resource, id: `${program().slug}-op-${op.id}`, header: op.payload.header, body: op.payload.body,
      notify: op.notification_mode === 'message', createdAt: op.created_at, previousStatus: op.notification_status });
    result(await db.from('ibric_operations').update({ status: notification === null ? 'pending' : 'synced',
      notification_status: notification ?? op.notification_status, error: null, updated_at: new Date().toISOString() }).eq('id', id).eq('updated_at', claimTime));
  } catch (error) {
    console.error(`${program().brand} Wallet message failed`, { status: error.statusCode, message: error.googleMessage || error.message });
    result(await db.from('ibric_operations').update({ status: 'sync_failed', notification_status: notification ?? op.notification_status,
      error: 'Wallet nu răspunde momentan. Actualizarea se reia automat.', updated_at: new Date().toISOString() }).eq('id', id).eq('updated_at', claimTime));
  }
  return result(await db.from('ibric_operations').select('*').eq('id', id).single());
}
export async function syncBroadcast(id, recordedBroadcast) {
  const db = database();
  const broadcast = recordedBroadcast ?? result(await db.from('ibric_broadcasts').select('*').eq('id', id).single());
  if (broadcast.status === 'synced') return broadcast;
  const claimTime = new Date().toISOString();
  const claimed = result(await db.from('ibric_broadcasts').update({ status: 'syncing', updated_at: claimTime }).eq('id', id)
    .or(`status.in.(pending,sync_failed),and(status.eq.syncing,updated_at.lt.${new Date(Date.now() - 120000).toISOString()})`).select('*').maybeSingle());
  if (!claimed) return broadcast;
  try {
    const notification = await sendWalletMessage({ resource: `loyaltyClass/${encodeURIComponent(classId())}`,
      id: `${program().slug}-broadcast-${id}`, header: claimed.header, body: claimed.body, notify: claimed.notify,
      createdAt: claimed.created_at, previousStatus: claimed.notification_status });
    result(await db.from('ibric_broadcasts').update({ status: notification === null ? 'pending' : 'synced',
      notification_status: notification ?? claimed.notification_status, error: null, updated_at: new Date().toISOString() })
      .eq('id', id).eq('updated_at', claimTime));
  } catch (error) {
    console.error(`${program().brand} Wallet promotion failed`, { status: error.statusCode, message: error.googleMessage || error.message });
    result(await db.from('ibric_broadcasts').update({ status: 'sync_failed',
      error: 'Promoția este salvată. Trimiterea se reia automat.', updated_at: new Date().toISOString() }).eq('id', id).eq('updated_at', claimTime));
  }
  return result(await db.from('ibric_broadcasts').select('*').eq('id', id).single());
}
// Serialize Google writes per member while letting purchases continue to commit.
// Every write uses the latest saved balance and name; old retries never replay old values.
export async function syncMember(memberId, { refreshDesign = false } = {}) {
  const startedAt = performance.now();
  const db = database(), token = randomUUID(), now = new Date();
  const lease = result(await db.from('ibric_members').update({ wallet_sync_token: token,
    wallet_sync_expires_at: new Date(now.getTime() + 120000).toISOString() }).eq('id', memberId)
    .or(`wallet_sync_token.is.null,wallet_sync_expires_at.lt.${now.toISOString()}`).select('*').maybeSingle());
  if (!lease) return false;
  let operations = [];
  try {
    const deadline = Date.now() + 25000;
    // Independent reads and OAuth run together. The lease response already contains
    // the authoritative member snapshot, so no extra member read is needed here.
    let member = lease;
    const configPromise = settings();
    const apiPromise = walletClient();
    // Attach handlers immediately so a failed parallel request cannot become unhandled.
    const initialResources = Promise.all([configPromise, apiPromise]);
    for (let attempt = 0; attempt < 3; attempt++) {
      const resource = `loyaltyObject/${encodeURIComponent(member.wallet_object_id)}`;
      const [resources, pending, before] = await Promise.all([
        initialResources,
        db.from('ibric_operations').select('id,notification_mode,notification_status').eq('member_id', memberId)
          .neq('kind', 'message').neq('status', 'synced').lt('before_revision', member.revision),
        apiPromise.then((api) => api(resource)),
      ]);
      const [config, api] = resources;
      operations = result(pending);
      if (!operations.length && !refreshDesign) break;
      const desired = presentation(member, config);
      const notify = operations.some((op) => op.notification_mode !== 'off');
      const changed = before.loyaltyPoints?.balance?.int !== member.stamp_count ||
        before.secondaryLoyaltyPoints?.balance?.int !== Math.max(0, member.reward_threshold - member.stamp_count);
      const points = {};
      for (const key of ['loyaltyPoints', 'secondaryLoyaltyPoints']) {
        if (before[key]?.balance?.int !== desired[key].balance.int || before[key]?.label !== desired[key].label) points[key] = desired[key];
      }
      // Update the native fields displayed on the card first. The number must not
      // wait for Google to fetch the new stamp image or process the detail fields.
      if (notify && changed) points.notifyPreference = 'NOTIFY_ON_UPDATE';
      let notification = points.notifyPreference ? 'accepted' : notify ? 'already_updated' : 'not_requested';
      const googleStartedAt = performance.now();
      if (Object.keys(points).length) {
        const pointResource = `${resource}?fields=id,loyaltyPoints,secondaryLoyaltyPoints`;
        try { await api(pointResource, 'PATCH', points); }
        catch (error) {
          if (!points.notifyPreference || !error.quota) throw error;
          delete points.notifyPreference;
          await api(pointResource, 'PATCH', points);
          notification = 'quota_reached';
        }
      }
      console.info(`${program().brand} Wallet balance accepted`, { googleMs: Math.round(performance.now() - googleStartedAt),
        syncMs: Math.round(performance.now() - startedAt), region: process.env.VERCEL_REGION || 'local' });

      // Persist the notification outcome before artwork work. A later image failure
      // must not erase a successful notification request or cause another alert.
      const outcomes = new Map();
      for (const operation of operations) {
        const outcome = operation.notification_mode === 'off' ? 'not_requested' :
          notification === 'already_updated' && operation.notification_status !== 'not_requested' ? operation.notification_status : notification;
        if (!outcomes.has(outcome)) outcomes.set(outcome, []);
        outcomes.get(outcome).push(operation.id);
      }
      for (const [outcome, ids] of outcomes) result(await db.from('ibric_operations').update({ notification_status: outcome }).in('id', ids));

      // Arrays use replace semantics: preserve unrelated text modules, and only
      // send the presentation fields that actually changed. Never re-send points.
      const patch = {}, accountName = member.first_name || `Membru ${program().brand}`;
      if (before.accountName !== accountName) patch.accountName = accountName;
      if (desired.textModulesData.some((next) => {
        const previous = (before.textModulesData || []).find((item) => item.id === next.id);
        return !previous || previous.header !== next.header || previous.body !== next.body;
      })) patch.textModulesData = [...(before.textModulesData || []).filter((item) => !desired.textModulesData.some((next) => next.id === item.id)), ...desired.textModulesData];
      if (desired.heroImage && (before.heroImage?.sourceUri?.uri !== desired.heroImage.sourceUri.uri ||
        before.heroImage?.contentDescription?.defaultValue?.value !== desired.heroImage.contentDescription.defaultValue.value)) patch.heroImage = desired.heroImage;
      if (Object.keys(patch).length) await api(`${resource}?fields=id`, 'PATCH', patch);
      if (operations.length) result(await db.from('ibric_operations').update({ status: 'synced',
        error: null, updated_at: new Date().toISOString() }).in('id', operations.map((op) => op.id)));
      operations = [];
      refreshDesign = false;
      // An edit may have committed while Google was responding. Send it before releasing the lease.
      if (Date.now() >= deadline) break;
      const latest = await memberById(memberId);
      if (latest.revision === member.revision) break;
      member = latest;
    }
    return true;
  } catch (error) {
    console.error(`${program().brand} Wallet update failed`, { status: error.statusCode, message: error.googleMessage || error.message });
    // Preserve the saved changes for automatic recovery, without blocking another edit.
    if (operations.length) result(await db.from('ibric_operations').update({ status: 'sync_failed',
      error: 'Wallet nu răspunde momentan. Actualizarea se reia automat.', updated_at: new Date().toISOString() })
      .in('id', operations.map((op) => op.id)));
    return false;
  } finally {
    result(await db.from('ibric_members').update({ wallet_sync_token: null, wallet_sync_expires_at: null })
      .eq('id', memberId).eq('wallet_sync_token', token));
  }
}
export async function updateClass(config) {
  if (program().slug !== 'ibric') await ensureClass(config);
  const api = await walletClient();
  const patch = walletClassDesign(config.asset_base, program());
  patch.programName = config.program_name;
  patch.localizedProgramName = { defaultValue: { language: 'ro-RO', value: config.program_name } };
  patch.hexBackgroundColor = config.background;
  return api(`loyaltyClass/${encodeURIComponent(classId())}`, 'PATCH', patch);
}

const readyClasses = new Set();
async function ensureClass(config) {
  const id = classId();
  if (readyClasses.has(id)) return;
  const api = await walletClient();
  try {
    await api('loyaltyClass?fields=id', 'POST', { id, ...walletClassDesign(config.asset_base, program()),
      programName: config.program_name, hexBackgroundColor: config.background });
  } catch (error) { if (error.statusCode !== 409) throw error; }
  readyClasses.add(id);
}
