# 02 — Domaine et vocabulaire

Ce document fixe **les mots** et **les règles métier**. Le code, l'UI et les tables de la base doivent employer exactement ces concepts. Toute discussion produit part d'ici.

> ⚠️ Les règles marquées **(hypothèse)** sont mes propositions par défaut, à valider ou corriger. Voir aussi [08-questions-ouvertes.md](08-questions-ouvertes.md).

---

## Glossaire

| Français (UI, doc) | Anglais (code, base) | Définition |
|---|---|---|
| Foyer | `household` | Unité de partage. Tout appartient à un foyer : produits, recettes, semaine, listes. |
| Membre | `member` | Utilisateur rattaché à un foyer. Rôle `owner` (gérant) ou `member`. |
| Invitation | `invite` | Code créé par le gérant pour faire entrer quelqu'un dans le foyer. |
| Produit | `product` | **Tout ce qui s'achète** : carotte, papier toilette, eau en bouteille. |
| Rayon | `category` | Regroupement d'un produit en magasin (Fruits & légumes, Frais, Entretien…). |
| Recette | `recipe` | Titre, photo, portions, durées, ustensiles, ingrédients, étapes. |
| Ingrédient | `recipe_ingredient` | Ligne d'une recette : un **produit** + une quantité + une unité + une précision libre. |
| Étape | `recipe_step` | Une instruction ordonnée de la recette. |
| Ustensile | `recipe_utensil` | Matériel nécessaire (« robot », « moule à cake »). |
| Semaine | `week_plan` | Les recettes choisies pour la semaine en cours. **Sans jour ni repas.** |
| Liste de courses | `shopping_list` | La liste active du foyer. |
| Ligne de liste | `shopping_item` | Un produit à acheter, avec quantité et état coché. |
| Origine | `shopping_item_source` | Contribution d'une recette planifiée à une ligne. L'apport humain, lui, vit dans `manual_quantity`. |

**Règle de langue** : l'interface et la documentation sont en français, le code et la base en anglais. Pas de franglais dans les identifiants (`shoppingList`, pas `listeDeCourses`).

---

## Les concepts en détail

### Foyer

- Tout objet de données appartient à exactement **un** foyer. Il n'existe aucune donnée « globale » partagée entre foyers.
- Le créateur du foyer en est le **gérant** (`owner`). Lui seul peut inviter, exclure un membre, ou supprimer le foyer.
- Les autres membres ont des droits **identiques sur le contenu** : tous peuvent créer/modifier/supprimer recettes, produits, lignes de liste. Pas de notion de « ma » recette au sein d'un foyer. *(hypothèse — la confiance existe déjà dans un foyer réel, mettre des permissions fines serait de la friction inutile)*
- **Un utilisateur appartient à un seul foyer.** *(hypothèse, conforme à ton intuition — c'est aussi ce qui simplifie le plus l'app : aucun sélecteur de foyer nulle part. Le jour où on ouvrira le multi-foyer, ce sera un changement structurant, pas un réglage.)*

### Produit

Le produit est la brique la plus importante et la plus discrète.

- Un produit c'est **juste un nom** + un rayon. Rien d'autre n'est obligatoire.
- Le **catalogue de produits appartient au foyer** et se construit tout seul à l'usage : la première fois qu'on tape « Coriandre », le produit est créé ; les fois suivantes il est proposé en autocomplétion.
- Un produit peut venir d'une recette *ou* d'un ajout manuel : c'est le même objet. C'est ce qui permet de fusionner « les carottes du curry » avec « les carottes que je voulais de toute façon ».
- Le rayon sert **uniquement** à ordonner la liste de courses selon le parcours en magasin. Il est modifiable et devinable par défaut.

### Recette

