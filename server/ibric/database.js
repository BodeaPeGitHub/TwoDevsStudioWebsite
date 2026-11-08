import { createClient } from '@supabase/supabase-js';
let client;
export function database() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw Object.assign(new Error('Serviciul IBRIC nu este configurat.'), { status: 503 });
  }
  client ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) },
  });
  return client;
}
export function result({ data, error }) {
  if (error) {
    if (/conflict|duplicate key|ibric_one_pending/i.test(error.message)) {
      throw Object.assign(new Error('Cardul a fost modificat sau are o actualizare în așteptare. Reîncarcă și folosește reîncercarea Wallet din istoric.'), { status: 409 });
    }
    throw new Error('Datele IBRIC nu sunt disponibile momentan.', { cause: error });
  }
  return data;
}
export async function memberById(id) {
  return result(await database().from('ibric_members').select('*').eq('id', id).maybeSingle());
}
export async function settings() {
  return result(await database().from('ibric_program_settings').select('*').eq('id', 'program').maybeSingle()) ?? {
    id: 'program', program_name: 'IBRIC Coffee Club', threshold: 9,
    asset_base: process.env.WALLET_ASSET_ORIGIN || 'https://raw.githubusercontent.com/BodeaPeGitHub/utils/main/IBRIC-Wallet', background: '#233DA4',
  };
}
export function memberJson(row) {
  return { id: row.id, name: row.first_name || 'Membru IBRIC', firstName: row.first_name || '', accountId: row.account_id,
    walletObjectId: row.wallet_object_id, coffees: row.stamp_count, threshold: row.reward_threshold,
    remaining: Math.max(0, row.reward_threshold - row.stamp_count), rewardAvailable: row.stamp_count >= row.reward_threshold,
    revision: row.revision, createdAt: row.created_at };
}
