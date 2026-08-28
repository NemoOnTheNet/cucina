# Lot 0 — Fondations (sprint 1)

**Branche** : `chore/fondations` — **Référence** : [spec V1](../specs/2026-07-24-cucina-v1-design.md)

**Objectif du lot** : rendre vivante toute la chaîne technique — PostgreSQL, API Express,
interface React, tests, commande de vérification — sans implémenter la moindre
fonctionnalité métier. À la fin, une page affiche une donnée venue de la base en passant
par l'API, et une seule commande vérifie l'ensemble du projet.

**Pourquoi commencer par là** : chaque lot suivant ajoutera du comportement sur ces rails.
Des rails posés de travers coûtent dix fois plus cher à redresser une fois cinq features
posées dessus.

---

## T0.1 — Base PostgreSQL locale, jetable et reproductible

**Dépend de** : rien.

### Comportement attendu
Une commande unique démarre un PostgreSQL local contenant **deux bases** : une de
développement et une de test, isolées l'une de l'autre. Les données de développement
survivent à un redémarrage du conteneur ; celles de test peuvent disparaître sans
conséquence. La configuration de connexion (hôte, port, base, utilisateur, mot de passe)
est lue depuis des variables d'environnement, jamais écrite en dur.

Un fichier d'exemple de configuration est versionné ; le fichier réel contenant les valeurs
locales ne l'est jamais.

### Cas limites à traiter
- Le port PostgreSQL par défaut (5432) est peut-être déjà pris sur la machine — le port doit
  être configurable sans modifier le code.
- La commande relancée alors que la base tourne déjà ne doit pas échouer bruyamment.
- La base de test doit pouvoir être remise à zéro sans toucher à celle de développement.

### Tests d'acceptation (vérification manuelle, pas de test automatisé ici)
1. Docker arrêté puis démarré : la commande documentée lève les deux bases.
2. Un client SQL se connecte aux deux bases avec les identifiants du fichier d'exemple.
3. Le conteneur est détruit puis relancé : les données de développement sont toujours là.
4. `git status` ne propose jamais le fichier de configuration local.

### Fini quand
Les quatre vérifications passent et la procédure de démarrage est écrite dans le README
(une personne qui clone le dépôt doit pouvoir lever sa base sans poser de question).

### Notions mobilisées
Ce qu'est un conteneur et en quoi il diffère d'une installation sur la machine ; ce qu'est
un volume (et pourquoi, sans volume, les données meurent avec le conteneur) ; pourquoi les
secrets de connexion ne vivent jamais dans le code versionné.

---

## T0.2 — L'API démarre, répond, et est testée

**Dépend de** : T0.1.

### Comportement attendu
Un serveur Express en TypeScript démarre sur un port configurable et expose
`GET /api/health`. Cette route interroge réellement la base (une requête triviale suffit) et
répond `200` avec un corps JSON indiquant que l'API et la base répondent. Si la base est
injoignable, elle répond `500` avec le format d'erreur uniforme de la spec (§7).

Le harnais de tests d'intégration fait partie de ce ticket : les tests envoient de vraies
requêtes HTTP à l'application, connectée à la **base de test**, jamais à celle de
développement.

### Cas limites à traiter
- Base injoignable au démarrage : l'API doit démarrer quand même et signaler l'erreur sur
  `/api/health` (une API qui refuse de démarrer est impossible à diagnostiquer à distance).
- Route inconnue : réponse `404` au format d'erreur uniforme, pas une page HTML d'Express.
- Erreur inattendue dans une route : interceptée par le middleware d'erreur central,
  renvoyée en `500` au format uniforme — jamais une pile d'appels exposée au client.

### Tests d'acceptation (à écrire AVANT le code, dans cet ordre)
1. `GET /api/health` répond `200` et un corps indiquant la base joignable.
2. `GET /api/inexistant` répond `404` au format d'erreur uniforme
   (`{ "error": { "code": ..., "message": ... } }`).
3. Une route qui lève volontairement une erreur répond `500` au format uniforme, sans
   détail technique interne dans le corps.
4. Les tests s'exécutent contre la base de test : après un test, la base de développement
   est inchangée.

### Fini quand
Les quatre tests passent, et le premier a bien été vu échouer avant l'écriture de la route.

### Notions mobilisées
Ce qu'est un middleware Express et l'ordre dans lequel ils s'exécutent ; pourquoi le
middleware d'erreur se déclare en dernier ; la différence entre un test qui appelle une
fonction et un test qui envoie une vraie requête HTTP.

---

## T0.3 — Schéma de base par migrations rejouables

**Dépend de** : T0.2.

### Comportement attendu
Un mécanisme de migrations : des fichiers SQL numérotés, appliqués dans l'ordre, dont
l'application est tracée en base pour ne jamais rejouer deux fois la même. Une commande les
applique sur une base vierge et reconstitue le schéma complet, sans aucune étape manuelle.

La première migration crée les **cinq tables** de la spec (§6) avec toutes leurs
contraintes : unicité du nom d'ingrédient insensible à la casse, unité dans la liste
fermée, quantités strictement positives, unicité du couple (recette, ingrédient), et les
comportements de suppression décrits dans la spec — suppression en cascade pour les lignes
de recette et la sélection de semaine, mise à NULL du lien pour les articles de courses,
blocage de la suppression d'un ingrédient référencé par une recette.

