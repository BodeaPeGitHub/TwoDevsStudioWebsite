import { randomUUID, randomBytes } from 'node:crypto';
import { database, result, settings, memberById, memberJson } from './database.js';
import { ADMIN_COOKIE, cookies, setCookie, actor, credentials, digest, equal, passwordHash, sessionToken, rateLimit } from './auth.js';
import { walletConfigured, issueWalletLink, syncOperation, updateClass, walletClient } from './wallet.js';
const uuid = (v) => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const note = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
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
async function memberForCookie(req) {
  const token = cookies(req).ibric_member;
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
    ? 'Modificarea este salvată. Actualizarea în Wallet trebuie reîncercată.'
    : op.notification_status === 'quota_reached' ? 'Cardul este actualizat. Limita Google pentru notificări a fost atinsă.' : null };
}
async function route(req, res, path, url, origin) {
  const method = req.method;
  const db = database();
  const parts = path.split('/');
  const secure = origin.startsWith('https:');
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (path === 'config' && method === 'GET') {
    const config = await settings();
    return { programName: config.program_name, threshold: config.threshold, assetBase: config.asset_base, background: config.background,
      walletReady: walletConfigured(), demoMode: process.env.GOOGLE_WALLET_DEMO_MODE !== 'false' };
  }
  if (path === 'me' && method === 'GET') {
    const member = await memberForCookie(req);
    return { member: member ? memberJson(member) : null };
  }
  if (path === 'enroll' && method === 'POST') {
    if (!walletConfigured()) fail('Cardurile nu sunt disponibile momentan.', 503);
    const input = body(req), name = note(input.firstName, 60);
    if (/[\u0000-\u001f]/.test(name)) fail('Verifică prenumele.');
    if (!await rateLimit(`enroll:${digest(ip)}`, 20, 3600)) fail('Prea multe încercări. Revino mai târziu.', 429);
    let member = await memberForCookie(req);
    if (!member) {
      const config = await settings(), id = randomUUID(), token = randomBytes(32).toString('hex');
      member = result(await db.from('ibric_members').insert({ id, access_token_hash: digest(token), account_id: `IBRIC-${id.replaceAll('-', '').toUpperCase()}`,
        first_name: name || null, wallet_object_id: `${process.env.GOOGLE_WALLET_ISSUER_ID}.ibric_${id.replaceAll('-', '')}`,
        stamp_count: 0, reward_threshold: config.threshold, revision: 0, created_at: new Date().toISOString() }).select('*').single());
      setCookie(res, 'ibric_member', token, 31536000, '/', secure);
    }
    try { return { saveUrl: await issueWalletLink(member, origin), member: memberJson(member) }; }
    catch { fail('Cardul este înregistrat, dar Google Wallet nu răspunde momentan. Reîncearcă salvarea.', 502); }
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
    setCookie(res, ADMIN_COOKIE, sessionToken(credential.revision), 28800, '/api/ibric', secure);
    return { authenticated: true, provider: 'password' };
  }
  if (path === 'admin/logout' && method === 'POST') {
    setCookie(res, ADMIN_COOKIE, '', 0, '/api/ibric', secure);
    return { ok: true };
  }
  const user = await staff(req);
  if (path === 'admin/password' && method === 'POST') {
    const input = body(req), current = await credentials();
    if (!current || !equal(passwordHash(note(input.currentPassword, 128), current.salt), current.password_hash)) fail('Parola curentă nu este corectă.', 403);
    if (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 128 || input.password.trim() !== input.password) fail('Folosește o parolă de 12–128 caractere, fără spații la început sau sfârșit.');
    const salt = randomUUID();
    const revision = result(await db.rpc('ibric_change_password', { p_expected_revision: current.revision, p_salt: salt, p_hash: passwordHash(input.password, salt) }));
    setCookie(res, ADMIN_COOKIE, sessionToken(revision), 28800, '/api/ibric', secure);
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
    if (parts.length === 4 && parts[3] === 'actions' && method === 'POST') {
      const input = body(req);
      if (!uuid(input.requestId)) fail('Identificatorul operațiunii lipsește.');
      const kind = input.kind;
      if (!['purchase', 'redeem', 'adjust', 'profile', 'message'].includes(kind)) fail('Acțiune invalidă.');
      const existing = result(await db.from('ibric_operations').select('*').eq('id', input.requestId).maybeSingle());
      if (existing) {
        if (existing.member_id !== member.id || existing.kind !== kind) fail('Identificatorul este deja folosit.', 409);
        return operationResult(await syncOperation(existing.id));
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
      result(await db.rpc('ibric_record_operation', { p_id: input.requestId, p_member_id: member.id, p_kind: kind, p_revision: member.revision,
        p_after: after, p_mode: kind === 'message' ? (mode === 'off' ? 'off' : 'message') : mode, p_payload: payload, p_actor: user.id }));
      return operationResult(await syncOperation(input.requestId));
    }
  }
  if (parts[0] === 'admin' && parts[1] === 'operations' && uuid(parts[2]) && parts[3] === 'retry' && parts.length === 4 && method === 'POST') {
    return operationResult(await syncOperation(parts[2]));
  }
  if (path === 'admin/settings' && method === 'GET') return { settings: await settings() };
  if (path === 'admin/settings' && method === 'POST') {
    const input = body(req), name = note(input.programName, 30), assetBase = note(input.assetBase, 500).replace(/\/$/, '');
    const threshold = input.threshold, background = input.background;
    if (!name || !Number.isInteger(threshold) || threshold < 1 || threshold > 30 || !/^#[0-9a-f]{6}$/i.test(background)) fail('Verifică numele, pragul și culoarea.');
    let assetUrl;
    try { assetUrl = new URL(assetBase); } catch { fail('Adresa imaginilor nu este validă.'); }
    const ownOrigin = assetUrl.origin === origin;
    if (assetUrl.protocol !== 'https:' || assetUrl.username || assetUrl.password || assetUrl.search || assetUrl.hash ||
        !(ownOrigin || assetUrl.hostname === 'raw.githubusercontent.com' || assetUrl.hostname.endsWith('.github.io'))) fail('Folosește o adresă HTTPS a site-ului sau GitHub pentru imagini.');
    const current = await settings();
    if (threshold !== current.threshold || assetBase !== current.asset_base) {
      for (let start = 0; start <= threshold; start += 5) {
        await Promise.all(Array.from({length:Math.min(5,threshold-start+1)},async(_,index)=>{
          const count=start+index;
          const r=await fetch(`${assetBase}/art/v2/stamps-${threshold}-${count}.png`,{method:'HEAD',signal:AbortSignal.timeout(4000)});
          if(!r.ok||!r.headers.get('content-type')?.includes('image'))fail(`Lipsește imaginea pentru ${count}/${threshold}.`);
        }));
      }
    }
    const config = { id: 'program', program_name: name, threshold, asset_base: assetBase, background, updated_at: new Date().toISOString() };
    result(await db.from('ibric_program_settings').upsert(config));
    try { await updateClass(config); return { settings: config, walletSynced: true }; }
    catch { return { settings: config, walletSynced: false, warning: 'Setările sunt salvate. Reîncearcă actualizarea designului Wallet.' }; }
  }
  if (path === 'admin/broadcast' && method === 'POST') {
    const input = body(req), header = note(input.header, 60), text = note(input.body, 1000), notify = input.notify !== false;
    if (!header || !text) fail('Completează titlul și mesajul.');
    if (!uuid(input.requestId)) fail('Identificatorul promoției lipsește.');
    if (!await rateLimit(`broadcast:${user.id}`, 30, 3600)) fail('Prea multe promoții. Revino mai târziu.', 429);
    let broadcast = result(await db.from('ibric_broadcasts').select('*').eq('id', input.requestId).maybeSingle());
    if (!broadcast) {
      const inserted = await db.from('ibric_broadcasts').insert({ id: input.requestId, header, body: text, notify }).select('*').single();
      if (inserted.error?.code === '23505') broadcast = result(await db.from('ibric_broadcasts').select('*').eq('id', input.requestId).single());
      else broadcast = result(inserted);
    }
    if (broadcast.header !== header || broadcast.body !== text || broadcast.notify !== notify) fail('O promoție cu acest identificator există deja.', 409);
    if (broadcast.status === 'synced') return { ok: true, status: broadcast.notification_status, messageId: `ibric-broadcast-${broadcast.id}` };
    const claimTime = new Date().toISOString();
    const claimed = result(await db.from('ibric_broadcasts').update({ status: 'syncing', updated_at: claimTime }).eq('id', broadcast.id)
      .or(`status.in.(pending,sync_failed),and(status.eq.syncing,updated_at.lt.${new Date(Date.now() - 120000).toISOString()})`).select('*').maybeSingle());
    if (!claimed) return { ok: true, status: 'pending', warning: 'Promoția este în curs de trimitere. Reîncearcă aceeași promoție mai târziu.' };
    try {
      const api = await walletClient(), resource = `loyaltyClass/${encodeURIComponent(process.env.GOOGLE_WALLET_CLASS_ID)}`;
      const messageId = `ibric-broadcast-${broadcast.id}`, existing = await api(resource);
      let notification = notify ? 'accepted' : 'not_requested';
      if (!(existing.messages || []).some((m) => m.id === messageId)) {
        const message = { id: messageId, header, body: text, messageType: notify ? 'TEXT_AND_NOTIFY' : 'TEXT' };
        try { await api(`${resource}/addMessage`, 'POST', { message }); }
        catch (error) { if (!error.quota) throw error; await api(`${resource}/addMessage`, 'POST', { message: { ...message, messageType: 'TEXT' } }); notification = 'quota_reached'; }
      }
      result(await db.from('ibric_broadcasts').update({ status: 'synced', notification_status: notification, error: null, updated_at: new Date().toISOString() }).eq('id', broadcast.id).eq('updated_at', claimTime));
      return { ok: true, status: notification, messageId, ...(notification === 'quota_reached' ? { warning: 'Limita Google pentru notificări a fost atinsă. Mesajul a fost adăugat fără alertă.' } : {}) };
    } catch {
      result(await db.from('ibric_broadcasts').update({ status: 'sync_failed', error: 'Trimiterea trebuie reîncercată.', updated_at: new Date().toISOString() }).eq('id', broadcast.id).eq('updated_at', claimTime));
      fail('Promoția este salvată. Reîncearcă aceeași promoție pentru a finaliza trimiterea.', 502);
    }
  }
  fail('Pagina solicitată nu există.', 404);
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); fail('Metodă indisponibilă.', 405); }
    const host = req.headers.host;
    if (typeof host !== 'string' || !/^([a-z0-9-]+\.)*[a-z0-9-]+(?::\d{1,5})?$/i.test(host)) fail('Adresă invalidă.');
    const origin = `${host.startsWith('localhost:') || host.startsWith('127.0.0.1:') ? 'http' : 'https'}://${host}`;
    if (req.method === 'POST' && req.headers.origin !== origin) fail('Deschide pagina IBRIC pentru această acțiune.', 403);
    const url = new URL(req.url, origin);
    const raw = req.query?.route ?? url.searchParams.get('route') ?? url.pathname.replace(/^\/api\/ibric\/?/, '');
    const path = Array.isArray(raw) ? raw.join('/') : String(raw);
    for (const key of ['q', 'offset']) { const v = req.query?.[key]; if (!url.searchParams.has(key) && typeof v === 'string') url.searchParams.set(key, v); }
    if (path.startsWith('internal/')) fail('Pagina solicitată nu există.', 404);
    const data = await route(req, res, path, url, origin);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Operațiunea nu a putut fi finalizată. Reîncearcă în câteva momente.' });
  }
}
