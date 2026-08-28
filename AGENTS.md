# cucina — conventions du projet

Application web personnelle de gestion de recettes et de liste de courses.
Spec de référence : [`docs/specs/2026-07-24-cucina-v1-design.md`](docs/specs/2026-07-24-cucina-v1-design.md).
Backlog : [`docs/backlog/README.md`](docs/backlog/README.md).

## Organisation

Projet à développeur unique. Les décisions produit et techniques sont arrêtées en amont du
code : une spec fait foi, un backlog découpe le travail en lots et en tickets, chaque ticket
passe en revue avant d'être committé.

Principe directeur des choix techniques : **préférer les mécanismes explicites aux
abstractions qui les masquent**. Le code doit rester débogable sans connaissance intime d'un
framework.

## Stack

| Couche | Choix | Règle |
|---|---|---|
| Front | React + Vite + TypeScript | Appels API en `fetch` natif, pas de bibliothèque de data fetching |
| Back | Node.js + Express + TypeScript | Validation d'entrée avec Zod sur chaque route |
| Base | PostgreSQL, driver `pg` | **SQL écrit à la main** — pas d'ORM, pas de query builder |
| Local | PostgreSQL dans Docker | Deux bases : développement et test |

Le front ne parle jamais à la base : il appelle l'API en HTTP/JSON. L'API est la seule
source de vérité pour la validation — ce qui arrive par HTTP n'est jamais digne de confiance.

## Définition de fini

Un ticket est fini quand **`npm run verify` passe en entier** à la racine (lint,
vérification des types, compilation, tous les tests des deux packages). Les tests du seul
ticket qui passent ne suffisent pas.

## Discipline de développement

- **TDD** : le test s'écrit avant le code et doit être vu échouer pour la bonne raison.
- **Tests réels plutôt que simulés** : les tests d'API tournent contre un vrai PostgreSQL
  de test, jamais contre une base simulée.
- **Trois états visibles** pour toute donnée distante côté front : chargement, erreur, succès.
- **Commentaires : uniquement le pourquoi** (contrainte non évidente, piège, décision), en
  anglais. Jamais de date, d'historique ni de paraphrase du code — git porte l'historique.
- **Code simple et lisible** avant tout : pas d'abstraction sans un deuxième cas d'usage réel.

## Git

- **Une branche par lot** (`feat/…`, `chore/…`), créée au premier ticket du lot.
- **Un commit par ticket**, message en anglais, format `type(scope): description`, décrivant
  le comportement livré et non le process.
- **Aucun commit sans double revue approuvée et validation explicite** sur ce commit précis.
  Un feu vert général ne vaut jamais autorisation de committer.
- Push et pull request : uniquement sur demande explicite.

## Jamais versionné

Fichiers d'environnement locaux (`.env` et variantes), dépendances installées, artefacts de
build, données de la base. Un fichier d'exemple de configuration, lui, est versionné.

## Hors périmètre repéré en route

Un problème étranger au ticket en cours (dette, faille, code mort, doc périmée, test
manquant) ne se corrige pas dans le lot : il devient une issue GitHub sur
`NemoOnTheNet/cucina`, rédigée en anglais, publiée après accord du mainteneur.
