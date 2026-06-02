export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`
    window.SUPABASE_URL = "${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}";
    window.SUPABASE_KEY = "${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}";
  `);
}