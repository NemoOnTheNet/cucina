# CLAUDE.md — règles de travail sur Cucina

## Ce qu'est le projet

Cucina est une application mobile de **recettes + liste de courses partagée par foyer**. On choisit les recettes de la semaine, la liste de courses se remplit toute seule, et on y ajoute librement tout le reste du panier (du papier toilette à l'eau en bouteille).

Lire [`docs/01-vision.md`](docs/01-vision.md) et [`docs/02-domaine.md`](docs/02-domaine.md) avant toute décision produit.

## Répartition des rôles

- **Claude écrit tout le code et toute la documentation.**
- **Robin oriente** : idées, arbitrages produit, validation de direction, relecture. Il est à l'aise en Angular/TypeScript, React et back-end/SQL : le code doit être relisible par quelqu'un du métier, les explications peuvent être techniques et directes.

## Stack (non négociable sans ADR)

- Angular 21, standalone, **zoneless**, signals — pas de `zone.js`.
- Capacitor pour l'empaquetage mobile.
- Supabase : Postgres + RLS, Auth, Storage, Realtime.
- Vitest + jsdom pour les tests.
- CSS natif, mobile-first, aucun framework UI.

## Avant d'écrire du code

1. Vérifier que la fonctionnalité est bien dans le périmètre : [`docs/03-fonctionnalites.md`](docs/03-fonctionnalites.md). Ce qui est en « Plus tard » ne se code pas au passage.
2. Vérifier la règle métier concernée : R1→R6 dans [`docs/02-domaine.md`](docs/02-domaine.md).
3. Respecter l'arborescence de [`docs/04-architecture.md`](docs/04-architecture.md).

## Règles dures

- **`domain/` n'importe jamais Angular ni Supabase.** Fonctions et types purs, testés. Toute règle métier y vit ; aucune règle métier ne vit dans un composant ou un store.
- **Un composant ne parle jamais à un repository.** Il passe par le store de sa fonctionnalité.
- **`any` interdit.** `strict` reste activé.
- **RLS sur toutes les tables.** L'isolation entre foyers est garantie en base, jamais par un filtre côté client. Aucune clé `service_role` côté client.
- **Aucune modification de schéma hors migration** dans `supabase/migrations/`.
- Interface et doc en **français**, code et base en **anglais**.
- `OnPush` partout, `input()`/`output()`, `@if`/`@for` avec `track`, `inject()`.

## Ce que je ne fais pas sans demander

- Ajouter une dépendance npm.
- Modifier ou supprimer une décision d'un ADR accepté.
- Écrire une migration destructive (suppression de colonne ou de table contenant des données).
- `git push`, ouvrir une PR, ou toucher au projet Supabase distant.
- Élargir le périmètre d'une histoire au-delà de ce qui est demandé.

## Ce que je fais systématiquement

- Écrire les tests des règles de `domain/` **avant** l'UI qui les utilise.
- Traiter les états de chargement, vide et erreur de chaque écran — pas seulement le cas passant.
- Mettre à jour la doc impactée **dans le même commit** que le code.
- Signaler quand une demande contredit un principe produit ou un ADR, plutôt que de l'appliquer en silence.

## Backend actif

Deux implémentations du **même** contrat `data/backend.ts` (cf. [ADR-0006](docs/adr/0006-deux-backends.md)) :

- **local (IndexedDB)** — par défaut, tant que `core/config.ts` n'a pas d'identifiants Supabase ;
- **Supabase** — dès que `supabaseUrl` et `supabaseAnonKey` sont renseignés.

Toute évolution du contrat doit être faite **dans les deux**. Un composant ou un store qui sait quelle implémentation tourne est un défaut.

## Commandes

```bash
npm start                    # serveur de dev (http://localhost:4200)
npm run build                # build de production
npm test                     # tests Vitest
npm run mobile:sync          # build + synchronisation Capacitor
```

## Définition de « terminé »

Voir [`docs/06-conventions.md`](docs/06-conventions.md#définition-de--terminé-). En résumé : ça marche sur un vrai téléphone, le build et les tests passent, les cas d'erreur sont gérés, la doc est à jour.
