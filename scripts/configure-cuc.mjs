// Run from this project after linking the existing Two Devs Studio Vercel project:
// node scripts/configure-cuc.mjs
// Secrets and initial staff access stay in ignored .vercel files.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID, pbkdf2Sync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import webpush from 'web-push';
import { DEFAULT_ADMIN_PASSWORD } from '../server/staff-password.mjs';

const link = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
if (link.projectId !== 'prj_R1ktU7jfQ5sQQP36l6tpaZQa7rWV') throw new Error('Use the existing Two Devs Studio Vercel project.');
const secretsPath = '.vercel/cuc-secrets.json';
if (!existsSync(secretsPath)) {
  const keys = webpush.generateVAPIDKeys(), salt = randomUUID();
  const password = DEFAULT_ADMIN_PASSWORD;
  writeFileSync(secretsPath, JSON.stringify({
    env: {
      CUC_SESSION_SECRET: randomBytes(32).toString('base64url'),
      CUC_PUSH_PUBLIC_KEY: keys.publicKey,
      CUC_PUSH_PRIVATE_KEY: keys.privateKey,
      CUC_PUSH_WORKER_SECRET: randomBytes(32).toString('base64url'),
    },
    credential: { id: 'owner', salt, password_hash: pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex'),
      revision: 1, updated_at: new Date().toISOString() },
    password,
  }), { mode: 0o600, flag: 'wx' });
}
const secrets = JSON.parse(readFileSync(secretsPath, 'utf8'));
writeFileSync('.vercel/cuc-admin-access.txt', `CUC staff panel: https://www.twodevsstudio.com/cuc/admin\nInitial password: ${secrets.password}\nChange it in Program & acces after signing in.\n`, { mode: 0o600 });
for (const [name, value] of Object.entries(secrets.env)) {
  // stdin keeps secrets out of command arguments and deployment logs.
  try {
    execFileSync('vercel', ['env', 'add', name, 'production', '--yes'], { input: value, stdio: ['pipe', 'pipe', 'pipe'] });
    console.log(`Configured ${name}`);
  } catch {
    throw new Error(`Could not configure ${name}; no existing values were changed.`);
  }
}
console.log('CUC staff access saved to .vercel/cuc-admin-access.txt.');
console.log('Initialize cuc_admin_credentials with the credential object in .vercel/cuc-secrets.json (do not overwrite an existing row).');
console.log('Store env.CUC_PUSH_WORKER_SECRET in Supabase Vault as cuc_web_push_worker_secret.');
