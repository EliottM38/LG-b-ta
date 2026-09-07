export default async function handler(req, res) {
  const { endpoint, key: clientKey } = req.query;
  if (!endpoint) { res.status(400).json({ error: 'Paramètre endpoint manquant' }); return; }

  // Priorité à une clé fournie manuellement par le client (override local), sinon la clé serveur
  const key = clientKey || process.env.TM_API_KEY;
  if (!key) { res.status(400).json({ error: 'Aucune clé API TM configurée (ni locale, ni serveur)' }); return; }

  try {
    const upstream = await fetch('https://transport-manager.net' + endpoint, {
      headers: { 'Authorization': 'Bearer ' + key, 'Accept': 'application/json' }
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'Erreur proxy TM : ' + e.message });
  }
}
