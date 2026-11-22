// ============================================================
// API PUBLIQUE (lecture seule) du site vitrine /alliance
// ------------------------------------------------------------
// - Aucune clé ni URL dans le code : tout vient des variables Vercel
//   (TM_API_KEY, TM_API_BASE, SUPABASE_URL, SUPABASE_SECRET_KEY)
//   et de la table app_config (liens des Google Sheets, liens publics).
// - GET uniquement, aucun paramètre ne choisit l'URL appelée en amont.
// - Seuls des champs filtrés (liste blanche) sont renvoyés : jamais de
//   nom de membre, de comptabilité, de salarié ni de clé.
// - Réponse mise en cache par le CDN Vercel (5 min).
// ============================================================

const TIMEOUT_MS = 8000;

// ---------- utilitaires ----------
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// IMPORTANT : même algorithme que pubCle() dans index.html (gestion)
const cleOf = (marque, modele) => norm(marque) + '|' + norm(modele);
const flat = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

function pick(obj, aliases) {
  if (!obj || typeof obj !== 'object') return '';
  const map = {};
  for (const k of Object.keys(obj)) map[flat(k)] = obj[k];
  for (const a of aliases) {
    const v = map[flat(a)];
    if (v !== undefined && v !== null && typeof v !== 'object' && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function parseCSV(t) {
  const rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '"' && q && t[i + 1] === '"') { c += '"'; i++; }
    else if (ch === '"') q = !q;
    else if (ch === ',' && !q) { r.push(c); c = ''; }
    else if ((ch === '\n' || ch === '\r') && !q) {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      r.push(c); if (r.some(v => v.trim())) rows.push(r); r = []; c = '';
    } else c += ch;
  }
  r.push(c); if (r.some(v => v.trim())) rows.push(r);
  return rows;
}

async function getJSON(url, headers) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

const asList = raw => Array.isArray(raw) ? raw
  : (raw && (raw.data || raw.vehicules || Object.values(raw).find(Array.isArray))) || [];

// ---------- catégories ----------
const CATEGORIES = ['Minibus', 'Midibus', 'Standards', 'Articulés', 'BHNS', 'LE & Cars'];

function categorize(...hints) {
  const t = norm(hints.join(' '));
  if (/\bmini/.test(t)) return 'Minibus';
  if (/\bmidi/.test(t)) return 'Midibus';
  if (/articul|double/.test(t)) return 'Articulés';
  if (/bhns|brt|\btram/.test(t)) return 'BHNS';
  if (/\bcar\b|autocar|\ble\b|low entry|intercit|tourisme/.test(t)) return 'LE & Cars';
  return 'Standards';
}

function motorLabel(v) {
  const t = norm(v);
  if (!t) return '';
  if (/hybrid/.test(t)) return 'Hybride';
  if (/electr|elec|batterie/.test(t)) return 'Électrique';
  if (/gnv|gaz|biogaz|cng/.test(t)) return 'GNV';
  if (/hydrog/.test(t)) return 'Hydrogène';
  if (/diesel|gazole/.test(t)) return 'Diesel';
  return String(v).trim();
}

function yearOf(v) {
  const m = String(v ?? '').match(/(19|20)\d{2}/);
  return m ? m[0] : '';
}

function dateOf(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  return '';
}

function statusLabel(v) {
  const t = norm(v);
  if (!t) return '';
  if (/dispo/.test(t)) return 'Disponible';
  if (/prepa/.test(t)) return 'En préparation';
  if (/atelier|panne|repar/.test(t)) return 'Aux ateliers';
  if (/location|loue/.test(t)) return 'En location';
  return '';
}

// ---------- normalisation des véhicules ----------
function fromTM(v) {
  const marque = pick(v, ['marque', 'constructeur', 'brand', 'fabricant']);
  const modele = pick(v, ['modele', 'model', 'nom_modele', 'designation', 'nom']);
  const type = pick(v, ['categorie', 'category', 'type_vehicule', 'type', 'genre']);
  return {
    ref: pick(v, ['numero_parc', 'num_parc', 'n_parc', 'parc_numero', 'numero', 'immatriculation', 'id']),
    marque, modele,
    categorie: categorize(type, modele),
    moteur: motorLabel(pick(v, ['motorisation', 'moteur', 'energie', 'carburant', 'type_moteur'])),
    annee: yearOf(pick(v, ['mise_en_service', 'date_mise_en_service', 'mes', 'annee', 'year', 'date_achat'])),
    places: pick(v, ['places', 'nb_places', 'capacite', 'places_totales']),
    portes: pick(v, ['portes', 'nb_portes']),
    clim: pick(v, ['climatisation', 'clim', 'ventilation']),
    accessibilite: pick(v, ['accessibilite', 'pmr']),
    options: pick(v, ['options', 'options_usine']),
    statut: '', retour: ''
  };
}

function fromSheet(rows, categorie) {
  if (!rows || rows.length < 2) return [];
  const head = rows[0].map(flat);
  const col = (...names) => { for (const n of names) { const i = head.indexOf(flat(n)); if (i !== -1) return i; } return -1; };
  const C = {
    ref: col('Numéro de Parc', 'N° de parc', 'Numéro de Parc Réparation prévue', 'Parc', 'Numéro'),
    marque: col('Marque'), modele: col('Modèle', 'Modele'),
    moteur: col('Motorisation', 'Moteur'), annee: col('M.E.S', 'Mise en service', 'Année'),
    statut: col('Statut', 'Disponibilité'), retour: col('Date de retour', 'Date de retour DATE MAXIMUM ATTEINTE'),
    places: col('Places'), portes: col('Portes'), clim: col('Ventilation', 'Climatisation'),
    options: col("OPTIONS D'USINE", 'Options')
  };
  const g = (row, k) => (C[k] >= 0 ? String(row[C[k]] ?? '').trim() : '');
  return rows.slice(1).map(row => ({
    ref: g(row, 'ref'), marque: g(row, 'marque'), modele: g(row, 'modele'),
    categorie: categorie || categorize(g(row, 'modele')),
    moteur: motorLabel(g(row, 'moteur')), annee: yearOf(g(row, 'annee')),
    places: g(row, 'places'), portes: g(row, 'portes'), clim: g(row, 'clim'), accessibilite: '', options: g(row, 'options'),
    statut: statusLabel(g(row, 'statut')), retour: dateOf(g(row, 'retour'))
  })).filter(v => v.ref || v.modele);
}

// ---------- tarifs ----------
// Valeurs de repli = tarifs publiés sur le site Lutèce Group ; la table "tarifs" (gestion) fait foi.
const TARIF_DEFAUT = {
  minibus:  { j: 150, s: 900,  m: 3000 },
  midibus:  { j: 200, s: 1200, m: 4000 },
  standard: { j: 250, s: 1500, m: 5000 },
  articule: { j: 300, s: 1800, m: 6000 },
  carle:    { j: 250, s: 1500, m: 5000 }
};
const TARIF_META = [
  ['minibus',  'Minibus',          'Minibus',   'Adapté aux TAD du N3'],
  ['midibus',  'Midibus',          'Midibus',   ''],
  ['standard', 'Standards',        'Standards', ''],
  ['articule', 'Articulés',        'Articulés', ''],
  ['carle',    'Cars | LE',        'LE & Cars', 'À partir du N4']
];

function buildTarifs(rows) {
  const t = {};
  for (const r of rows || []) t[r.key] = Number(r.value);
  return TARIF_META.map(([k, label, categorie, note]) => {
    const d = TARIF_DEFAUT[k];
    const val = suf => (Number.isFinite(t[`${k}_${suf}`]) && t[`${k}_${suf}`] > 0 ? t[`${k}_${suf}`] : d[suf]);
    return { cle: k, label, categorie, note, j: val('j'), s: val('s'), m: val('m') };
  });
}

// ---------- handler ----------
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { SUPABASE_URL, TM_API_KEY, TM_API_BASE } = process.env;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
  const sources = { tm: false, sheet: false, db: false };
  const warnings = [];

  // 1) Base de données : app_config, tarifs, photos
  let cfg = {}, tarifRows = [], photoRows = [];
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + SUPABASE_SERVICE_KEY, Accept: 'application/json' };
    const base = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
    const [a, b, c] = await Promise.allSettled([
      getJSON(base + 'app_config?select=key,value&key=in.(site_links,parc_sheet_urls)', h),
      getJSON(base + 'tarifs?select=key,value', h),
      getJSON(base + 'parc_photos?select=cle,storage_path,ordre&order=ordre.asc,created_at.asc', h)
    ]);
    if (a.status === 'fulfilled') for (const r of a.value) { try { cfg[r.key] = JSON.parse(r.value); } catch (e) {} }
    if (b.status === 'fulfilled') tarifRows = b.value;
    if (c.status === 'fulfilled') photoRows = c.value; else warnings.push('photos');
    sources.db = a.status === 'fulfilled' || b.status === 'fulfilled' || c.status === 'fulfilled';
  } else {
    warnings.push('db');
  }

  const photoBase = SUPABASE_URL ? SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/public/parc-photos/' : '';
  const photos = {};
  for (const p of photoRows) {
    if (!p.cle || !p.storage_path || !photoBase) continue;
    (photos[p.cle] = photos[p.cle] || []).push(photoBase + p.storage_path.split('/').map(encodeURIComponent).join('/'));
  }

  // 2) API Transport Manager (clé uniquement côté serveur)
  let list = [];
  let enLocation = new Map();
  if (TM_API_KEY && TM_API_BASE) {
    const h = { Authorization: 'Bearer ' + TM_API_KEY, Accept: 'application/json' };
    const base = TM_API_BASE.replace(/\/$/, '');
    const [glob, loc] = await Promise.allSettled([
      getJSON(base + '/api/v1/vehicules?parc=global&limit=1000', h),
      getJSON(base + '/api/v1/vehicules?parc=location&limit=1000', h)
    ]);
    if (glob.status === 'fulfilled') {
      list = asList(glob.value).map(fromTM).filter(v => v.ref || v.modele);
      sources.tm = list.length > 0;
    } else warnings.push('tm');
    if (loc.status === 'fulfilled') {
      for (const raw of asList(loc.value)) {
        const ref = pick(raw, ['numero_parc', 'num_parc', 'n_parc', 'parc_numero', 'numero', 'immatriculation', 'id']);
        if (ref) enLocation.set(ref, dateOf(pick(raw, ['date_fin', 'fin', 'retour'])));
      }
    }
  } else {
    warnings.push('tm-config');
  }

  // 3) Google Sheet(s) : liens stockés en base (aucune URL dans le code)
  const sheetUrls = cfg.parc_sheet_urls && typeof cfg.parc_sheet_urls === 'object' ? cfg.parc_sheet_urls : {};
  const sheetRows = [];
  await Promise.all(Object.entries(sheetUrls).map(async ([cat, url]) => {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:') return;
      const r = await fetch(u, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const text = await r.text();
      if (text.trim().startsWith('<')) throw new Error('not csv');
      const category = CATEGORIES.includes(cat) ? cat : '';
      sheetRows.push(...fromSheet(parseCSV(text), category));
    } catch (e) { warnings.push('sheet:' + cat); }
  }));
  sources.sheet = sheetRows.length > 0;

  // 4) Fusion par numéro de parc : le Sheet complète/écrase statut, retour, détails
  const byRef = new Map();
  const noRef = [];
  for (const v of list) (v.ref ? byRef.set(v.ref, v) : noRef.push(v));
  for (const s of sheetRows) {
    const base = s.ref ? byRef.get(s.ref) : null;
    if (base) {
      for (const [k, val] of Object.entries(s)) if (val) base[k] = val;
    } else if (s.ref) byRef.set(s.ref, s); else noRef.push(s);
  }
  const vehicles = [...byRef.values(), ...noRef];
  for (const v of vehicles) {
    if (!v.statut && v.ref && enLocation.has(v.ref)) { v.statut = 'En location'; v.retour = enLocation.get(v.ref) || ''; }
    v.cle = cleOf(v.marque, v.modele);
    if (v.statut !== 'En location') v.retour = '';
  }

  // 5) Modèles agrégés (catalogue)
  const models = new Map();
  for (const v of vehicles) {
    if (!v.modele) continue;
    let m = models.get(v.cle);
    if (!m) {
      m = { cle: v.cle, categorie: v.categorie, marque: v.marque, modele: v.modele, moteurs: [], annees: {}, quantite: 0, disponibles: 0,
        suivis: 0, places: '', portes: '', clim: '', accessibilite: '', options: '', photos: photos[v.cle] || [] };
      models.set(v.cle, m);
    }
    m.quantite++;
    if (v.statut) m.suivis++;
    if (v.statut === 'Disponible') m.disponibles++;
    if (v.moteur && !m.moteurs.includes(v.moteur)) m.moteurs.push(v.moteur);
    if (v.annee) m.annees[v.annee] = (m.annees[v.annee] || 0) + 1;
    for (const k of ['places', 'portes', 'clim', 'accessibilite', 'options']) if (!m[k] && v[k]) m[k] = v[k];
  }
  const modelList = [...models.values()].sort((a, b) =>
    CATEGORIES.indexOf(a.categorie) - CATEGORIES.indexOf(b.categorie) || (a.marque + a.modele).localeCompare(b.marque + b.modele, 'fr'));

  const siteImages = {};
  for (const k of Object.keys(photos)) if (k.startsWith('site:')) siteImages[k.slice(5)] = photos[k][0];

  const links = {};
  if (cfg.site_links && typeof cfg.site_links === 'object') {
    for (const [k, v] of Object.entries(cfg.site_links)) {
      try { const u = new URL(String(v)); if (u.protocol === 'https:' || u.protocol === 'http:') links[k] = u.toString(); } catch (e) {}
    }
  }

  const stats = {
    total: vehicles.length,
    disponibles: vehicles.filter(v => v.statut === 'Disponible').length,
    modeles: modelList.length,
    categories: CATEGORIES.map(c => ({ nom: c, quantite: vehicles.filter(v => v.categorie === c).length }))
  };

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).json({
    generated_at: new Date().toISOString(),
    sources, warnings,
    categories: CATEGORIES,
    stats,
    models: modelList,
    // champs publics uniquement (liste blanche)
    vehicles: vehicles.map(v => ({
      ref: v.ref, cle: v.cle, categorie: v.categorie, marque: v.marque, modele: v.modele,
      moteur: v.moteur, annee: v.annee, statut: v.statut, retour: v.retour
    })),
    tarifs: buildTarifs(tarifRows),
    site_images: siteImages,
    links
  });
}
