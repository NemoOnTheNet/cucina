# ADR-0002 — Supabase plutôt que Firebase

**Statut** : accepté · **Date** : 2026-08-26

## Contexte

Il faut de l'authentification, une base partagée par foyer, du stockage de photos et un hébergement, le tout **à coût nul** pendant la phase de test familiale, sans exclure une ouverture plus large ensuite. Firebase était le premier réflexe.

## Décision

**Supabase** : Postgres + Auth + Storage + Realtime.

## Raisons

1. **Coût réellement nul.** Firebase Storage exige désormais un plan avec moyen de paiement pour tout nouveau projet. Or les photos de recettes sont dans le périmètre v1. L'offre gratuite Supabase inclut le stockage sans carte bancaire.
2. **Le modèle est relationnel par nature.** Recettes → ingrédients → produits → lignes de liste → origines : ce sont des jointures et des contraintes d'unicité. En Postgres, la règle de fusion R2 devient une contrainte `unique(shopping_list_id, product_id, unit)` que la base fait respecter. En Firestore, ce serait du code applicatif fragile et de la dénormalisation.
3. **L'isolation par foyer se dit en une ligne de SQL** (RLS + `is_member(household_id)`), appliquée à toutes les tables, vérifiable.
4. **Porte de sortie.** Si Cucina grossit, migrer vers un Postgres géré et une API maison, c'est un `pg_dump` — pas une réécriture du modèle de données.
5. Compétence SQL/back-end existante côté humain : les migrations et les politiques sont relisibles.

## Conséquences

- **Pas de synchronisation hors ligne offerte**, contrairement à Firestore. C'est le vrai prix de cette décision. La v1 assume : lecture hors ligne via cache local, écritures en ligne. Une file d'écritures différées est un chantier identifié (L4.2), pas un acquis.
- Les migrations doivent être disciplinées : tout passe par `supabase/migrations/`, rien à la main dans l'interface web.
- Les limites de l'offre gratuite (projet mis en pause après inactivité prolongée, quotas de stockage) sont à surveiller — sans conséquence à l'échelle d'un foyer.

## Alternatives écartées

- **Firebase** : meilleur hors ligne, mais carte bancaire obligatoire pour le stockage, modèle documentaire mal adapté aux agrégations d'ingrédients, et migration ultérieure douloureuse.
- **Local d'abord, sans back-end** : le plus rapide à sortir, mais tue la fonctionnalité *foyer partagé*, qui est le cœur du produit. Une liste de courses qu'un seul téléphone voit ne sert à rien.
