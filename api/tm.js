const STAFF_ROLES = new Set(['president', 'vice_president', 'gestionnaire_parc']);

function safeEndpoint(raw) {
  try {
    const u = new URL(String(raw || ''), 'https://tm.invalid');
    const allowed = new Set(['/api/v1/membres_alliance', '/api/v1/vehicules', '/api/v1/compta', '/api/v1/salaries']);
    if (!allowed.has(u.pathname)) return '';
    const limit = Math.min(1000, Math.max(1, Number(u.searchParams.get('limit') || 1000)));
    if (u.pathname === '/api/v1/vehicules') {
      const parc = u.searchParams.get('parc');
      if (!['global', 'location'].includes(parc)) return '';
      return `${u.pathname}?parc=${parc}&limit=${limit}`;
    }
    return `${u.pathname}?limit=${limit}`;
  } catch (e) { return ''; }
}

async function requireStaff(req) {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !serverKey || !token) return false;

  const userRes = await fetch(SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user', {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + token }
  });
  if (!userRes.ok) return false;
  const user = await userRes.json();
  if (!user || !user.id) return false;

  const profileRes = await fetch(
    SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/staff?select=role,actif&auth_user_id=eq.' + encodeURIComponent(user.id) + '&limit=1',
    { headers: { apikey: serverKey, Authorization: 'Bearer ' + serverKey } }
  );
  if (!profileRes.ok) return false;
  const [profile] = await profileRes.json();
  return Boolean(profile && profile.actif !== false && STAFF_ROLES.has(profile.role));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.status(405).end(); return; }
  const endpoint = safeEndpoint(req.query.endpoint);
  if (!endpoint) { res.status(400).json({ error: 'Endpoint non autorisé' }); return; }
  if (!(await requireStaff(req))) { res.status(401).json({ error: 'Authentification staff requise' }); return; }

  const key = process.env.TM_API_KEY;
  if (!key) { res.status(503).json({ error: 'Clé API TM non configurée côté serveur' }); return; }

  try {
    const upstream = await fetch('https://transport-manager.net' + endpoint, {
      headers: { 'Authorization': 'Bearer ' + key, 'Accept': 'application/json' }
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (e) {
    const c = e && e.cause ? (e.cause.code || e.cause.message || '') : '';
    res.status(502).json({ error: 'Erreur proxy TM : ' + e.message + (c ? ' (' + String(c).slice(0, 80) + ')' : '') });
  }
}
