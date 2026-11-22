// Statuts et notes des réponses Google Forms. Cette route évite que RLS côté
// navigateur fasse apparaître des demandes déjà traitées comme « En attente ».
const WRITE_ROLES = new Set(['president', 'vice_president', 'comptable']);
const TYPES = new Set(['sal', 'pole']);
const STATUSES = new Set(['En attente', 'En cours', 'Traité', 'deleted']);

async function contextFor(req) {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !secret || !token) return null;
  const base = SUPABASE_URL.replace(/\/$/, '');
  const auth = await fetch(base + '/auth/v1/user', { headers:{ apikey:SUPABASE_PUBLISHABLE_KEY, Authorization:'Bearer '+token } });
  if (!auth.ok) return null;
  const user = await auth.json();
  const profile = await fetch(base + '/rest/v1/staff?select=role,actif&auth_user_id=eq.' + encodeURIComponent(user.id) + '&limit=1', { headers:{ apikey:secret, Authorization:'Bearer '+secret } });
  if (!profile.ok) return null;
  const [staff] = await profile.json();
  return staff && staff.actif !== false ? { base, secret, staff } : null;
}

function validRow(type, key, statut, notes) {
  return TYPES.has(type) && typeof key === 'string' && key.trim().length > 0 && key.length <= 300 && STATUSES.has(statut) && (notes === undefined || (typeof notes === 'string' && notes.length <= 10000));
}

export default async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) { res.setHeader('Allow','GET, PUT'); res.status(405).end(); return; }
  try {
    const ctx = await contextFor(req);
    if (!ctx) { res.status(401).json({ error:'Session staff requise' }); return; }
    const headers = { apikey:ctx.secret, Authorization:'Bearer '+ctx.secret, 'Content-Type':'application/json' };
    if (req.method === 'GET') {
      const r = await fetch(ctx.base + '/rest/v1/form_statuts?select=form_type,row_key,statut,notes,updated_at', { headers });
      if (!r.ok) throw new Error('Lecture impossible');
      res.setHeader('Cache-Control','no-store'); res.status(200).json({ rows:await r.json() }); return;
    }
    if (!WRITE_ROLES.has(ctx.staff.role)) { res.status(403).json({ error:'Accès refusé' }); return; }
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length || rows.length > 100 || !rows.every(r => validRow(r.form_type, r.row_key, r.statut, r.notes))) { res.status(400).json({ error:'Statuts invalides' }); return; }
    const now = new Date().toISOString();
    const payload = rows.map(r => ({ form_type:r.form_type, row_key:r.row_key.trim(), statut:r.statut, notes:typeof r.notes === 'string' ? r.notes : undefined, updated_at:now }));
    const r = await fetch(ctx.base + '/rest/v1/form_statuts?on_conflict=form_type,row_key', { method:'POST', headers:{ ...headers, Prefer:'resolution=merge-duplicates,return=minimal' }, body:JSON.stringify(payload) });
    if (!r.ok) throw new Error('Écriture impossible');
    res.status(204).end();
  } catch (e) { res.status(500).json({ error:'Statuts des formulaires impossibles à gérer' }); }
}
