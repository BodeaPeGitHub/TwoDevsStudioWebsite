import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID, pbkdf2Sync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DEFAULT_ADMIN_PASSWORD } from '../server/staff-password.mjs';
import { coffeePrograms } from '../shared/coffee-programs.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const workdir = root;
const vercel = JSON.parse(readFileSync(path.join(root, '.vercel/project.json'), 'utf8'));
const supabase = (existsSync(path.join(workdir, 'supabase/.temp/project-ref')) ? { ref: readFileSync(path.join(workdir, 'supabase/.temp/project-ref'), 'utf8').trim() } : JSON.parse(readFileSync(path.join(workdir, 'supabase/.temp/linked-project.json'), 'utf8')));
if (vercel.projectId !== 'prj_R1ktU7jfQ5sQQP36l6tpaZQa7rWV' || supabase.ref !== 'ancecjivjjmnegfdfnro') {
  throw new Error('Use the existing Studio Vercel and Supabase projects.');
}
const requested = DEFAULT_ADMIN_PASSWORD;
const brands = [
  { slug: 'ibric', brand: 'IBRIC', retired: true },
  { slug: 'cuc', brand: 'CUC' },
  ...Object.values(coffeePrograms),
];
const credentials = new Map();
let sql = 'begin;\n';
for (const brand of brands) {
  const salt = randomUUID();
  const password_hash = pbkdf2Sync(requested, salt, 100000, 32, 'sha256').toString('hex');
  credentials.set(brand.slug, { id: 'owner', salt, password_hash, updated_at: new Date().toISOString() });
  sql += `insert into public.${brand.slug}_admin_credentials(id,salt,password_hash,revision,updated_at)\nvalues ('owner','${salt}','${password_hash}',1,now())\non conflict (id) do update set salt=excluded.salt,password_hash=excluded.password_hash,revision=public.${brand.slug}_admin_credentials.revision+1,updated_at=excluded.updated_at;\n`;
}
// Pause only IBRIC, preserving its job definition, history and queued messages.
sql += "select cron.alter_job(job_id := jobid, active := false) from cron.job where jobname = 'ibric-web-push-deliveries';\ncommit;\n";
const sqlFile = path.join(root, '.vercel/set-admin-password.sql');
writeFileSync(sqlFile, sql, { mode: 0o600 });
try {
  execFileSync('supabase', ['db', 'query', '--linked', '--file', sqlFile, '--workdir', workdir], {
    cwd: root, stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (error) {
  let message = String(error.stderr || '');
  for (const credential of credentials.values()) {
    message = message.replaceAll(credential.salt, '[redacted]').replaceAll(credential.password_hash, '[redacted]');
  }
  console.error(message.slice(0, 2000));
  throw new Error('The admin-password update did not complete. Local access records were not changed.');
}

// Keep the ignored setup records in sync, preserving every session/VAPID secret.
const newFile = path.join(root, '.vercel/new-coffee-secrets.json');
if (existsSync(newFile)) {
  const programs = JSON.parse(readFileSync(newFile, 'utf8'));
  for (const brand of Object.values(coffeePrograms)) {
    if (!programs[brand.slug]) continue;
    programs[brand.slug].password = requested;
    programs[brand.slug].credential = { ...programs[brand.slug].credential, ...credentials.get(brand.slug) };
    // Revision is maintained atomically in the database; never use an old local revision to reset it.
    delete programs[brand.slug].credential.revision;
  }
  writeFileSync(newFile, JSON.stringify(programs), { mode: 0o600 });
}
const cucFile = path.join(root, '.vercel/cuc-secrets.json');
if (existsSync(cucFile)) {
  const config = JSON.parse(readFileSync(cucFile, 'utf8'));
  config.password = requested;
  config.credential = { ...config.credential, ...credentials.get('cuc') };
  delete config.credential.revision;
  writeFileSync(cucFile, JSON.stringify(config), { mode: 0o600 });
}
let access = 'Admin access\n\n';
let newAccess = 'New coffee programs — staff access\n\n';
for (const brand of brands) {
  const note = brand.retired
    ? 'IBRIC is stopped. Its staff panel and API are disabled. Customer data is preserved.\n\n'
    : `${brand.brand}\nStaff panel: https://www.twodevsstudio.com/${brand.slug}/admin\nPassword: ${requested}\n\n`;
  access += note;
  if (Object.hasOwn(coffeePrograms, brand.slug)) newAccess += note;
}
writeFileSync(path.join(root, '.vercel/admin-access.txt'), access, { mode: 0o600 });
writeFileSync(path.join(root, '.vercel/new-coffee-admin-access.txt'), newAccess, { mode: 0o600 });
writeFileSync(path.join(root, '.vercel/cuc-admin-access.txt'), `CUC staff panel: https://www.twodevsstudio.com/cuc/admin\nPassword: ${requested}\n`, { mode: 0o600 });
console.log(`Updated ${brands.length} separate admin password hashes and invalidated previous staff sessions.`);
console.log('Paused only the IBRIC notification job. Other programs and customer balances were not changed.');
