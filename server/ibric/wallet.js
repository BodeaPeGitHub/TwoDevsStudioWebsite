import { createPrivateKey, sign } from 'node:crypto';
import { database, result, memberById, settings } from './database.js';
import { walletPresentation, walletClassDesign } from './wallet-design.mjs';
let privateKey, cachedToken;
export function walletConfigured() {
  const env = process.env;
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && /^\d+$/.test(env.GOOGLE_WALLET_ISSUER_ID || '') &&
    env.GOOGLE_WALLET_CLASS_ID?.startsWith(`${env.GOOGLE_WALLET_ISSUER_ID}.`) && env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
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
      statusCode: response.status, quota: /quota|rate.?limit|too many notification|notification.*limit/i.test(JSON.stringify(data.error || {})),
    });
    return data;
  };
}
function presentation(member, config) {
  return walletPresentation({ stampCount: member.stamp_count, rewardThreshold: member.reward_threshold }, config.asset_base);
}
export async function issueWalletLink(member, origin) {
  const config = await settings();
  const api = await walletClient();
  try {
    await api('loyaltyObject', 'POST', { id: member.wallet_object_id, classId: process.env.GOOGLE_WALLET_CLASS_ID, state: 'ACTIVE',
      accountId: member.account_id, accountName: member.first_name || 'Membru IBRIC', ...presentation(member, config),
      barcode: { type: 'QR_CODE', value: member.account_id, alternateText: `IBRIC · ${member.account_id.slice(-8)}` } });
  } catch (error) {
    if (error.statusCode !== 409) throw error;
    // A saved card is reopened without changing points or interfering with a pending staff update.
    await api(`loyaltyObject/${encodeURIComponent(member.wallet_object_id)}`);
  }
  return `https://pay.google.com/gp/v/save/${signJwt({ iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, aud: 'google', typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000), origins: [origin], payload: { loyaltyObjects: [{ id: member.wallet_object_id }] } })}`;
}
export async function syncOperation(id) {
  const db = database();
  let op = result(await db.from('ibric_operations').select('*').eq('id', id).maybeSingle());
  if (!op) throw Object.assign(new Error('Operațiunea nu există.'), { status: 404 });
  if (op.status === 'synced') return op;
  const claimTime = new Date().toISOString();
  const claimed = result(await db.from('ibric_operations').update({ status: 'syncing', updated_at: claimTime }).eq('id', id)
    .or(`status.in.(pending,sync_failed),and(status.eq.syncing,updated_at.lt.${new Date(Date.now() - 120000).toISOString()})`).select('*').maybeSingle());
  if (!claimed) return op;
  op = claimed;
  let notification = 'not_requested';
  try {
    const member = await memberById(op.member_id);
    const config = await settings();
    const payload = op.payload;
    const api = await walletClient();
    const resource = `loyaltyObject/${encodeURIComponent(member.wallet_object_id)}`;
    const before = await api(resource);
    if (op.kind === 'message') {
      const messageId = `ibric-op-${op.id}`;
      if (!(before.messages || []).some((m) => m.id === messageId)) {
        const message = { id: messageId, header: payload.header, body: payload.body, messageType: op.notification_mode === 'message' ? 'TEXT_AND_NOTIFY' : 'TEXT' };
        try { await api(`${resource}/addMessage`, 'POST', { message }); notification = op.notification_mode === 'message' ? 'accepted' : 'not_requested'; }
        catch (error) { if (!error.quota) throw error; await api(`${resource}/addMessage`, 'POST', { message: { ...message, messageType: 'TEXT' } }); notification = 'quota_reached'; }
      } else notification = op.notification_mode === 'message' ? 'accepted' : 'not_requested';
    } else {
      const patch = presentation(member, config);
      patch.textModulesData = [...(before.textModulesData || []).filter((item) => !patch.textModulesData.some((next) => next.id === item.id)), ...patch.textModulesData];
      if (op.kind === 'profile') patch.accountName = member.first_name || 'Membru IBRIC';
      const changed = before.loyaltyPoints?.balance?.int !== member.stamp_count;
      if (op.notification_mode !== 'off' && changed) patch.notifyPreference = 'NOTIFY';
      try { await api(resource, 'PATCH', patch); notification = patch.notifyPreference ? 'accepted' : op.notification_mode !== 'off' ? 'already_updated' : 'not_requested'; }
      catch (error) { if (!error.quota) throw error; delete patch.notifyPreference; await api(resource, 'PATCH', patch); notification = 'quota_reached'; }
    }
    result(await db.from('ibric_operations').update({ status: 'synced', notification_status: notification, error: null, updated_at: new Date().toISOString() }).eq('id', id).eq('updated_at', claimTime));
  } catch {
    result(await db.from('ibric_operations').update({ status: 'sync_failed', notification_status: notification,
      error: 'Actualizarea în Google Wallet trebuie reîncercată.', updated_at: new Date().toISOString() }).eq('id', id).eq('updated_at', claimTime));
  }
  return result(await db.from('ibric_operations').select('*').eq('id', id).single());
}
export async function updateClass(config) {
  const api = await walletClient();
  const patch = walletClassDesign(config.asset_base);
  patch.programName = config.program_name;
  patch.localizedProgramName = { defaultValue: { language: 'ro-RO', value: config.program_name } };
  patch.hexBackgroundColor = config.background;
  return api(`loyaltyClass/${encodeURIComponent(process.env.GOOGLE_WALLET_CLASS_ID)}`, 'PATCH', patch);
}
