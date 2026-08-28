# ADR-0006 — Deux implémentations du backend : locale et Supabase

**Statut** : accepté · **Date** : 2026-08-26

## Contexte

L'[ADR-0002](0002-supabase.md) retient Supabase. Mais Supabase suppose un projet créé, avec ses identifiants, et les migrations appliquées. Or l'application devait être **utilisable et vérifiable immédiatement**, sans dépendre de cette mise en service.

Par ailleurs, l'architecture pose déjà que l'accès aux données passe par un contrat (`data/backend.ts`) et que le domaine ignore tout du stockage.

## Décision

Deux implémentations du **même** contrat `Backend` :

- **`LocalBackend`** (IndexedDB) — actif par défaut. Comptes, foyer, recettes, semaine, liste : tout fonctionne, sur l'appareil, sans réseau.
- **`SupabaseBackend`** — actif dès que `supabaseUrl` et `supabaseAnonKey` sont renseignés dans `core/config.ts`.

Le choix se fait à un seul endroit, dans `provideBackend()`. Aucun composant, aucun store ne sait quelle implémentation tourne.

## Conséquences

- L'application est **testable tout de suite**, y compris par quelqu'un qui n'a aucun compte Supabase.
- Les magasins IndexedDB reproduisent **une à une** les tables SQL. Les deux implémentations se lisent côte à côte, et un écart de comportement se voit.
- **Le mode local n'est pas partagé** : deux téléphones en mode local sont deux foyers séparés. Les invitations y fonctionnent mécaniquement mais n'ont aucun intérêt. L'écran Foyer le dit explicitement plutôt que de laisser croire à un partage.
- Le mode local sert aussi de **filet** : si Supabase est indisponible ou mal configuré, il reste un chemin qui marche pour développer.
- Coût : toute évolution du contrat doit être faite **deux fois**. C'est le prix, et il est visible — c'est préférable à une abstraction fuyante qui prétend l'éviter.
- `SupabaseBackend` est écrit et compile, mais **n'a pas encore tourné contre un vrai projet** : il reste à vérifier lors de la première mise en service.

## Alternatives écartées

- **Attendre Supabase pour construire l'UI** : bloquer tout le travail sur une mise en service externe.
- **Un mode « démo » avec des données factices** : ne prouve rien, et il aurait fallu l'écrire puis le jeter.
