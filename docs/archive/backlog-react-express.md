# Backlog cucina — V1

Référence : [spec V1](../specs/2026-07-24-cucina-v1-design.md). En cas de désaccord entre un
ticket et la spec, **la spec fait foi** — signaler l'écart plutôt que de trancher seul.

## Principe de découpage

Six lots, ordonnés par **valeur livrée tôt** et **difficulté croissante**. Chaque lot est une
branche, chaque ticket un commit. L'ordre n'est pas négociable : chaque lot s'appuie sur les
acquis techniques du précédent.

| Lot | Branche | Ce qu'il livre | Terrain technique |
|---|---|---|---|
| 0 — Fondations | `chore/fondations` | Une app vide mais complète : base, API, interface, tests, commande de vérification | Docker, migrations SQL, Express, Vite, harnais de test |
| 1 — Liste de courses | `feat/liste-de-courses` | **Une app déjà utilisable** : liste manuelle, coche, vidage | CRUD complet de bout en bout, états de chargement/erreur |
| 2 — Ingrédients | `feat/ingredients` | Le référentiel avec ses garde-fous | Contraintes d'intégrité, conflits 409, recherche SQL |
| 3 — Recettes | `feat/recettes` | Création, consultation, édition, suppression des recettes | Relations N-N, transactions, formulaire complexe |
| 4 — Semaine et génération | `feat/semaine-et-generation` | **Le cœur du produit** : sélection puis génération des courses | Agrégation SQL, logique métier non triviale |
| 5 — Déploiement | `chore/deploiement` | L'app en ligne, accessible depuis un téléphone | Variables d'environnement, migrations en prod, hébergement |

**Pourquoi la liste de courses avant les recettes ?** Parce qu'à la fin du lot 1 le produit
rend déjà un service réel (une liste de courses accessible depuis le téléphone), au lieu
d'attendre la toute fin. Et parce que c'est le morceau le plus simple techniquement — une
table, aucune jointure — là où la complexité monte ensuite avec les relations (lot 3) puis
l'agrégation (lot 4).

## Niveau de détail : sprint courant détaillé, reste esquissé

Seul le lot en cours est détaillé au niveau ticket. Les lots suivants sont volontairement
esquissés : les affiner maintenant reviendrait à figer des décisions avant d'avoir le retour
d'expérience du lot précédent. **Chaque lot est affiné juste avant son démarrage.**

- **Lot 0 — détaillé** : [`lot-0-fondations.md`](lot-0-fondations.md) ← sprint courant
- Lots 1 à 5 — esquissés ci-dessous

## Sprint 1 = Lot 0 (fondations)

**Objectif du sprint** : à la fin, `npm run verify` passe à la racine, et une page React
affiche une donnée venue de PostgreSQL en passant par l'API. L'app ne rend encore aucun
service — mais toute la chaîne est vivante et testée.

Cinq tickets, dans l'ordre : T0.1 → T0.2 → T0.3 → T0.4 → T0.5.

## Esquisse des lots suivants

### Lot 1 — Liste de courses (F1)
- T1.1 — API : lister les articles dans un ordre stable
- T1.2 — API : ajouter un article manuel
- T1.3 — API : modifier un article (cocher/décocher, quantité, libellé)
- T1.4 — API : supprimer un article, vider la liste
- T1.5 — Écran Courses : affichage, cochés regroupés en bas, états chargement/erreur
- T1.6 — Écran Courses : ajout rapide, modification, suppression, vidage avec confirmation

### Lot 2 — Référentiel d'ingrédients
- T2.1 — API : créer un ingrédient (unicité insensible à la casse)
- T2.2 — API : rechercher et lister
- T2.3 — API : modifier (nom libre, unité verrouillée si utilisée)
- T2.4 — API : supprimer (refus si utilisé par une recette)

### Lot 3 — Recettes (F2)
- T3.1 — API : créer une recette avec ses ingrédients (transaction)
- T3.2 — API : lister et consulter le détail
- T3.3 — API : remplacer une recette (transaction)
- T3.4 — API : supprimer une recette
- T3.5 — Écran Recettes : liste et détail
- T3.6 — Écran Recettes : formulaire avec autocomplétion et création d'ingrédient à la volée

### Lot 4 — Semaine et génération (F3)
- T4.1 — API : lire et remplacer la sélection de la semaine
- T4.2 — API : générer les courses depuis la sélection (agrégation et addition)
- T4.3 — Écran Semaine : sélection des recettes et bouton de génération avec retour chiffré

### Lot 5 — Déploiement
- T5.1 — Décisions d'hébergement : hébergeur, même origine ou CORS, exécution des migrations
- T5.2 — Mise en ligne de l'app et de la base
- T5.3 — Recette de V1 : une vraie semaine de courses de bout en bout (critères §10 de la spec)

## Conventions de travail

- **Une branche par lot**, créée au premier ticket du lot. Jamais de branche multi-lots.
- **Un commit par ticket**, en anglais, format `type(scope): description` (ex.
  `feat(shopping-list): add manual item`). Le message décrit le comportement livré.
- **Définition de fini d'un ticket** : ses tests d'acceptation passent **et**
  `npm run verify` passe en entier. Des tests verts sur le seul ticket ne suffisent pas.
- **TDD** : le test d'acceptation s'écrit d'abord et doit échouer avant l'implémentation.
  Un test qui passe du premier coup ne prouve rien — vérifier qu'il échoue pour la bonne raison.
- **Revue avant commit** : chaque ticket fini passe en revue (conformité + empirique) avant
  que le commit soit proposé. Aucun commit sans validation explicite.
- **Problème hors périmètre repéré en route** : ne pas le corriger dans le ticket en cours ;
  le remonter pour en faire une issue GitHub.
