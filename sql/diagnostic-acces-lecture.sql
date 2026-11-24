-- Diagnostic en lecture seule. À exécuter dans le SQL Editor du projet concerné.
-- Ne contient ni clé, ni donnée de membre ou de facture.
select n.nspname as schema, c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('staff', 'membres', 'factures');

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('staff', 'membres', 'factures')
order by tablename, policyname;

-- Nombre de comptes actifs reliés ou non à Auth, sans identifiant personnel.
select role, count(*) as comptes_actifs,
       count(*) filter (where auth_user_id is not null) as comptes_lies_auth
from public.staff where actif is true group by role order by role;
