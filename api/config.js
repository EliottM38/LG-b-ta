export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  // Ce fichier est téléchargé par le navigateur : n'y exposer que des valeurs
  // publiques. Les clés secret/service_role et TM restent strictement côté serveur.
  const config = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    tmProxyEnabled: Boolean(process.env.TM_API_KEY)
  };
  res.send(`window.LG_RUNTIME_CONFIG = ${JSON.stringify(config)};`);
}
