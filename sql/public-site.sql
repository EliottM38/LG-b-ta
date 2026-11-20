-- ============================================================
-- Site public /alliance — tables à créer une seule fois (SQL Editor Supabase)
-- ============================================================

-- Photos du catalogue (une ligne par photo) et visuels du site (cle = 'site:hero', etc.)
create table if not exists public.parc_photos (
  id uuid primary key default gen_random_uuid(),
  cle text not null,                 -- 'marque|modele' normalisé, ou 'site:<emplacement>'
  marque text,
  modele text,
  categorie text,
  storage_path text not null,        -- chemin dans le bucket public 'parc-photos'
  ordre int not null default 0,
  uploaded_by text,
  created_at timestamptz default now()
);
create index if not exists parc_photos_cle_idx on public.parc_photos (cle, ordre);

-- Même fonctionnement que les autres tables de l'app (accès via la clé service)
alter table public.parc_photos disable row level security;

-- Le bucket 'parc-photos' est créé automatiquement au premier envoi (comme 'cloud-partage').
-- Les liens publics (forum, formulaires…) et les liens Google Sheet du parc sont
-- enregistrés dans la table app_config existante (clés 'site_links' et 'parc_sheet_urls')
-- depuis la page TM de l'espace staff : rien à créer à la main.

-- Articles du site public (actualités)
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titre text not null,
  resume text default '',
  contenu text default '',
  image_url text default '',
  categorie text default '',
  auteur text default '',
  publie boolean not null default false,
  publie_le timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists articles_publie_idx on public.articles (publie, publie_le desc);
alter table public.articles disable row level security;