### Cas limites à traiter
- Migrations appliquées deux fois de suite : la seconde exécution ne fait rien et ne casse pas.
- Base de test : les migrations s'y appliquent aussi, automatiquement avant la suite de tests.
- Une migration qui échoue à mi-parcours ne doit pas laisser un schéma à moitié créé.

### Tests d'acceptation (à écrire AVANT le code)
1. Sur une base vierge, la commande de migration crée les cinq tables.
2. La commande relancée immédiatement ne produit aucun changement et se termine sans erreur.
3. Insérer deux ingrédients « Oignon » et « oignon » est refusé par la base.
4. Insérer une ligne de recette avec une quantité nulle ou négative est refusé par la base.
5. Supprimer un ingrédient référencé par une recette est refusé par la base ; supprimer une
   recette efface ses lignes d'ingrédients et son éventuelle entrée dans la semaine.
6. Supprimer un ingrédient lié à un article de courses laisse l'article en place, lien vidé.

### Fini quand
Les six tests passent. Point d'attention : ces règles sont vérifiées **par la base**, pas
par du code applicatif — un test qui passerait grâce à une vérification en TypeScript ne
répond pas au ticket.

### Notions mobilisées
Clé primaire et clé étrangère ; ce que signifient `ON DELETE CASCADE`, `ON DELETE SET NULL`
et `ON DELETE RESTRICT` ; contrainte `CHECK` et contrainte d'unicité ; pourquoi une règle
d'intégrité posée dans la base vaut mieux que la même règle écrite dans le code.

---

## T0.4 — L'interface React parle à l'API

**Dépend de** : T0.2.

### Comportement attendu
Une application React (Vite, TypeScript) démarre en développement, appelle `GET /api/health`
au chargement et affiche trois états distincts et visibles : **chargement en cours**,
**erreur** (avec le message venu de l'API), **succès** (l'information reçue). Aucune
bibliothèque de récupération de données : `fetch` natif.

L'appel passe par un point d'entrée unique côté client (une fonction chargée de parler à
l'API), pas dispersé dans les composants — c'est le socle que tous les lots suivants
réutiliseront.

La page est lisible sur téléphone : rien qui déborde horizontalement.

### Cas limites à traiter
- API éteinte : l'interface affiche une erreur compréhensible, elle ne reste pas figée sur
  « chargement » et ne s'écroule pas sur un écran blanc.
- API qui répond une erreur au format uniforme : le message affiché est celui de l'API.
- Réponse lente : l'état de chargement reste visible pendant toute l'attente.

### Tests d'acceptation
1. Test de composant : pendant l'attente de la réponse, l'état de chargement est affiché.
2. Test de composant : réponse en succès, la donnée reçue est affichée.
3. Test de composant : réponse en erreur, le message d'erreur de l'API est affiché.
4. Vérification manuelle : API éteinte, l'écran affiche une erreur lisible ;
   API rallumée et page rechargée, l'écran affiche le succès.

### Fini quand
Les trois tests passent et la vérification manuelle est faite, y compris en réduisant la
fenêtre à une largeur de téléphone.

### Notions mobilisées
Pourquoi un appel réseau est asynchrone et ce que cela impose à l'affichage ; les trois
états obligatoires de toute donnée distante ; ce qu'est le CORS et pourquoi il ne se pose
pas ici si le serveur de développement redirige les appels vers l'API.

---

## T0.5 — Une seule commande vérifie tout le projet

**Dépend de** : T0.3 et T0.4.

### Comportement attendu
À la racine du dépôt, `npm run verify` enchaîne, pour le serveur **et** le client : analyse
statique (lint), vérification des types, compilation, puis la totalité des tests. La
commande s'arrête au premier échec et sort en code d'erreur non nul ; elle ne dit « tout va
bien » que si absolument tout est passé.

Elle prépare elle-même la base de test (migrations appliquées) pour être lançable sur une
machine fraîchement clonée, Docker démarré, sans étape manuelle non documentée.

Le fichier `AGENTS.md` à la racine documente cette commande comme **définition de fini** de
tout ticket, ainsi que les conventions du projet.

### Cas limites à traiter
- Un test qui échoue dans le client doit faire échouer la commande entière (pas seulement
  afficher une erreur en passant).
- Une erreur de typage sans erreur de test doit faire échouer la commande.
- La commande lancée alors que Docker est éteint doit échouer avec un message explicite,
  pas une pile d'appels incompréhensible.

### Tests d'acceptation (vérification manuelle)
1. Sur un dépôt propre, `npm run verify` passe entièrement et sort en code 0.
2. En cassant volontairement un test du serveur, la commande échoue en code non nul.
3. Idem en cassant un test du client.
4. Idem en introduisant une erreur de typage.
5. Docker éteint : le message d'erreur explique qu'il faut démarrer la base.

### Fini quand
Les cinq vérifications passent et `AGENTS.md` est écrit.

### Notions mobilisées
Ce qu'est un code de sortie et pourquoi les outils d'intégration continue ne regardent que
lui ; la différence entre lint, vérification de types et tests — trois filets qui attrapent
des erreurs différentes.

---

## Fin de lot 0

Avant de passer au lot 1 : double revue (conformité au ticket et à la spec, puis revue
empirique — l'application est lancée et la page réellement ouverte), puis proposition de
commits ticket par ticket, chacun validé explicitement.
