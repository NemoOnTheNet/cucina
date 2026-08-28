# Spec — cucina V1

**Statut** : validée — **Date** : 2026-07-24
**Document de réflexion associé** : [`docs/reflexion/2026-07-24-vision-cucina.md`](../reflexion/2026-07-24-vision-cucina.md)

## 1. Objectif et vision

cucina est une application web personnelle, mono-utilisateur, qui gère un catalogue de
recettes et une liste de courses. Chaque semaine, l'utilisateur sélectionne les recettes
prévues ; l'application déverse leurs ingrédients dans la liste de courses en additionnant
les quantités d'un même ingrédient. La liste se consulte et se coche sur téléphone, au
supermarché.

**La V1 est finie quand** : l'application est en ligne, accessible depuis un téléphone, et
qu'une semaine réelle de courses a pu être faite avec (sélection de recettes → génération →
courses cochées en magasin → liste vidée).

Contrainte transverse assumée : les choix techniques privilégient systématiquement la
visibilité des mécanismes (HTTP, REST, SQL, séparation front/back) sur le confort des
frameworks. Un comportement doit pouvoir se diagnostiquer en lisant le code du projet, sans
connaissance intime d'une abstraction tierce.

## 2. Périmètre

### Dans la V1
1. **F1 — Liste de courses** : ajouter un article à la main, modifier sa quantité, le
   cocher/décocher, le supprimer, vider la liste.
2. **F2 — Recettes** : créer, consulter, modifier, supprimer des recettes (nom,
   instructions en texte libre, ingrédients quantifiés issus du référentiel).
3. **F3 — Semaine → courses** : sélectionner les recettes de la semaine, générer les
   articles de courses correspondants avec addition des quantités par ingrédient.
4. **Référentiel d'ingrédients** (support de F2/F3) : création à la volée, autocomplétion,
   correction, suppression si inutilisé.
