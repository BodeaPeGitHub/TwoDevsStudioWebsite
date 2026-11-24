import { program } from './program.js';
import { randomUUID, randomBytes } from 'node:crypto';
import { validAdminPassword } from '../staff-password.mjs';
import { database, result, settings, memberById, memberJson } from './database.js';
import { adminCookie, cookies, setCookie, actor, credentials, digest, equal, passwordHash, sessionToken, rateLimit } from './auth.js';
import { walletConfigured, issueWalletLink, syncOperation, syncMember, syncBroadcast, updateClass } from './wallet.js';
import { pushConfigured, pushPublicKey, savePushSubscription, findPushSubscription, removePushSubscription,
  sendSubscriptionPreview, enqueuePush, processPushQueue, pushOverview } from './push.js';
const uuid = (v) => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const note = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
function publicProgram(config) {
  return { programName: config.program_name, threshold: config.threshold, assetBase: config.asset_base, background: config.background,
    walletReady: walletConfigured(), demoMode: process.env.GOOGLE_WALLET_DEMO_MODE !== 'false',
    pushReady: pushConfigured(), pushPublicKey: pushConfigured() ? pushPublicKey() : null };
}
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) fail('Trimite datele ca JSON.', 415);
  let value = req.body;
  if (Buffer.isBuffer(value)) value = value.toString('utf8');
  if (Number(req.headers['content-length']) > 20000 || JSON.stringify(value || {}).length > 20000) fail('Datele introduse sunt prea lungi.', 413);
  try { if (typeof value === 'string') value = JSON.parse(value); } catch { fail('Datele nu au putut fi citite.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Datele nu au putut fi citite.');
  return value;
}
function opJson(op) {
  return { id: op.id, memberId: op.member_id, kind: op.kind, before: op.before_balance, after: op.after_balance, status: op.status,
    notificationStatus: op.notification_status, payload: op.payload, error: op.error, createdAt: op.created_at };
}
function broadcastJson(row) {
  return { id: row.id, header: row.header, body: row.body, notify: row.notify, status: row.status,
    notificationStatus: row.notification_status, error: row.error, createdAt: row.created_at };
}
function broadcastResult(row) {
  return { ok: true, status: row.status === 'synced' ? row.notification_status : 'pending',
    messageId: `${program().slug}-broadcast-${row.id}`, broadcast: broadcastJson(row), warning: row.status !== 'synced'
      ? 'Promoția este salvată. Trimiterea se reia automat.'
      : row.notification_status === 'quota_reached' ? 'Promoția a fost adăugată fără alertă: limita Google pentru notificări a fost atinsă.'
      : row.notification_status === 'saved_without_notification' ? 'Promoția este în Wallet, fără confirmarea unei solicitări de notificare.' : null };
}
async function memberForCookie(req) {
  const token = cookies(req)[`${program().slug}_member`];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return result(await database().from('ibric_members').select('*').eq('access_token_hash', digest(token)).maybeSingle());
}
async function staff(req) {
  const user = await actor(req);
  if (!user) fail('Autentifică-te pentru a administra cardurile.', 401);
  return user;
}
async function operationResult(op) {
  const member = await memberById(op.member_id);
  return { operation: opJson(op), member: memberJson(member), warning: op.status !== 'synced'
    ? 'Modificarea este salvată. Wallet se actualizează automat.'
    : op.notification_status === 'quota_reached' ? 'Cardul este actualizat. Limita Google pentru notificări a fost atinsă.'
    : op.notification_status === 'saved_without_notification' ? 'Mesajul este în Wallet, fără confirmarea unei solicitări de notificare.' : null };
}
async function route(req, res, path, url, origin) {
  const method = req.method;
  const db = database();
  const parts = path.split('/');
  const secure = origin.startsWith('https:');
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (path === 'config' && method === 'GET') {
    const config = await settings();
    return publicProgram(config);
  }
  if (path === 'me' && method === 'GET') {
    const member = await memberForCookie(req);
    return { member: member ? memberJson(member) : null };
  }
  if (['push/subscribe', 'push/status', 'push/unsubscribe', 'push/preview'].includes(path) && method === 'POST') {
    const member = await memberForCookie(req);
    if (!member) fail('Deschide pagina în browserul în care ai creat cardul.', 401);
    const input = body(req);
    // Unsubscribe must continue working even while push sending is disabled.
    if (path === 'push/unsubscribe') return removePushSubscription(member, input.endpoint);
    if (!pushConfigured()) fail('Notificările web nu sunt disponibile momentan.', 503);
    if (path === 'push/status') return { subscribed: !!await findPushSubscription(member, input.endpoint) };
    if (!await rateLimit(`push:${path}:${member.id}`, path === 'push/preview' ? 5 : 20, 3600)) fail('Prea multe încercări. Revino mai târziu.', 429);
    if (path === 'push/subscribe') return savePushSubscription(member, input);
    return sendSubscriptionPreview(member, input.endpoint);
  }
  if (['prepare', 'enroll'].includes(path) && method === 'POST') {
    const input = body(req), name = note(input.firstName, 60);
    if (/[\u0000-\u001f]/.test(name)) fail('Verifică prenumele.');
    const [config, existingMember] = await Promise.all([settings(), memberForCookie(req)]);
    const publicConfig = publicProgram(config);
    if (!publicConfig.walletReady) {
      if (path === 'enroll') fail('Cardurile nu sunt disponibile momentan.', 503);
      return { config: publicConfig, member: existingMember ? memberJson(existingMember) : null, saveUrl: null };
    }
    let member = existingMember;
    if (!member) {
      if (!await rateLimit(`enroll:${digest(ip)}`, 20, 3600)) fail('Prea multe încercări. Revino mai târziu.', 429);
      const id = randomUUID(), token = randomBytes(32).toString('hex');
      member = result(await db.from('ibric_members').insert({ id, access_token_hash: digest(token), account_id: `${program().accountPrefix}-${id.replaceAll('-', '').toUpperCase()}`,
        first_name: name || null, wallet_object_id: `${process.env.GOOGLE_WALLET_ISSUER_ID}.${program().slug}_${id.replaceAll('-', '')}`,
        stamp_count: 0, reward_threshold: config.threshold, revision: 0, created_at: new Date().toISOString() }).select('*').single());
      setCookie(res, `${program().slug}_member`, token, 31536000, '/', secure);
    }
    try { return { config: publicConfig, saveUrl: await issueWalletLink(member, origin, config), member: memberJson(member) }; }
    catch {
      if (path === 'enroll') fail('Cardul este înregistrat, dar Google Wallet nu răspunde momentan. Reîncearcă salvarea.', 502);
      return { config: publicConfig, member: memberJson(member), saveUrl: null,
        warning: 'Cardul este înregistrat, dar Google Wallet nu răspunde momentan. Apasă butonul pentru a reîncerca.' };
    }
  }
  if (path === 'admin/session' && method === 'GET') {
    const user = await actor(req), credential = await credentials();
    return { authenticated: !!user, provider: user?.provider || null, configured: !!credential, canSetup: false };
  }
  if (path === 'admin/login' && method === 'POST') {
    const input = body(req);
    if (!await rateLimit(`login:${digest(ip)}`, 8, 900)) fail('Prea multe încercări. Așteaptă 15 minute.', 429);
    const credential = await credentials();
    if (!credential || !equal(passwordHash(note(input.password, 128), credential.salt), credential.password_hash)) fail('Parola nu este corectă.', 401);
    setCookie(res, adminCookie(), sessionToken(credential.revision), 28800, `/api/${program().slug}`, secure);
    return { authenticated: true, provider: 'password' };
  }
  if (path === 'admin/logout' && method === 'POST') {
    setCookie(res, adminCookie(), '', 0, `/api/${program().slug}`, secure);
    return { ok: true };
  }
  const user = await staff(req);
  if (path === 'admin/push' && method === 'GET') return pushOverview();
  if (path === 'admin/push/send' && method === 'POST') {
    if (!pushConfigured()) fail('Notificările web nu sunt configurate.', 503);
    const input = body(req), header = note(input.header, 60), text = note(input.body, 1000);
    if (!uuid(input.requestId) || !header || !text || /[\u0000-\u001f]/.test(header)) fail('Completează titlul și mesajul notificării.');
    const memberId = input.memberId ?? null;
    if (memberId !== null && (!uuid(memberId) || !await memberById(memberId))) fail('Clientul nu există.', 404);
    const existing = result(await db.from('ibric_push_campaigns').select('id').eq('id', input.requestId).maybeSingle());
    if (!existing && !await rateLimit(`push-campaign:${user.id}`, 10, 3600)) fail('Prea multe notificări. Revino mai târziu.', 429);
    await enqueuePush({ id: input.requestId, header, body: text, memberId, actor: user.id });
    // The campaign is committed before sending. Cron recovers any interruption.
    let warning;
    try { await processPushQueue({ budgetMs: 5000 }); }
    catch { warning = 'Notificarea este salvată și va fi reluată automat.'; }
    return { ...await pushOverview(), warning };
  }
  if (path === 'admin/password' && method === 'POST') {
    const input = body(req), current = await credentials();
    if (!current || !equal(passwordHash(note(input.currentPassword, 128), current.salt), current.password_hash)) fail('Parola curentă nu este corectă.', 403);
    if (!validAdminPassword(input.password)) fail('Folosește parola convenită sau o parolă de 12–128 caractere, fără spații la început sau sfârșit.');
    const salt = randomUUID();
    const revision = result(await db.rpc('ibric_change_password', { p_expected_revision: current.revision, p_salt: salt, p_hash: passwordHash(input.password, salt) }));
    setCookie(res, adminCookie(), sessionToken(revision), 28800, `/api/${program().slug}`, secure);
    return { ok: true };
  }
  if (path === 'admin/members' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 150);
    const offset = Math.max(0, Math.min(10000, Number(url.searchParams.get('offset')) || 0));
    const data = result(await db.rpc('ibric_member_list', { p_query: q, p_offset: Math.floor(offset) }));
    return { members: data.members.slice(0, 25).map((m) => ({ ...memberJson(m), pendingCount: m.pending_count })), stats: data.stats, hasMore: data.members.length > 25 };
  }
  if (parts[0] === 'admin' && parts[1] === 'members' && uuid(parts[2])) {
    const member = await memberById(parts[2]);
    if (!member) fail('Clientul nu a fost găsit.', 404);
    if (parts.length === 3 && method === 'GET') {
      const history = result(await db.from('ibric_operations').select('*').eq('member_id', member.id).order('created_at', { ascending: false }).limit(50));
      return { member: memberJson(member), history: history.map(opJson) };
    }
    if (parts.length === 4 && parts[3] === 'sync' && method === 'POST') {
      const refreshDesign = body(req).refreshDesign === true;
      const walletSynced = await syncMember(member.id, { refreshDesign });
      const messages = refreshDesign ? [] : result(await db.from('ibric_operations').select('id').eq('member_id', member.id)
        .eq('kind', 'message').neq('status', 'synced').order('created_at').limit(3));
      for (const op of messages) await syncOperation(op.id);
      const history = result(await db.from('ibric_operations').select('*').eq('member_id', member.id).order('created_at', { ascending: false }).limit(50));
      return { member: memberJson(await memberById(member.id)), history: history.map(opJson), walletSynced };
    }
    if (parts.length === 4 && parts[3] === 'actions' && method === 'POST') {
      const input = body(req);
      if (!uuid(input.requestId)) fail('Identificatorul operațiunii lipsește.');
      const kind = input.kind;
      if (!['purchase', 'redeem', 'adjust', 'profile', 'message'].includes(kind)) fail('Acțiune invalidă.');
      const existing = result(await db.from('ibric_operations').select('*').eq('id', input.requestId).maybeSingle());
      if (existing) {
        if (existing.member_id !== member.id || existing.kind !== kind) fail('Identificatorul este deja folosit.', 409);
        if (kind === 'message' && (existing.payload.header !== note(input.header, 60) || existing.payload.body !== note(input.body, 1000) ||
          existing.notification_mode !== (input.notificationMode === 'off' ? 'off' : 'message'))) fail('Acest identificator aparține unui alt mesaj.', 409);
        return operationResult(await syncOperation(existing.id, existing));
      }
      if (!await rateLimit(`actions:${user.id}`, 120, 3600)) fail('Prea multe operațiuni. Revino mai târziu.', 429);
      const mode = ['off', 'update', 'message'].includes(input.notificationMode) ? input.notificationMode : 'update';
      let after = member.stamp_count;
      const payload = {};
      if (kind === 'purchase') {
        if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 30) fail('Alege un număr valid de cafele.');
        if (after + input.quantity > member.reward_threshold) fail('Folosește recompensa disponibilă înainte de a începe următorul ciclu.', 409);
        after += input.quantity; payload.quantity = input.quantity;
      }
      if (kind === 'redeem') { if (after < member.reward_threshold) fail('Clientul nu are încă o cafea gratuită.', 409); after = 0; }
      if (kind === 'adjust') {
        if (!Number.isInteger(input.count) || input.count < 0 || input.count > member.reward_threshold) fail('Număr de cafele invalid.');
        payload.reason = note(input.reason, 300); if (payload.reason.length < 5) fail('Adaugă motivul corecției.'); after = input.count;
      }
      if (kind === 'profile') { payload.name = note(input.name, 60); if (/[\u0000-\u001f]/.test(payload.name)) fail('Prenume invalid.'); }
      if (kind === 'message') { payload.header = note(input.header, 60); payload.body = note(input.body, 1000); if (!payload.header || !payload.body) fail('Completează titlul și mesajul.'); }
      const recorded = result(await db.rpc('ibric_record_operation', { p_id: input.requestId, p_member_id: member.id, p_kind: kind, p_revision: member.revision,
        p_after: after, p_mode: kind === 'message' ? (mode === 'off' ? 'off' : 'message') : mode, p_payload: payload, p_actor: user.id }));
      return operationResult(await syncOperation(input.requestId, recorded));
    }
  }
  if (parts[0] === 'admin' && parts[1] === 'operations' && uuid(parts[2]) && parts[3] === 'retry' && parts.length === 4 && method === 'POST') {
    return operationResult(await syncOperation(parts[2]));
  }
  if (path === 'admin/settings' && method === 'GET') return { settings: await settings() };
  if (path === 'admin/settings' && method === 'POST') {
    const input = body(req), name = note(input.programName, 30), assetBase = note(input.assetBase, 500).replace(/\/$/, '');
    const threshold = input.threshold, background = input.background;
    if (!name || !Number.isInteger(threshold) || threshold !== program().threshold || !/^#[0-9a-f]{6}$/i.test(background)) fail('Verifică numele, pragul și culoarea.');
    let assetUrl;
    try { assetUrl = new URL(assetBase); } catch { fail('Adresa imaginilor nu este validă.'); }
    const ownOrigin = assetUrl.origin === origin;
    if (assetUrl.protocol !== 'https:' || assetUrl.username || assetUrl.password || assetUrl.search || assetUrl.hash ||
        !(ownOrigin && assetUrl.pathname.startsWith(`/${program().slug}/wallet/`))) fail('Folosește adresa imaginilor acestui program de pe site.');
    const current = await settings();
    if (threshold !== current.threshold || assetBase !== current.asset_base) {
      for (let start = 0; start <= threshold; start += 5) {
        await Promise.all(Array.from({length:Math.min(5,threshold-start+1)},async(_,index)=>{
          const count=start+index;
          const r=await fetch(`${assetBase}/art/${program().walletArtVersion || 'v2'}/stamps-${threshold}-${count}.png`,{method:'HEAD',signal:AbortSignal.timeout(4000)});
          if(!r.ok||!r.headers.get('content-type')?.includes('image'))fail(`Lipsește imaginea pentru ${count}/${threshold}.`);
        }));
      }
    }
    const config = { id: 'program', program_name: name, threshold, asset_base: assetBase, background, updated_at: new Date().toISOString() };
    result(await db.from('ibric_program_settings').upsert(config));
    try { await updateClass(config); return { settings: config, walletSynced: true }; }
    catch { return { settings: config, walletSynced: false, warning: 'Setările sunt salvate. Reîncearcă actualizarea designului Wallet.' }; }
  }
  if (path === 'admin/broadcasts' && method === 'GET') {
    const rows = result(await db.from('ibric_broadcasts').select('*').order('created_at', { ascending: false }).limit(50));
    return { broadcasts: rows.map(broadcastJson) };
  }
  if (parts[0] === 'admin' && parts[1] === 'broadcasts' && uuid(parts[2]) && parts[3] === 'retry' && parts.length === 4 && method === 'POST') {
    const broadcast = result(await db.from('ibric_broadcasts').select('*').eq('id', parts[2]).maybeSingle());
    if (!broadcast) fail('Promoția nu există.', 404);
    return broadcastResult(await syncBroadcast(broadcast.id, broadcast));
  }
  if (path === 'admin/broadcast' && method === 'POST') {
    const input = body(req), header = note(input.header, 60), text = note(input.body, 1000), notify = input.notify !== false;
    if (!header || !text) fail('Completează titlul și mesajul.');
    if (!uuid(input.requestId)) fail('Identificatorul promoției lipsește.');
    let broadcast = result(await db.from('ibric_broadcasts').select('*').eq('id', input.requestId).maybeSingle());
    if (!broadcast) {
      if (!await rateLimit(`broadcast:${user.id}`, 30, 3600)) fail('Prea multe promoții. Revino mai târziu.', 429);
      const inserted = await db.from('ibric_broadcasts').insert({ id: input.requestId, header, body: text, notify }).select('*').single();
      if (inserted.error?.code === '23505') broadcast = result(await db.from('ibric_broadcasts').select('*').eq('id', input.requestId).single());
      else broadcast = result(inserted);
    }
    if (broadcast.header !== header || broadcast.body !== text || broadcast.notify !== notify) fail('O promoție cu acest identificator există deja.', 409);
    return broadcastResult(await syncBroadcast(broadcast.id, broadcast));
  }
  fail('Pagina solicitată nu există.', 404);
}
export default async function handler(req, res) {
  const startedAt = performance.now();
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); fail('Metodă indisponibilă.', 405); }
    const host = req.headers.host;
    if (typeof host !== 'string' || !/^([a-z0-9-]+\.)*[a-z0-9-]+(?::\d{1,5})?$/i.test(host)) fail('Adresă invalidă.');
    const origin = `${host.startsWith('localhost:') || host.startsWith('127.0.0.1:') ? 'http' : 'https'}://${host}`;
    if (req.method === 'POST' && req.headers.origin !== origin) fail(`Deschide pagina ${program().brand} pentru această acțiune.`, 403);
    const url = new URL(req.url, origin);
    const raw = req.query?.route ?? url.searchParams.get('route') ?? url.pathname.replace(new RegExp(`^/api/${program().slug}/?`), '');
    const path = Array.isArray(raw) ? raw.join('/') : String(raw);
    for (const key of ['q', 'offset']) { const v = req.query?.[key]; if (!url.searchParams.has(key) && typeof v === 'string') url.searchParams.set(key, v); }
    if (path.startsWith('internal/')) fail('Pagina solicitată nu există.', 404);
    const data = await route(req, res, path, url, origin);
    res.setHeader('Server-Timing', `${program().slug};dur=${Math.round(performance.now() - startedAt)}`);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Operațiunea nu a putut fi finalizată. Reîncearcă în câteva momente.' });
  }
}
