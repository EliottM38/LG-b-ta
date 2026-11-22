// Résout le profil staff côté serveur. Cette route évite de devoir donner au
// navigateur un accès direct à la table `staff` pour établir une session.
const STAFF_FIELDS = 'id,username,role,nom_affiche,actif,theme_preference';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.status(405).end(); return; }

  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !serverKey) {
    res.status(503).json({ error: 'Configuration serveur incomplète' }); return;
  }
  if (!token) { res.status(401).json({ error: 'Session absente' }); return; }

  try {
    const base = SUPABASE_URL.replace(/\/$/, '');
    const userRes = await fetch(base + '/auth/v1/user', {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + token }
    });
    if (!userRes.ok) { res.status(401).json({ error: 'Session invalide' }); return; }
    const user = await userRes.json();

    const profileRes = await fetch(
      base + '/rest/v1/staff?select=' + encodeURIComponent(STAFF_FIELDS) + '&auth_user_id=eq.' + encodeURIComponent(user.id) + '&limit=1',
      { headers: { apikey: serverKey, Authorization: 'Bearer ' + serverKey } }
    );
    if (!profileRes.ok) throw new Error('Lecture du profil impossible');
    const [staff] = await profileRes.json();
    if (!staff || staff.actif === false) { res.status(403).json({ error: 'Compte staff non autorisé' }); return; }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ staff });
  } catch (error) {
    res.status(500).json({ error: 'Vérification de session impossible' });
  }
}
