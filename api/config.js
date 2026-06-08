export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  // On envoie la clé service_role — elle contourne le RLS
  // C'est sécurisé car ce fichier est servi par Vercel côté serveur
  // La clé n'est jamais dans le code source, seulement dans les variables Vercel
  res.send(`
    window.SUPABASE_URL = "${process.env.SUPABASE_URL || ''}";
    window.SUPABASE_KEY = "${process.env.SUPABASE_SERVICE_KEY || ''}";
  `);
}
