export default async function handler(req, res) {
  const { slug } = req.query;
  if (!slug) { res.status(400).send('Lien invalide'); return; }

  const match = String(slug).match(/(\d+)$/);
  if (!match) { res.status(404).send('Demande introuvable'); return; }
  const id = match[1].padStart(3, '0');

  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) { res.status(500).send('Configuration serveur manquante'); return; }

  const imageUrl = `${supabaseUrl}/storage/v1/object/public/factures-images/interimaires/interim-${id}.jpg`;

  try {
    const upstream = await fetch(imageUrl);
    if (!upstream.ok) { res.status(404).send('Demande introuvable ou expirée'); return; }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
}
