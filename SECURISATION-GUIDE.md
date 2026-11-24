# Sécuriser l'administration et retrouver les listes

La clé historique `service_role` a été exposée par l'administration habituelle.
Elle doit être considérée compromise. Ne copiez jamais une clé ou un jeton dans
un chat, un ticket, GitHub ou ce document.

## 1. Relever les droits sans modifier les données

Dans le SQL Editor Supabase du projet partagé, exécuter `sql/diagnostic-acces-lecture.sql`.
Ce script ne change rien. Il affiche les règles RLS et le nombre de comptes
staff liés à Auth par rôle. Les résultats des règles peuvent être communiqués
après vérification qu'ils ne contiennent aucun secret ou donnée personnelle.
Une liste vide dans la bêta peut venir d'une règle RLS qui filtre les lignes
sans erreur : un compte connecté ne suffit pas à prouver ses droits SQL.

Ne pas exécuter automatiquement `sql/phase-3-admin-rls.sql` : il modifie aussi
les droits d'autres fonctions, et des politiques existantes permissives peuvent
s'ajouter aux nouvelles. Examiner d'abord l'état réel et vérifier les comptes
staff et les accès utilisés par les deux applications.

## 2. Préparer le remplacement de la clé exposée

1. Dans Supabase, suivre le guide officiel de migration vers les clés
   publishable et secret : https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys .
   Créer au besoin des clés secrètes distinctes par application, côté serveur.
2. Inventorier tous les déploiements, environnements et services utilisant les
   anciennes clés : administration habituelle et bêta, site public, automatisations,
   sauvegardes et autres intégrations. Tester les nouvelles clés côté serveur ;
   elles ne doivent jamais apparaître dans la configuration du navigateur.
3. Migrer l'administration habituelle vers une version authentifiée compatible
   avec les droits RLS, puis vérifier connexion, membres, factures, écritures et
   autres fonctions avec chaque rôle. Le dépôt actuel correspond à la bêta :
   ne pas supposer que son déploiement remplace automatiquement l'ancienne version.
4. Suivre la procédure officielle en cas de fuite :
   https://supabase.com/docs/guides/security/rotate-leaked-api-keys . Pour une
   ancienne clé `service_role` JWT, il faut aussi révoquer l'ancien secret de
   signature JWT après migration. Vérifier les conséquences sur les sessions et
   intégrations avant cette étape ; créer une nouvelle clé ne suffit pas.
5. Désactiver les anciennes clés seulement après migration et tests, puis vérifier
   que l'ancienne clé ne fonctionne plus et que les applications fonctionnent.

Tant que l'ancienne clé est active, les droits RLS ne protègent pas les données
contre son utilisation. L'exposition est déjà réelle : réduire ce délai et
consulter les journaux disponibles pour rechercher des accès inhabituels.
