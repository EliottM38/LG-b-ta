import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // clé service_role — jamais exposée
);

export default async function handler(req, res) {
  // Vérifier que la requête vient bien de notre app
  const origin = req.headers.origin || '';
  const allowed = ['lutece-groupe-gestion-staff.vercel.app', 'localhost'];
  if (!allowed.some(a => origin.includes(a))) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  const { action, table, filters, data, id } = req.body;

  try {
    let result;

    switch(action) {
      case 'select':
        let query = sb.from(table).select(filters?.select || '*');
        if (filters?.eq)     Object.entries(filters.eq).forEach(([k,v]) => query = query.eq(k,v));
        if (filters?.order)  query = query.order(filters.order.col, { ascending: filters.order.asc ?? true });
        if (filters?.limit)  query = query.limit(filters.limit);
        result = await query;
        break;

      case 'insert':
        result = await sb.from(table).insert(data);
        break;

      case 'update':
        result = await sb.from(table).update(data).eq('id', id);
        break;

      case 'delete':
        result = await sb.from(table).delete().eq('id', id);
        break;

      case 'upsert':
        result = await sb.from(table).upsert(data, { onConflict: filters?.onConflict });
        break;

      default:
        return res.status(400).json({ error: 'Action inconnue' });
    }

    if (result.error) return res.status(400).json({ error: result.error.message });
    return res.status(200).json({ data: result.data });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}