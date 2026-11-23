import { AsyncLocalStorage } from 'node:async_hooks';
import { coffeePrograms } from '../../shared/coffee-programs.mjs';

// Each API entry point fixes its own shop. CUC uses its separate engine and
// IBRIC remains retired. Unscoped requests fail closed.
const context = new AsyncLocalStorage();
export function program() {
  const current = context.getStore();
  if (!current) throw new Error('Coffee program context required');
  return current;
}
export function withProgram(slug, callback) {
  if (!Object.hasOwn(coffeePrograms, slug)) throw new Error('Unknown coffee program');
  return context.run(coffeePrograms[slug], callback);
}
export const programEnv = suffix => process.env[`${program().envPrefix}_${suffix}`];
export function classId() {
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID;
  const id = `${issuer}.${program().slug}_coffee_club_v1`;
  const cuc = process.env.CUC_GOOGLE_WALLET_CLASS_ID || `${issuer}.cuc_coffee_club_v1`;
  if (id === process.env.GOOGLE_WALLET_CLASS_ID || id === cuc) return undefined;
  return id;
}
export const assetOrigin = () => `https://www.twodevsstudio.com/${program().slug}/wallet/v1`;
