import { AsyncLocalStorage } from 'node:async_hooks';

// The entry point chooses the shop; callers cannot select another shop in input.
// AsyncLocalStorage keeps simultaneous Vercel requests isolated.
const context = new AsyncLocalStorage();
const programs = {
  ibric: { slug: 'ibric', brand: 'IBRIC', name: 'IBRIC Coffee Club', threshold: 9, background: '#233DA4' },
  cuc: { slug: 'cuc', brand: 'CUC', name: 'CUC Coffee Club', threshold: 7, background: '#FEFFED' },
};
export const program = () => context.getStore() ?? programs.ibric;
export function withProgram(slug, callback) {
  if (!Object.hasOwn(programs, slug)) throw new Error('Unknown loyalty program');
  return context.run(programs[slug], callback);
}
export const programEnv = suffix => process.env[`${program().brand}_${suffix}`];
export const classId = () => program().slug === 'ibric' ? process.env.GOOGLE_WALLET_CLASS_ID
  : process.env.CUC_GOOGLE_WALLET_CLASS_ID || `${process.env.GOOGLE_WALLET_ISSUER_ID}.cuc_coffee_club_v1`;
export const assetOrigin = () => program().slug === 'ibric'
  ? process.env.WALLET_ASSET_ORIGIN || 'https://raw.githubusercontent.com/BodeaPeGitHub/utils/main/IBRIC-Wallet'
  : process.env.CUC_WALLET_ASSET_ORIGIN || 'https://www.twodevsstudio.com/cuc/wallet/v5';
