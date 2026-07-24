# Réflexion — Vision cucina (2026-07-24)

Document de brainstorm. La référence engageante est la spec :
[`docs/specs/2026-07-24-cucina-v1-design.md`](../specs/2026-07-24-cucina-v1-design.md).

## L'idée

Une application web personnelle pour gérer deux choses : **les recettes** et **la liste de
courses** — reliées par la planification de la semaine : je choisis mes recettes, leurs
ingrédients tombent dans la liste de courses, quantités additionnées.

Deux exigences structurantes :
1. **Utilité réelle** : une app effectivement utilisée chaque semaine (critère : la liste de
   courses sert au supermarché, sur téléphone). Une V1 qui ne sort pas de la machine de
   développement ne répond pas au besoin.
2. **Mécanismes explicites** : les choix techniques doivent laisser visibles HTTP, REST, SQL
   et la séparation front/back, plutôt que de les masquer derrière des abstractions.

## Décisions prises pendant l'entretien (avec leur pourquoi)

| Décision | Pourquoi |
|---|---|
| Mono-utilisateur, zéro authentification | Tout l'effort V1 va au métier ; l'auth est une piste V2 |
| Web responsive : ordi à la maison, téléphone au magasin | L'usage réel ; impose le déploiement en V1 |
| Quantités additionnées entre recettes | Le vrai confort en magasin ; impose des ingrédients structurés |
| Référentiel d'ingrédients unique (autocomplétion, création à la volée) | Fusion fiable à 100 % ; « oignon »/« Oignons » ne peuvent pas diverger |
| Une unité par ingrédient, non modifiable dès qu'une recette l'utilise | Rend l'addition triviale et infaillible ; contrainte assumée à la saisie |
| Sélection de semaine sans jours ni calendrier | Suffisant pour générer les courses ; calendrier = V2 |
| Génération ponctuelle, liste indépendante ensuite | Zéro cas tordu de synchronisation ; comportement prévisible |
| Cocher barre l'article ; bouton « vider la liste » | Vérifiable en magasin, remise à zéro maîtrisée |
| Étapes de recette en texte libre multiligne | La donnée n'est qu'affichée, aucune logique dessus → pas de table dédiée |
| Déploiement inclus en V1 (dernier lot) | Sans lui, la liste n'existe pas au supermarché : « utilisable » non tenu |

## Stack retenue (approche A) et alternatives écartées

**Retenu : React + Vite / Node + Express + TypeScript / PostgreSQL, SQL écrit à la main
(driver `pg`), validation Zod, Postgres dans Docker en local.**
Critère dominant : chaque mécanisme du web reste visible et manipulé explicitement,
plutôt que délégué à un framework.

- PostgreSQL plutôt que SQLite : la base standard du marché dès la V1, au prix d'un Docker
  local — évite une migration ultérieure et rapproche le développement de la production.
- React plutôt qu'Angular : Angular impose injection de dépendances, modules, décorateurs et
  RxJS avant la première feature ; React avec `fetch` natif reste proche du JavaScript nu et
  laisse les appels réseau entièrement explicites.
- **Écarté — Next.js full-stack** : App Router et Server Components brouillent la frontière
  client/serveur, précisément celle que ce projet veut garder nette.
- **Écarté — BaaS (Supabase)** : pas de back à écrire, contraire au besoin exprimé
  (front, back et base de données).

## Passe avocat du diable — résultat

- 🔴 **Retenu et corrigé** : le déploiement devait entrer au périmètre V1 (fait).
- **Tranché PO** : unité d'un ingrédient non modifiable s'il est utilisé par une recette
  (409) ; unicité des noms d'ingrédients insensible à la casse ; suppression d'une recette
  = retrait automatique de la semaine.
- **Risques assumés V1** : double génération = double addition (mitigé par retour visuel) ;
  article manuel homonyme d'un ingrédient non fusionné ; pas de mode hors-ligne ;
  pas de synchro temps réel entre appareils.
- **Vérifié empiriquement** : Node v24.18.0 ✓, npm 11.16.0 ✓, Docker CLI 29.2.0 installé ✓
  (daemon à lancer), dépôt git initialisé ✓.

## Pistes V2 notées en route (non engageantes)

Authentification multi-utilisateurs · calendrier avec jours · portions ajustables ·
mode cuisine avec `recipe_steps` · mode hors-ligne (PWA) · photos de recettes ·
catégories/rayons sur la liste de courses · migration SQLite→Postgres inversée sans objet
(Postgres dès V1).