5. **Déploiement** : app + base PostgreSQL hébergées, accessibles depuis le téléphone.
   Deux décisions à prendre dans ce lot : comment les migrations s'exécutent sur la base
   hébergée (étape explicite du déploiement, jamais au démarrage de l'app), et si le front
   est servi par la même origine que l'API (préféré : aucun CORS à gérer) ou une origine
   distincte (alors CORS à configurer côté serveur).

### Hors V1 (pistes V2, non engageantes)
Authentification · calendrier par jours · portions ajustables · mode cuisine
(table d'étapes) · mode hors-ligne/PWA · photos · catégories/rayons · temps réel
multi-appareils.

## 3. Utilisateur et contexte

Un seul utilisateur (éventuellement son foyer, sur le même écran). Deux contextes :
- **Maison, grand écran** : gérer les recettes, préparer la semaine.
- **Supermarché, téléphone** : lire et cocher la liste de courses. L'interface est pensée
  mobile d'abord ; l'onglet Courses est l'écran d'accueil.

Pas de comptes, pas de sessions, pas de rôles. Toute personne ayant l'URL a tous les droits
(risque accepté en V1 ; l'URL n'est pas publiée).

## 4. Concepts et règles métier

### Ingrédient (référentiel)
- Champs : nom, unité. L'unité vaut `g`, `ml`, `piece`, `cas` (cuillère à soupe) ou
  `cac` (cuillère à café).
- Le nom est **unique sans tenir compte de la casse** (« oignon » ≡ « Oignon »), espaces
  de début/fin ignorés.
- **L'unité appartient à l'ingrédient** : toute recette exprime ses quantités dans cette
  unité. Elle est modifiable uniquement tant qu'aucune recette n'utilise l'ingrédient
  (sinon : conflit 409). Le renommage est toujours permis (l'unicité reste vérifiée).
- Suppression refusée si au moins une recette l'utilise (409). Les articles de courses
  liés à un ingrédient supprimé restent sur la liste et perdent seulement leur lien.
- Le renommage d'un ingrédient ne modifie jamais le libellé des articles de courses
  existants (le libellé a été copié à leur création).

### Recette
- Champs : nom (obligatoire, non vide), instructions (texte libre multiligne, peut être
  vide), liste d'ingrédients — chaque ligne : un ingrédient du référentiel + une quantité
  strictement positive (décimaux permis), exprimée dans l'unité de l'ingrédient.
- Deux recettes peuvent porter le même nom (pas de contrainte d'unicité sur les recettes).
- Une recette peut ne contenir aucun ingrédient (brouillon) ; elle est alors sélectionnable
  pour la semaine mais ne génère rien.
- Un même ingrédient n'apparaît qu'une fois par recette.
- Supprimer une recette la retire automatiquement de la sélection de la semaine ;
  les articles de courses déjà générés ne bougent pas.

### Sélection de la semaine
- Un simple ensemble de recettes (pas de jours, pas de quantité de fois).
- Remplaçable en bloc ; sélectionner/désélectionner ne modifie jamais la liste de courses.

### Liste de courses
- Un article porte : libellé (obligatoire), quantité optionnelle (positive, décimaux
  permis), unité optionnelle en **texte libre court** (ex. « rouleaux » — contrairement aux
  ingrédients, pas de liste fermée), état coché/non coché, et un lien optionnel vers un
  ingrédient du référentiel.
- **Articles manuels** : créés au clavier, sans lien vers le référentiel. « Papier
  toilette » n'entre jamais dans le référentiel.
- **Génération** (action `generate`) : l'application agrège les ingrédients de toutes les
  recettes sélectionnées (somme des quantités par ingrédient), puis pour chaque ingrédient
  agrégé :
  - s'il existe déjà un article **non coché** lié à cet ingrédient → sa quantité est
    augmentée de la somme (s'il en existe plusieurs, **le plus ancien** est incrémenté ;
    si sa quantité avait été effacée, la somme la remplace) ;
  - sinon → un nouvel article est créé (libellé = nom de l'ingrédient, unité = celle de
    l'ingrédient, lien posé).
  - Les articles cochés et les articles manuels ne sont jamais touchés.
  - Relancer la génération réapplique l'addition (comportement assumé) ; la réponse indique
    le nombre d'articles créés et modifiés pour que le front affiche un retour clair.
- Cocher un article le barre ; il **reste dans la liste** (ni supprimé ni archivé) et
  l'interface regroupe les articles cochés en bas. Décocher revient en arrière.
- **Vider la liste** supprime tous les articles, cochés ou non, après confirmation côté
  interface.

## 5. Architecture

```
cucina/
├── client/   React + Vite — l'interface, parle uniquement HTTP/JSON à l'API
└── server/   Express + TypeScript — l'API REST, seule à parler à PostgreSQL
```

- **Front** : React + Vite. Appels API en `fetch` natif. Trois états visibles pour toute
  donnée distante : chargement, erreur, succès.
- **Back** : Node.js + Express + TypeScript. Routes explicites, validation d'entrée avec
  Zod, middleware d'erreur central.
- **Base** : PostgreSQL. **SQL écrit à la main** via le driver `pg` — pas d'ORM, pas de
  query builder. Schéma créé par des fichiers de migration SQL numérotés, rejouables sur
  une base vierge.
- **Local** : PostgreSQL dans Docker (une base de développement + une base de test).
- Le front ne contient aucun secret ni accès base ; le back est la seule source de vérité
  pour la validation.

## 6. Modèle de données

Cinq tables. Description engageante ; le SQL exact (types, index) relève de l'implémentation.

| Table | Contenu | Contraintes clés |
|---|---|---|
| `ingredients` | nom, unité | nom unique insensible à la casse ; unité dans la liste fermée |
| `recipes` | nom, instructions | nom non vide |
| `recipe_ingredients` | recette ↔ ingrédient, quantité | clé unique (recette, ingrédient) ; quantité > 0 ; suppression de la recette → lignes supprimées ; suppression de l'ingrédient bloquée s'il est référencé |
| `week_recipes` | recette sélectionnée | recette unique dans la sélection ; suppression de la recette → ligne supprimée |
| `shopping_list_items` | libellé, quantité?, unité? (texte libre), coché, lien ingrédient?, date de création | libellé non vide ; quantité > 0 si présente ; suppression de l'ingrédient → lien mis à NULL, l'article reste |

## 7. Contrat d'API

Toutes les routes sous `/api`, corps en JSON. Codes : `200` lecture/modification réussie,
`201` création, `204` suppression réussie, `400` entrée invalide, `404` introuvable,
`409` conflit, `500` erreur inattendue.

**Format d'erreur uniforme** (toutes les erreurs, toutes les routes) :

```json
{ "error": { "code": "INGREDIENT_IN_USE", "message": "Cet ingrédient est utilisé par 2 recettes." } }
```

| Méthode et route | Rôle | Points notables |
|---|---|---|
| `GET /api/ingredients?search=` | Autocomplétion et listing | recherche insensible à la casse, sous-chaîne |
| `POST /api/ingredients` | Créer | 409 si nom déjà pris (casse ignorée) |
| `PATCH /api/ingredients/:id` | Corriger nom/unité | 409 si nouvelle unité alors qu'utilisé ; 409 si nom pris |
| `DELETE /api/ingredients/:id` | Supprimer | 409 si utilisé par une recette |
| `GET /api/recipes` | Liste (nom + nombre d'ingrédients) | |
| `GET /api/recipes/:id` | Détail avec lignes d'ingrédients | |
| `POST /api/recipes` | Créer (nom, instructions, lignes) | tout-ou-rien : recette + lignes dans une transaction |
| `PUT /api/recipes/:id` | Remplacer intégralement | idem, transactionnel |
| `DELETE /api/recipes/:id` | Supprimer | retire aussi de la semaine |
| `GET /api/week` | Recettes sélectionnées | |
| `PUT /api/week` | Remplacer la sélection (liste d'ids) | idempotent ; ids en double dédoublonnés silencieusement ; 400 si un id inconnu |
| `GET /api/shopping-list` | Tous les articles | ordre stable : non cochés puis cochés, chaque groupe par date de création croissante |
| `POST /api/shopping-list/items` | Ajout manuel | |
| `PATCH /api/shopping-list/items/:id` | Cocher/décocher, quantité, libellé | la quantité peut être effacée (mise à vide) |
| `DELETE /api/shopping-list/items/:id` | Supprimer un article | |
| `POST /api/shopping-list/generate` | Générer depuis la semaine | réponse : `{ "created": n, "updated": m }` ; sélection vide → 200 avec compteurs à zéro |
| `POST /api/shopping-list/clear` | Tout supprimer | 200 avec le nombre d'articles supprimés |

### Corps des requêtes d'écriture

| Route | Corps attendu |
|---|---|
| `POST /api/ingredients` | `{ "name": "Oignon", "unit": "piece" }` |
| `PATCH /api/ingredients/:id` | `{ "name"?: "…", "unit"?: "…" }` (au moins un champ) |
| `POST` et `PUT /api/recipes` | `{ "name": "Bolognaise", "instructions": "…", "ingredients": [ { "ingredientId": 1, "quantity": 2 } ] }` |
| `PUT /api/week` | `{ "recipeIds": [1, 4, 7] }` |
| `POST /api/shopping-list/items` | `{ "label": "Papier toilette", "quantity"?: 6, "unit"?: "rouleaux" }` |
| `PATCH /api/shopping-list/items/:id` | `{ "label"?: "…", "quantity"?: 3, "unit"?: "…", "checked"?: true }` (au moins un champ) |

### Codes d'erreur

`VALIDATION_ERROR` (400) · `NOT_FOUND` (404) · `INGREDIENT_NAME_TAKEN` (409) ·
`INGREDIENT_IN_USE` (409, message précisant le nombre de recettes concernées) ·
`INGREDIENT_UNIT_LOCKED` (409) · `DUPLICATE_INGREDIENT_IN_RECIPE` (400) ·
`INTERNAL_ERROR` (500).

## 8. Écrans

Trois onglets, navigation en bas de l'écran sur mobile. Design sobre ; l'ergonomie prime
sur l'esthétique en V1.

1. **Courses** (accueil) : articles non cochés puis cochés (barrés) ; case à cocher par
   article ; champ d'ajout manuel rapide ; bouton « vider la liste » avec confirmation ;
   modification de quantité et suppression par article.
2. **Recettes** : liste des recettes → détail (instructions + ingrédients quantifiés) ;
   création et édition par formulaire — lignes d'ingrédients avec autocomplétion sur le
   référentiel et création d'ingrédient à la volée (nom + unité) sans quitter le formulaire.
3. **Semaine** : liste de toutes les recettes avec sélection (toggle) ; bouton « ajouter à
   la liste de courses » qui affiche en retour combien d'articles ont été créés/mis à jour.

## 9. Qualité, tests, vérification

- **TDD sur le back** : chaque comportement d'API est couvert par des tests d'intégration
  (Vitest + Supertest) exécutés contre un vrai PostgreSQL de test — pas de base simulée.
  Le test s'écrit avant le code qu'il vérifie — discipline de travail, vérifiable
  seulement par l'ordre des commits, pas par l'artefact livré.
- **Front ciblé** : tests de composants (Vitest + Testing Library) sur le formulaire de
  recette et la coche d'articles au minimum.
- **Commande de vérification complète** : un script unique à la racine enchaîne lint,
  build et tous les tests des deux packages. Créée au premier ticket, documentée dans
  `AGENTS.md`. **Définition de fini de tout ticket : cette commande passe.**
- Migrations rejouables : une base vierge + les migrations = le schéma complet, sans étape
  manuelle.

## 10. Critères d'acceptation de la V1 (vérifiables)

1. Depuis le téléphone, sur l'app en ligne : je crée l'ingrédient « Oignon » (pièce) via le
   formulaire de recette, la bolognaise (2 oignons) et le curry (1 oignon), je sélectionne
   les deux pour la semaine, je génère : la liste de courses affiche un seul article
   « Oignon — 3 pièce ».
2. Je régénère sans rien changer : l'article passe à 6 et l'interface me dit qu'un article
   a été mis à jour, zéro créé.
3. J'ajoute « papier toilette » à la main, je coche trois articles : ils restent visibles
   barrés ; je décoche l'un d'eux : il redevient normal.
4. « Vider la liste » (après confirmation) laisse une liste vide ; recettes, référentiel et
   sélection de semaine sont intacts.
5. Tenter de supprimer l'ingrédient « Oignon » tant que la bolognaise existe répond un
   conflit (409, `INGREDIENT_IN_USE`) dont le message indique le nombre de recettes qui
   l'utilisent, et l'interface affiche ce message.
6. La commande de vérification complète passe sur une machine fraîchement clonée
   (Docker démarré), sans étape manuelle non documentée.

## 11. Risques assumés (V1)

| Risque | Position |
|---|---|
| Double génération = quantités doublées | Assumé ; retour visuel `created/updated` après chaque génération |
| Article manuel homonyme d'un ingrédient : pas de fusion | Assumé ; doublon visuel possible |
| Pas de mode hors-ligne au magasin | Assumé ; nécessite du réseau ; piste V2 (PWA) |
| Pas de temps réel entre appareils | Assumé ; données fraîches au chargement d'écran, dernier écrit gagne |
| URL publique sans authentification | Assumé ; URL non publiée ; auth = piste V2 |