- Champs : titre (obligatoire), photo, description courte, portions de référence, temps de préparation, temps de cuisson, tags, ustensiles, ingrédients, étapes.
- Le **nombre de portions de référence** est central : c'est lui qui permet d'ajuster les quantités quand on planifie la recette pour un nombre différent de convives.
- Un ingrédient peut avoir une quantité **vide** (« sel », « huile d'olive ») : c'est légitime et fréquent. Une quantité vide n'est jamais additionnée, la ligne apparaît dans la liste sans nombre.
- Les ustensiles sont du **texte libre** en v1 : ils s'affichent en cuisine, ils n'entrent jamais dans la liste de courses.

### Semaine

- La semaine est **un simple panier de recettes**, sans date ni ordre. On y met 4 recettes, on en retire une, on en ajoute deux.
- Pour chaque recette ajoutée, on choisit **un nombre de portions** (par défaut celui de la recette). Les quantités envoyées vers la liste sont multipliées par `portions choisies / portions de référence`.
- Il y a **une seule semaine active** par foyer. La clôturer l'archive et en ouvre une vide.
- La semaine n'a **pas de dates de début/fin imposées** : elle dure ce qu'elle dure. On l'archive quand on veut recommencer. *(hypothèse — coller à un lundi-dimanche calendaire ajouterait une contrainte que la vie réelle ne respecte pas)*

### Liste de courses

- **Une seule liste active** par foyer, à tout moment. Les listes clôturées sont archivées (utile pour « qu'est-ce qu'on avait acheté la dernière fois ? »).
- Une ligne = un produit + une quantité + une unité + un état coché/non coché.
- Chaque ligne connaît ses **origines** : « 400 g viennent du curry, 2 pièces viennent d'un ajout manuel ». C'est invisible par défaut, dépliable au besoin.
- Les lignes sont **groupées par rayon**, dans l'ordre du parcours en magasin.
- Cocher une ligne ne la supprime pas : elle passe en bas, grisée, et reste décochable (on repose l'article dans le rayon, ça arrive).

---

## Les règles qui font tout le produit

Ce sont les 6 règles à ne jamais casser. Elles sont les premières à couvrir par des tests.

### R1 — Ajouter une recette à la semaine alimente la liste

Ajouter une recette à la semaine crée ou augmente une ligne de liste pour **chacun de ses ingrédients**, quantité ajustée au nombre de portions choisi.

### R2 — Fusion par (produit, unité)

Deux besoins du **même produit dans la même unité** fusionnent en une seule ligne, quantités additionnées : curry (400 g de carottes) + soupe (300 g de carottes) → **une** ligne « Carottes — 700 g ».

**Conversion : uniquement à l'intérieur d'une famille métrique.** `1 kg + 300 g = 1,3 kg`, `40 cl + 200 ml = 600 ml` : ces conversions sont exactes, les refuser produirait des lignes absurdes. La ligne est stockée dans l'unité canonique de la famille (`g`, `ml`, `pièce`…) et affichée dans l'unité la plus lisible.

**Aucune conversion entre familles.** « 2 carottes » et « 200 g de carottes » restent **deux lignes**. Une table de conversion pièce↔gramme est fausse par nature : une carotte, c'est entre 60 et 200 g. Mieux vaut deux lignes honnêtes qu'un chiffre inventé.

**Une ligne sans unité n'est pas « une autre unité », c'est l'absence d'unité.** « Carottes » noté à la main absorbe les 600 g demandés par une recette et adopte l'unité — sinon la liste afficherait deux fois « Carottes », ce qui est exactement le désordre que l'app doit supprimer. Symétriquement, ajouter « Carottes » à la main quand une ligne chiffrée existe déjà rejoint cette ligne.

**Sauf si la ligne sans unité porte un nombre.** « 3 » de carottes, sans unité : trois quoi ? Fusionner donnerait « 603 g ». On refuse de trancher, et on garde deux lignes.

### R3 — Retirer une recette retire ce qu'elle avait apporté, et rien d'autre

Retirer une recette de la semaine soustrait **uniquement les quantités qu'elle avait apportées**.

- Si la ligne avait aussi une origine manuelle → la ligne reste, diminuée.
- Si la ligne n'avait que cette origine et **n'est pas cochée** → elle disparaît.
- Si la ligne n'avait que cette origine mais est **déjà cochée** → elle **reste**, telle quelle. On l'a déjà mise dans le caddie ; la faire disparaître serait un mensonge sur le contenu du caddie.

### R4 — Le manuel est intouchable

Une quantité saisie ou corrigée à la main n'est **jamais** écrasée par une opération automatique.

Concrètement : l'utilisateur saisit un **total**. On en déduit sa contribution propre (`manualQuantity = total − somme des recettes`), et le total affiché reste `somme des recettes + contribution manuelle`. Conséquence : si la ligne est à 1 kg et qu'une recette demande 300 g, la ligne passe à 1,3 kg — la part humaine n'a pas bougé. Retirer cette recette la ramène à 1 kg.

### R5 — Modifier une recette ne remonte pas dans la liste

Modifier une recette **déjà planifiée** ne recalcule pas la liste de courses en silence. On affiche une invite explicite (« Le curry a changé. Mettre à jour la liste ? »). *(hypothèse — un recalcul silencieux qui modifie une liste qu'on est en train d'utiliser en magasin est le pire scénario possible.)*

### R6 — Clôturer les courses

« Terminer les courses » archive la liste active et en ouvre une vide. La **semaine n'est pas touchée** : les recettes restent disponibles pour cuisiner toute la semaine, on les archive séparément quand on planifie la suivante.
