export default function retired(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (String(req.headers.accept || '').includes('text/html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(410).send('<!doctype html><html lang="ro"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IBRIC — site oprit</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#faf8f1;color:#233da4;font-family:Arial,sans-serif"><main style="padding:32px;text-align:center"><h1>Site-ul IBRIC a fost oprit.</h1></main></body></html>');
  }
  return res.status(410).json({ error: 'Programul IBRIC a fost oprit.', code: 'IBRIC_RETIRED' });
}
