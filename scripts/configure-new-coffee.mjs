import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID, pbkdf2Sync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import webpush from 'web-push';
import { coffeePrograms } from '../shared/coffee-programs.mjs';
import { DEFAULT_ADMIN_PASSWORD } from '../server/staff-password.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const link = JSON.parse(readFileSync(path.join(root, '.vercel/project.json'), 'utf8'));
if (link.projectId !== 'prj_R1ktU7jfQ5sQQP36l6tpaZQa7rWV') throw new Error('Use only the existing Two Devs Studio Vercel project.');
const secretFile = path.join(root, '.vercel/new-coffee-secrets.json');
const stateFile = path.join(root, '.vercel/new-coffee-configured.json');
const sqlFile = path.join(root, '.vercel/new-coffee-initialize.sql');
const option = process.argv.indexOf('--program');
const selectedSlug = option < 0 ? null : process.argv[option + 1];
if (option >= 0 && !Object.hasOwn(coffeePrograms, selectedSlug)) throw new Error('Choose a known coffee program.');
const selectedBrands = Object.values(coffeePrograms).filter(brand => !selectedSlug || brand.slug === selectedSlug);
const programs = existsSync(secretFile) ? JSON.parse(readFileSync(secretFile, 'utf8')) : {};
let changed = false;
for (const brand of selectedBrands) {
  if (!Object.hasOwn(programs, brand.slug)) {
    const salt = randomUUID(), password = DEFAULT_ADMIN_PASSWORD;
    const vapid = webpush.generateVAPIDKeys();
    programs[brand.slug] = {
      env: {
        [`${brand.envPrefix}_SESSION_SECRET`]: randomBytes(32).toString('base64url'),
        [`${brand.envPrefix}_PUSH_PUBLIC_KEY`]: vapid.publicKey,
        [`${brand.envPrefix}_PUSH_PRIVATE_KEY`]: vapid.privateKey,
        [`${brand.envPrefix}_PUSH_WORKER_SECRET`]: randomBytes(32).toString('base64url'),
      },
      credential: { id: 'owner', salt, password_hash: pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex'), revision: 1, updated_at: new Date().toISOString() },
      password,
    };
    changed = true;
  }
}
if (changed) writeFileSync(secretFile, JSON.stringify(programs), { mode: 0o600 });
const completed = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : { env: [], database: false };
// Upgrade the original three-shop setup marker without marking later shops done.
completed.databasePrograms ??= completed.database ? ['letscoffee', 'orso', 'guau'] : [];
const pendingDatabase = selectedBrands.filter(brand => !completed.databasePrograms.includes(brand.slug));
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
let sql = '';
let access = 'Coffee programs — staff access\n\nEach program has separate staff credentials and sessions.\n\n';
for (const brand of Object.values(coffeePrograms)) {
  if (!Object.hasOwn(programs, brand.slug)) continue;
  const config = programs[brand.slug], credential = config.credential;
  access += `${brand.brand}\nCustomer page: https://www.twodevsstudio.com/${brand.slug}\nStaff panel: https://www.twodevsstudio.com/${brand.slug}/admin\nInitial password: ${config.password}\n\n`;
  if (!pendingDatabase.some(item => item.slug === brand.slug)) continue;
  sql += `do $initialize$ begin\ninsert into public.${brand.slug}_admin_credentials(id,salt,password_hash,revision,updated_at) values ('owner',${literal(credential.salt)},${literal(credential.password_hash)},1,${literal(credential.updated_at)}) on conflict (id) do nothing;\nif not exists (select 1 from vault.secrets where name = '${brand.slug}_web_push_worker_secret') then\nperform vault.create_secret(${literal(config.env[`${brand.envPrefix}_PUSH_WORKER_SECRET`])}, '${brand.slug}_web_push_worker_secret', '${brand.accountPrefix} Vercel notification worker');\nend if;\nend $initialize$;\n`;
}
writeFileSync(path.join(root, '.vercel/new-coffee-admin-access.txt'), access, { mode: 0o600 });
writeFileSync(sqlFile, sql, { mode: 0o600 });

if (process.argv.includes('--environment')) {
  for (const brand of selectedBrands) {
    const config = programs[brand.slug];
    for (const [name, value] of Object.entries(config.env)) {
      if (completed.env.includes(name)) continue;
      try {
        execFileSync('vercel', ['env', 'add', name, 'production', '--yes'], { cwd: root, input: value, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch { throw new Error(`Could not configure ${name}; existing values were not overwritten.`); }
      completed.env.push(name);
      writeFileSync(stateFile, JSON.stringify(completed), { mode: 0o600 });
      console.log(`Configured ${name}`);
    }
  }
}
if (process.argv.includes('--database') && pendingDatabase.length) {
  const workdir = root;
  const linked = (existsSync(path.join(workdir, 'supabase/.temp/project-ref')) ? { ref: readFileSync(path.join(workdir, 'supabase/.temp/project-ref'), 'utf8').trim() } : JSON.parse(readFileSync(path.join(workdir, 'supabase/.temp/linked-project.json'), 'utf8')));
  if (linked.ref !== 'ancecjivjjmnegfdfnro') throw new Error('Use the existing Studio Supabase project.');
  try {
    execFileSync('supabase', ['db', 'query', '--linked', '--file', sqlFile, '--workdir', workdir], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error) {
    let detail = String(error.stderr || '');
    for (const config of Object.values(programs)) {
      for (const value of [...Object.values(config.env), config.password, config.credential.salt, config.credential.password_hash]) {
        detail = detail.replaceAll(value, '[redacted]');
      }
    }
    console.error(detail.slice(0, 2500));
    throw new Error('Could not initialize new-program staff access and Vault secrets.');
  }
  completed.databasePrograms.push(...pendingDatabase.map(brand => brand.slug));
  writeFileSync(stateFile, JSON.stringify(completed), { mode: 0o600 });
  console.log(`Initialized only ${pendingDatabase.map(brand => brand.brand).join(', ')} staff credentials and Vault worker secrets.`);
}
console.log('Staff access saved privately in .vercel/new-coffee-admin-access.txt.');
