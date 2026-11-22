-- Phase 3 — protection des données de l'espace admin.
--
-- Prérequis : tous les comptes staff actifs ont un `auth_user_id` relié à
-- Supabase Auth et le commit qui ajoute /api/staff et /api/admin-config est
-- déployé. À exécuter une seule fois dans Supabase SQL Editor.
-- Les clés serveur Vercel contournent RLS ; le navigateur, lui, est soumis aux
-- règles ci-dessous.

begin;

create or replace function public.has_active_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where auth_user_id = (select auth.uid())
      and actif = true
      and role = any (allowed_roles)
  );
$$;

create or replace function public.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.staff
  where auth_user_id = (select auth.uid()) and actif = true
  limit 1;
$$;

revoke all on function public.has_active_staff_role(text[]) from public;
revoke all on function public.current_staff_id() from public;
grant execute on function public.has_active_staff_role(text[]) to authenticated;
grant execute on function public.current_staff_id() to authenticated;

-- Profils et configuration : exclusivement via les API Vercel authentifiées.
-- Cela empêche de lire l'ancien password_hash ou de changer son propre rôle.
alter table public.staff enable row level security;
alter table public.app_config enable row level security;

-- Membres : lecture staff ; gestion Président / Vice-Président.
alter table public.membres enable row level security;
drop policy if exists "admin_membres_read" on public.membres;
drop policy if exists "admin_membres_manage" on public.membres;
create policy "admin_membres_read" on public.membres for select to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));
create policy "admin_membres_manage" on public.membres for all to authenticated
  using (public.has_active_staff_role(array['president','vice_president']))
  with check (public.has_active_staff_role(array['president','vice_president']));

-- Locations : tous lisent ; seuls les rôles opérationnels modifient.
alter table public.factures enable row level security;
drop policy if exists "admin_factures_read" on public.factures;
drop policy if exists "admin_factures_manage" on public.factures;
create policy "admin_factures_read" on public.factures for select to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));
create policy "admin_factures_manage" on public.factures for all to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable']))
  with check (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable']));

-- Intérimaires : lecture staff ; gestion Président / Vice-Président / Comptable.
alter table public.interimaires enable row level security;
drop policy if exists "admin_interimaires_read" on public.interimaires;
drop policy if exists "admin_interimaires_manage" on public.interimaires;
create policy "admin_interimaires_read" on public.interimaires for select to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));
create policy "admin_interimaires_manage" on public.interimaires for all to authenticated
  using (public.has_active_staff_role(array['president','vice_president','comptable']))
  with check (public.has_active_staff_role(array['president','vice_president','comptable']));

-- Objectifs : le Staff TM peut consulter, Président et Vice-Président gèrent.
alter table public.objectifs enable row level security;
drop policy if exists "admin_objectifs_read" on public.objectifs;
drop policy if exists "admin_objectifs_manage" on public.objectifs;
create policy "admin_objectifs_read" on public.objectifs for select to authenticated
  using (public.has_active_staff_role(array['president','vice_president','staff_tm']));
create policy "admin_objectifs_manage" on public.objectifs for all to authenticated
  using (public.has_active_staff_role(array['president','vice_president']))
  with check (public.has_active_staff_role(array['president','vice_president']));

-- Suivi des formulaires : visible par le staff ; modifiable par les rôles qui
-- le traitent dans l'interface.
alter table public.form_statuts enable row level security;
drop policy if exists "admin_form_statuts_read" on public.form_statuts;
drop policy if exists "admin_form_statuts_manage" on public.form_statuts;
create policy "admin_form_statuts_read" on public.form_statuts for select to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));
create policy "admin_form_statuts_manage" on public.form_statuts for all to authenticated
  using (public.has_active_staff_role(array['president','vice_president','comptable']))
  with check (public.has_active_staff_role(array['president','vice_president','comptable']));

-- Historique : chaque staff peut journaliser ; les notes sont réservées aux
-- rôles non lecture-seule. Les suppressions restent interdites.
alter table public.historique enable row level security;
drop policy if exists "admin_historique_read" on public.historique;
drop policy if exists "admin_historique_insert" on public.historique;
drop policy if exists "admin_historique_update" on public.historique;
create policy "admin_historique_read" on public.historique for select to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));
create policy "admin_historique_insert" on public.historique for insert to authenticated
  with check (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));
create policy "admin_historique_update" on public.historique for update to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable']))
  with check (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable']));

-- Tarifs : lecture staff (nécessaire aux calculs), édition Président / Vice.
alter table public.tarifs enable row level security;
drop policy if exists "admin_tarifs_read" on public.tarifs;
drop policy if exists "admin_tarifs_manage" on public.tarifs;
create policy "admin_tarifs_read" on public.tarifs for select to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));
create policy "admin_tarifs_manage" on public.tarifs for all to authenticated
  using (public.has_active_staff_role(array['president','vice_president']))
  with check (public.has_active_staff_role(array['president','vice_president']));

-- Agenda partagé : réservé aux comptes staff actifs.
alter table public.agenda_events enable row level security;
drop policy if exists "admin_agenda_read" on public.agenda_events;
drop policy if exists "admin_agenda_manage" on public.agenda_events;
create policy "admin_agenda_read" on public.agenda_events for select to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));
create policy "admin_agenda_manage" on public.agenda_events for all to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']))
  with check (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));

-- Cloud : métadonnées réservées au staff. Les objets Storage sont protégés
-- ci-dessous (un bucket public reste publiquement téléchargeable par design).
alter table public.cloud_files enable row level security;
drop policy if exists "admin_cloud_read" on public.cloud_files;
drop policy if exists "admin_cloud_manage" on public.cloud_files;
create policy "admin_cloud_read" on public.cloud_files for select to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));
create policy "admin_cloud_manage" on public.cloud_files for all to authenticated
  using (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']))
  with check (public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));

-- Messagerie : un staff ne voit que les messages qu'il envoie ou reçoit.
alter table public.messages enable row level security;
drop policy if exists "admin_messages_read" on public.messages;
drop policy if exists "admin_messages_send" on public.messages;
drop policy if exists "admin_messages_mark_read" on public.messages;
create policy "admin_messages_read" on public.messages for select to authenticated
  using (sender_id = public.current_staff_id() or receiver_id = public.current_staff_id());
create policy "admin_messages_send" on public.messages for insert to authenticated
  with check (sender_id = public.current_staff_id());
create policy "admin_messages_mark_read" on public.messages for update to authenticated
  using (receiver_id = public.current_staff_id())
  with check (receiver_id = public.current_staff_id());

-- Les images de factures et les fichiers partagés sont créés/supprimés par le
-- staff. La lecture publique éventuelle dépend de la visibilité du bucket.
drop policy if exists "admin_cloud_storage_manage" on storage.objects;
create policy "admin_cloud_storage_manage" on storage.objects for all to authenticated
  using (bucket_id = 'cloud-partage' and public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']))
  with check (bucket_id = 'cloud-partage' and public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable','staff_tm']));
drop policy if exists "admin_factures_storage_manage" on storage.objects;
create policy "admin_factures_storage_manage" on storage.objects for all to authenticated
  using (bucket_id = 'factures' and public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable']))
  with check (bucket_id = 'factures' and public.has_active_staff_role(array['president','vice_president','gestionnaire_parc','comptable']));

commit;
