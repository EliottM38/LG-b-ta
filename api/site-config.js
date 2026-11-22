const CONTENT_KEYS = new Set(['site_popup', 'site_links_extra', 'site_discord', 'site_reglement']);
const PRESIDENT_KEYS = new Set(['site_links', 'parc_sheet_urls']);
const PARC_KEY = 'parc_categories';

async function staffFor(req) {
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
  return staff && staff.actif !== false ? { staff, base, secret } : null;
}

function canManage(role, key) {
  if (PRESIDENT_KEYS.has(key)) return role === 'president';
  if (key === PARC_KEY) return ['president', 'vice_president', 'gestionnaire_parc'].includes(role);
  return CONTENT_KEYS.has(key) && ['president', 'vice_president'].includes(role);
}

export default async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) { res.setHeader('Allow', 'GET, PUT'); res.status(405).end(); return; }
  try {
    const ctx = await staffFor(req);
    if (!ctx) { res.status(401).json({ error: 'Session staff requise' }); return; }
    const key = String(req.method === 'GET' ? req.query.key : req.body?.key || '');
    if (!canManage(ctx.staff.role, key)) { res.status(403).json({ error: 'Accès refusé' }); return; }
    const headers = { apikey: ctx.secret, Authorization: 'Bearer ' + ctx.secret, 'Content-Type': 'application/json' };
    if (req.method === 'GET') {
      const r = await fetch(ctx.base + '/rest/v1/app_config?select=key,value&key=eq.' + encodeURIComponent(key) + '&limit=1', { headers });
      if (!r.ok) throw new Error('Lecture impossible');
      const [row] = await r.json();
      let value = null; try { value = row ? JSON.parse(row.value) : null; } catch (e) {}
      res.setHeader('Cache-Control', 'no-store'); res.status(200).json({ value }); return;
    }
    const value = req.body?.value;
    const r = await fetch(ctx.base + '/rest/v1/app_config?on_conflict=key', { method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) });
    if (!r.ok) throw new Error('Écriture impossible');
    res.status(204).end();
  } catch (e) { res.status(500).json({ error: 'Configuration du site impossible' }); }
}
