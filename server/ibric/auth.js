import { createHash, createHmac, timingSafeEqual, pbkdf2Sync } from 'node:crypto';
import { database, result } from './database.js';
export const ADMIN_COOKIE = 'ibric_staff_session';
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export function equal(a, b) {
  if(typeof a!=='string'||typeof b!=='string')return false;
  const left=Buffer.from(a),right=Buffer.from(b);
  return left.length===right.length&&timingSafeEqual(left,right);
}
export const passwordHash = (password, salt) => pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
export async function credentials() {
  return result(await database().from('ibric_admin_credentials').select('*').eq('id', 'owner').maybeSingle());
}
function signature(value) {
  if (!process.env.IBRIC_SESSION_SECRET) throw new Error('Session signing unavailable');
  return createHmac('sha256', process.env.IBRIC_SESSION_SECRET).update(value).digest('base64url');
}
export function sessionToken(revision) {
  const body = Buffer.from(JSON.stringify({ role: 'owner', revision, exp: Math.floor(Date.now() / 1000) + 28800 })).toString('base64url');
  return `${body}.${signature(body)}`;
}
export function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map((item) => item.trim().split(/=(.*)/s)).filter(([key]) => key));
}
export function setCookie(res, name, value, maxAge, path, secure = true) {
  res.appendHeader('Set-Cookie', `${name}=${value}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`);
}
export async function actor(req) {
  const token = cookies(req)[ADMIN_COOKIE];
  if (!token || !process.env.IBRIC_SESSION_SECRET) return null;
  let value;
  try {
    const [body, sig, extra] = token.split('.');
    if (extra || !body || !sig || !equal(sig, signature(body))) return null;
    value = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (value.role !== 'owner' || !Number.isFinite(value.exp) || value.exp <= Date.now() / 1000) return null;
  } catch { return null; }
  const row = await credentials();
  return row && row.revision === value.revision ? { id: 'owner', provider: 'password' } : null;
}
export async function rateLimit(key, maximum, seconds) {
  return result(await database().rpc('ibric_rate_limit', { p_key: key, p_maximum: maximum, p_seconds: seconds }));
}
