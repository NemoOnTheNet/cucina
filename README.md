# 🍅 Cucina

**Les recettes de la semaine remplissent la liste de courses toutes seules.**

Application mobile de gestion de recettes et de courses, partagée à l'échelle d'un **foyer** : on choisit les recettes de la semaine, leurs ingrédients atterrissent dans la liste de courses, et on y ajoute tout le reste du panier — de la carotte au papier toilette.

> État : **application fonctionnelle de bout en bout.** Comptes, foyer et invitations, recettes, semaine, liste de courses, PWA installable.
> Elle tourne par défaut en **mode local** (données sur l'appareil, aucun service distant). Pour partager entre membres du foyer : [docs/09 — Mise en service](docs/09-mise-en-service.md).

## Le produit en trois écrans

| Courses | Semaine | Recettes |
|---|---|---|
| La liste active du foyer, groupée par rayon, cochable d'un pouce en magasin. | Les recettes choisies pour la semaine — sans jour ni repas imposés. | Le carnet du foyer : ingrédients, étapes, ustensiles, photo. |

## Stack

- **Angular 21** standalone, zoneless, signals
- **Capacitor** pour l'empaquetage mobile (PWA aujourd'hui, Android ensuite)
- **Supabase** : Postgres + RLS, Auth, Storage
- **Vitest** pour les tests

Les pourquoi sont dans les [ADR](docs/adr/).

## Démarrer

```bash
npm install
npm start
```

L'application est disponible sur `http://localhost:4200/` — crée un compte, crée ton foyer, et c'est parti. Rien d'autre à configurer.

```bash
npm run build    # build de production (dist/cucina/browser)
npm test         # 54 tests unitaires
```

## Ce qui est en place

- **Courses** — ajout en un champ avec autocomplétion, rayon deviné automatiquement, groupement par parcours en magasin, cocher/décocher, quantités, balayage pour supprimer avec annulation, clôture et archivage.
- **Recettes** — création complète (photo compressée, ingrédients, étapes réordonnables, ustensiles, tags), recherche, mode cuisine (texte agrandi, écran maintenu allumé).
- **Semaine** — panier de recettes sans jour ni repas, portions ajustables, propagation automatique vers la liste, retrait propre.
- **Foyer** — comptes, gérant, codes d'invitation à 7 jours, membres.
- **Mobile** — PWA installable, thème clair/sombre, zones sûres iOS, Capacitor prêt pour Android.

## Les règles qui font le produit

Six règles gouvernent la liste de courses (fusion, retrait, quantités manuelles). Elles vivent dans `src/app/domain/`, **sans aucune dépendance à Angular ni à Supabase**, et sont couvertes par des tests. Elles sont décrites dans [docs/02 — Domaine](docs/02-domaine.md).

## Documentation

Tout le cadrage est dans [`docs/`](docs/README.md) — vision, domaine et règles métier, fonctionnalités, architecture, modèle de données, conventions, feuille de route.

Point d'entrée recommandé : [`docs/README.md`](docs/README.md).
