// Opérations sensibles sur les profils staff. La table `staff` ne doit jamais
// être directement accessible au navigateur : elle contient des rôles et un
// ancien champ de mot de passe qu'un utilisateur ne doit pas pouvoir lire.
const SAFE_FIELDS = 'id,username,role,nom_affiche,actif,created_at,home_notes,theme_preference';

async function contextFor(req) {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !secret || !token) return null;
  const base = SUPABASE_URL.replace(/\/$/, '');
  const auth = await fetch(base + '/auth/v1/user', { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + token } });
  if (!auth.ok) return null;
  const user = await auth.json();
  const profile = await fetch(base + '/rest/v1/staff?select=' + encodeURIComponent(SAFE_FIELDS) + '&auth_user_id=eq.' + encodeURIComponent(user.id) + '&limit=1', { headers: { apikey: secret, Authorization: 'Bearer ' + secret } });
  if (!profile.ok) return null;
  const [staff] = await profile.json();
  return staff && staff.actif !== false ? { base, secret, staff } : null;
}

function headers(secret, extra = {}) {
  return { apikey: secret, Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json', ...extra };
}

function cleanText(value, max) {
  return String(value || '').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (!['GET', 'PATCH', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'GET, PATCH, DELETE'); res.status(405).end(); return; }
  try {
    const ctx = await contextFor(req);
    if (!ctx) { res.status(401).json({ error: 'Session staff requise' }); return; }

    if (req.method === 'GET') {
      if (String(req.query?.self || '') === '1') {
        res.setHeader('Cache-Control', 'no-store'); res.status(200).json({ staff: ctx.staff }); return;
      }
      const onlyActive = ctx.staff.role === 'president' ? '' : '&actif=eq.true';
      const directoryFields = 'id,username,role,nom_affiche,actif,created_at';
      const r = await fetch(ctx.base + '/rest/v1/staff?select=' + encodeURIComponent(directoryFields) + onlyActive + '&order=created_at.asc', { headers: headers(ctx.secret) });
      if (!r.ok) throw new Error('Lecture des profils impossible');
      res.setHeader('Cache-Control', 'no-store'); res.status(200).json({ staff: await r.json() }); return;
    }

    const action = String(req.body?.action || '');
    if (req.method === 'PATCH' && action === 'self') {
      const changes = {};
      if ('username' in (req.body || {})) {
        const username = cleanText(req.body.username, 60);
        if (!username) { res.status(400).json({ error: 'Identifiant invalide' }); return; }
        changes.username = username;
      }
      if ('home_notes' in (req.body || {})) changes.home_notes = cleanText(req.body.home_notes, 5000);
      if ('theme_preference' in (req.body || {})) changes.theme_preference = req.body.theme_preference === 'dark' ? 'dark' : 'light';
      if (!Object.keys(changes).length) { res.status(400).json({ error: 'Aucune modification' }); return; }
      const r = await fetch(ctx.base + '/rest/v1/staff?id=eq.' + encodeURIComponent(ctx.staff.id), { method: 'PATCH', headers: headers(ctx.secret, { Prefer: 'return=representation' }), body: JSON.stringify(changes) });
      if (!r.ok) throw new Error('Mise à jour impossible');
      const [staff] = await r.json();
      res.status(200).json({ staff }); return;
    }

    if (ctx.staff.role !== 'president') { res.status(403).json({ error: 'Accès réservé au Président' }); return; }
    const targetId = cleanText(req.body?.id, 64);
    if (!targetId || targetId === ctx.staff.id) { res.status(400).json({ error: 'Compte cible invalide' }); return; }

    if (req.method === 'PATCH' && action === 'set_active') {
      const r = await fetch(ctx.base + '/rest/v1/staff?id=eq.' + encodeURIComponent(targetId), { method: 'PATCH', headers: headers(ctx.secret), body: JSON.stringify({ actif: Boolean(req.body.actif) }) });
      if (!r.ok) throw new Error('Mise à jour impossible');
      res.status(204).end(); return;
    }
    if (req.method === 'DELETE' && action === 'delete') {
      // Les historiques liés restent présents, mais sans référence à un compte supprimé.
      for (const table of ['factures', 'interimaires', 'objectifs']) {
        const r = await fetch(ctx.base + '/rest/v1/' + table + '?created_by=eq.' + encodeURIComponent(targetId), { method: 'PATCH', headers: headers(ctx.secret), body: JSON.stringify({ created_by: null }) });
        if (!r.ok) throw new Error('Dissociation impossible');
      }
      const r = await fetch(ctx.base + '/rest/v1/staff?id=eq.' + encodeURIComponent(targetId), { method: 'DELETE', headers: headers(ctx.secret) });
      if (!r.ok) throw new Error('Suppression impossible');
      res.status(204).end(); return;
    }
    res.status(400).json({ error: 'Action inconnue' });
  } catch (e) { res.status(500).json({ error: 'Gestion des profils impossible' }); }
}
