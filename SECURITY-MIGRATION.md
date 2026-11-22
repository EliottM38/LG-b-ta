# Migration de sécurité — phase 1

Cette version retire les clés sensibles du navigateur et utilise Supabase Auth
pour la session staff. Elle exige la préparation suivante **avant** son
déploiement :

1. Dans le projet Vercel de l'admin, créer `SUPABASE_PUBLISHABLE_KEY` dans les
   environnements Production et Preview. Sa valeur est la clé publishable
   (`sb_publishable_…`) du projet Supabase : elle peut être envoyée au navigateur.
2. Conserver `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` et `TM_API_KEY` seulement
   comme variables serveur. Ne jamais les ajouter au code, aux variables
   publiques ou à GitHub.
3. Créer le compte dans Supabase Auth, puis lier son UUID à
   `public.staff.auth_user_id`.
4. Garder la protection Vercel activée durant toute la migration.

La route `api/session` lit uniquement le profil strictement nécessaire à la
session après validation du jeton Supabase Auth. Elle ne renvoie jamais
`password_hash` ni une clé d'environnement.

## Phase 2 — contenu du site public

Après le déploiement de `api/site-config.js`, exécuter
`sql/phase-2-public-site-rls.sql` dans le SQL Editor Supabase. Cette migration
active RLS sur les articles, les photos du catalogue et leurs écritures Storage.
Les réglages éditoriaux stockés dans `app_config` passent déjà par une API Vercel
authentifiée afin de ne pas perturber les autres modules de l'admin.

## Phase 3 — données de l'administration

Après le déploiement qui ajoute `api/staff.js` et `api/admin-config.js`, vérifier
que **chaque** compte staff actif est relié à Supabase Auth (`auth_user_id` non
nul), puis exécuter `sql/phase-3-admin-rls.sql`. Cette migration :

- bloque tout accès navigateur direct à `staff` et `app_config` ;
- limite les données opérationnelles aux rôles réellement autorisés ;
- cloisonne la messagerie au seul expéditeur et destinataire ;
- limite les écritures Storage aux comptes staff authentifiés.

Ne pas exécuter cette phase avant le déploiement : l'interface doit d'abord
passer par les nouvelles API serveur pour les profils et la configuration.
Lorsque tous les comptes ont été testés, l'ancien champ `staff.password_hash`
peut être vidé dans une étape séparée et irréversible.
