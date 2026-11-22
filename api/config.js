export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  // Ce fichier est téléchargé par le navigateur : n'y exposer que des valeurs
  // publiques. Les clés secret/service_role et TM restent strictement côté serveur.
  const config = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    // Les premiers déploiements utilisaient SUPABASE_ANON_KEY. Garder cette
    // compatibilité évite de casser le site de gestion lors d'une migration.
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '',
    tmProxyEnabled: Boolean(process.env.TM_API_KEY)
  };
  res.send(`window.LG_RUNTIME_CONFIG = ${JSON.stringify(config)};`);
}
