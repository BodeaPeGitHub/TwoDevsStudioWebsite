import { createClient } from '@supabase/supabase-js';
import { program, assetOrigin } from './program.js';
let client;
export function database() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw Object.assign(new Error(`Serviciul ${program().brand} nu este configurat.`), { status: 503 });
  }
  client ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) },
  });
  // Bind names when obtaining the client, so query chains keep their shop.
  const scope = program().slug;
  const name = value => value.replace(/^ibric_/, `${scope}_`);
  return { from: table => client.from(name(table)), rpc: (fn, args) => client.rpc(name(fn), args) };
}
export function result({ data, error }) {
  if (error) {
    if (/conflict|duplicate key/i.test(error.message)) {
      throw Object.assign(new Error('Cardul a fost modificat între timp. Reîncarcă datele și încearcă din nou.'), { status: 409 });
    }
    throw new Error(`Datele ${program().brand} nu sunt disponibile momentan.`, { cause: error });
  }
  return data;
}
export async function memberById(id) {
  return result(await database().from('ibric_members').select('*').eq('id', id).maybeSingle());
}
export async function settings() {
  return result(await database().from('ibric_program_settings').select('*').eq('id', 'program').maybeSingle()) ?? {
    id: 'program', program_name: program().name, threshold: program().threshold,
    asset_base: assetOrigin(), background: program().background,
  };
}
export function memberJson(row) {
  return { id: row.id, name: row.first_name || `Membru ${program().brand}`, firstName: row.first_name || '', accountId: row.account_id,
    walletObjectId: row.wallet_object_id, coffees: row.stamp_count, threshold: row.reward_threshold,
    remaining: Math.max(0, row.reward_threshold - row.stamp_count), rewardAvailable: row.stamp_count >= row.reward_threshold,
    revision: row.revision, createdAt: row.created_at };
}
