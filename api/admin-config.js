// Configuration interne (Google Forms et promotions), distincte de la
// configuration du site public. Les clés serveur accèdent à app_config ; le
// navigateur n'y a plus d'accès SQL direct.
const KEYS = new Set(['sal_csv_url', 'pole_csv_url', 'promotions']);

async function contextFor(req) {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !secret || !token) return null;
  const base = SUPABASE_URL.replace(/\/$/, '');
  const auth = await fetch(base + '/auth/v1/user', { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + token } });
  if (!auth.ok) return null;
  const user = await auth.json();
  const profile = await fetch(base + '/rest/v1/staff?select=role,actif&auth_user_id=eq.' + encodeURIComponent(user.id) + '&limit=1', { headers: { apikey: secret, Authorization: 'Bearer ' + secret } });
  if (!profile.ok) return null;
  const [staff] = await profile.json();
  return staff && staff.actif !== false ? { base, secret, staff } : null;
}

function mayWrite(role, key) {
  if (key === 'promotions') return ['president', 'vice_president'].includes(role);
  return role === 'president';
}

export default async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) { res.setHeader('Allow', 'GET, PUT'); res.status(405).end(); return; }
  try {
    const ctx = await contextFor(req);
    if (!ctx) { res.status(401).json({ error: 'Session staff requise' }); return; }
    const headers = { apikey: ctx.secret, Authorization: 'Bearer ' + ctx.secret, 'Content-Type': 'application/json' };
    if (req.method === 'GET') {
      const r = await fetch(ctx.base + '/rest/v1/app_config?select=key,value&key=in.(sal_csv_url,pole_csv_url,promotions)', { headers });
      if (!r.ok) throw new Error('Lecture impossible');
      const config = Object.fromEntries((await r.json()).map(row => [row.key, row.value]));
      res.setHeader('Cache-Control', 'no-store'); res.status(200).json({ config }); return;
    }
    const key = String(req.body?.key || '');
    if (!KEYS.has(key) || !mayWrite(ctx.staff.role, key)) { res.status(403).json({ error: 'Accès refusé' }); return; }
    let value = String(req.body?.value ?? '');
    if (key === 'promotions') {
      try { if (!Array.isArray(JSON.parse(value))) throw new Error(); } catch (e) { res.status(400).json({ error: 'Promotions invalides' }); return; }
    } else if (!/^https:\/\//i.test(value)) { res.status(400).json({ error: 'URL HTTPS requise' }); return; }
    const r = await fetch(ctx.base + '/rest/v1/app_config?on_conflict=key', { method:'POST', headers:{ ...headers, Prefer:'resolution=merge-duplicates,return=minimal' }, body:JSON.stringify({ key, value }) });
    if (!r.ok) throw new Error('Écriture impossible');
    res.status(204).end();
  } catch (e) { res.status(500).json({ error: 'Configuration interne impossible' }); }
}
