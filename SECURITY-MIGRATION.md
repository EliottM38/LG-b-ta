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

La phase 2 activera les politiques RLS sur l'ensemble des tables consultées par
l'admin. Ne pas activer RLS avant : le reste de l'interface utilise encore des
accès directs aux données et doit être converti table par table.

La route `api/session` lit uniquement le profil strictement nécessaire à la
session après validation du jeton Supabase Auth. Elle ne renvoie jamais
`password_hash` ni une clé d'environnement.
