-- Phase 2 — administration du site public uniquement.
-- À exécuter APRÈS le déploiement du commit « Move public site settings behind staff API ».
-- Les API publiques Vercel utilisent une clé serveur et continuent de fonctionner.

begin;

create or replace function public.has_active_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff
    where auth_user_id = (select auth.uid())
      and actif = true
      and role = any (allowed_roles)
  );
$$;

revoke all on function public.has_active_staff_role(text[]) from public;
grant execute on function public.has_active_staff_role(text[]) to authenticated;

-- Articles : uniquement Président et Vice-Président.
alter table public.articles enable row level security;
drop policy if exists "site_articles_read" on public.articles;
drop policy if exists "site_articles_manage" on public.articles;

create policy "site_articles_read"
on public.articles for select to authenticated
using (public.has_active_staff_role(array['president', 'vice_president']));

create policy "site_articles_manage"
on public.articles for all to authenticated
using (public.has_active_staff_role(array['president', 'vice_president']))
with check (public.has_active_staff_role(array['president', 'vice_president']));

-- Photos et visuels : Président, Vice-Président, Gestionnaire de parc.
alter table public.parc_photos enable row level security;
drop policy if exists "site_photos_read" on public.parc_photos;
drop policy if exists "site_photos_manage" on public.parc_photos;

create policy "site_photos_read"
on public.parc_photos for select to authenticated
using (public.has_active_staff_role(array['president', 'vice_president', 'gestionnaire_parc']));

create policy "site_photos_manage"
on public.parc_photos for all to authenticated
using (public.has_active_staff_role(array['president', 'vice_president', 'gestionnaire_parc']))
with check (public.has_active_staff_role(array['president', 'vice_president', 'gestionnaire_parc']));

-- Le bucket reste publiquement lisible (photos du catalogue), mais seuls les
-- mêmes rôles staff peuvent créer, modifier ou supprimer des objets.
drop policy if exists "site_parc_photos_storage_manage" on storage.objects;
create policy "site_parc_photos_storage_manage"
on storage.objects for all to authenticated
using (
  bucket_id = 'parc-photos'
  and public.has_active_staff_role(array['president', 'vice_president', 'gestionnaire_parc'])
)
with check (
  bucket_id = 'parc-photos'
  and public.has_active_staff_role(array['president', 'vice_president', 'gestionnaire_parc'])
);

commit;
