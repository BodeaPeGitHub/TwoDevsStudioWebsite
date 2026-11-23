import { programEnv } from './program.js';
import { equal } from './auth.js';
import { processPushQueue } from './push.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const secret = programEnv('PUSH_WORKER_SECRET');
  if (!secret || !equal(req.headers.authorization, `Bearer ${secret}`)) return res.status(401).json({ error: 'Unauthorized' });
  try { return res.status(200).json(await processPushQueue()); }
  catch { return res.status(503).json({ error: 'Push processing temporarily unavailable' }); }
}
