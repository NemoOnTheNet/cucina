# 03 — Fonctionnalités et périmètre

Les fonctionnalités sont regroupées en **lots**. Un lot livré = utilisable réellement, pas « le code existe ». L'ordre des lots est l'ordre de construction et il est délibéré : on construit d'abord ce qui sert tous les jours (la liste), ensuite ce qui l'alimente (recettes, semaine).

Légende : **[V1]** = indispensable au premier usage réel · **[V1.1]** = juste après · **[Plus tard]** = identifié, non planifié.

---

## L0 — Socle et foyer

| # | Histoire | Priorité |
|---|---|---|
| L0.1 | En tant que nouvel utilisateur, je crée un compte (e-mail + mot de passe) pour accéder à l'app. | V1 |
| L0.2 | À ma première connexion, je crée un foyer et j'en deviens le gérant. | V1 |
| L0.3 | En tant que gérant, je génère un lien/code d'invitation pour faire entrer un proche dans mon foyer. | V1 |
| L0.4 | En tant qu'invité, j'ouvre le lien, je crée mon compte et je rejoins directement le foyer. | V1 |
| L0.5 | En tant que gérant, je vois la liste des membres et je peux en retirer un. | V1.1 |
| L0.6 | Je reste connecté entre deux ouvertures de l'app. | V1 |
| L0.7 | Connexion par lien magique (sans mot de passe). | Plus tard |

**Critères d'acceptation L0.3/L0.4** : le code d'invitation expire après 7 jours ; un code déjà utilisé est refusé avec un message clair ; un utilisateur déjà membre d'un foyer qui ouvre une invitation est prévenu qu'il ne peut appartenir qu'à un seul foyer.

---

## L1 — Liste de courses  *(le cœur)*

| # | Histoire | Priorité |
|---|---|---|
| L1.1 | J'ajoute un produit à la liste en tapant son nom, avec autocomplétion sur le catalogue du foyer. | V1 |
| L1.2 | Je saisis facultativement une quantité et une unité ; sans rien saisir, la ligne est valide. | V1 |
| L1.3 | Je coche une ligne : elle se grise et descend en bas de son rayon. | V1 |
| L1.4 | Je décoche une ligne cochée par erreur. | V1 |
| L1.5 | Je vois la liste groupée par rayon, dans l'ordre du parcours en magasin. | V1 |
| L1.6 | Je modifie la quantité ou le nom d'une ligne. | V1 |
| L1.7 | Je supprime une ligne (balayage latéral) avec possibilité d'annuler. | V1 |
| L1.8 | Je vois d'où vient une ligne (quelles recettes, ou « ajout manuel »). | V1 |
| L1.9 | Je clôture les courses : la liste est archivée, une liste vide s'ouvre. | V1 |
| L1.10 | Un autre membre du foyer coche un article : je le vois se cocher sans recharger. | V1.1 |
| L1.11 | Je consulte une liste archivée. | V1.1 |
| L1.12 | Je change le rayon d'un produit depuis la liste. | V1.1 |
| L1.13 | Je réordonne les rayons selon MON magasin. | Plus tard |
| L1.14 | L'app me suggère les produits que j'achète souvent et qui ne sont pas dans la liste. | Plus tard |

**Critères d'acceptation L1.1** : depuis l'ouverture de l'app, ajouter « papier toilette » demande au maximum **3 interactions** (champ, saisie, validation) et le champ reste actif pour enchaîner un autre ajout.

---

## L2 — Recettes

| # | Histoire | Priorité |
|---|---|---|
| L2.1 | Je crée une recette : titre, portions, ingrédients, étapes. | V1 |
| L2.2 | J'ajoute une photo depuis l'appareil photo ou la galerie. | V1 |
| L2.3 | Je saisis les ingrédients ligne à ligne (produit + quantité + unité + précision libre). | V1 |
| L2.4 | Je saisis les étapes, et je les réordonne. | V1 |
| L2.5 | Je liste les ustensiles nécessaires. | V1 |
| L2.6 | Je consulte une recette en « mode cuisine » : étapes en grand, écran maintenu allumé. | V1.1 |
| L2.7 | Je retrouve une recette par son nom. | V1 |
| L2.8 | Je modifie et je supprime une recette. | V1 |
| L2.9 | Je tague mes recettes (végé, rapide, four…) et je filtre dessus. | V1.1 |
| L2.10 | Je duplique une recette pour en faire une variante. | Plus tard |
| L2.11 | Je note la source d'une recette (URL, livre, personne). | V1.1 |

**Critère d'acceptation L2.3** : saisir un ingrédient inconnu du catalogue le crée à la volée, sans quitter l'écran de la recette et sans demander de rayon.

---

## L3 — Semaine

| # | Histoire | Priorité |
|---|---|---|
| L3.1 | Je vois la semaine en cours : les recettes choisies. | V1 |
| L3.2 | J'ajoute une recette à la semaine depuis la fiche recette ou depuis la semaine. | V1 |
| L3.3 | Je choisis le nombre de portions à l'ajout ; les quantités sont ajustées (R1). | V1 |
| L3.4 | À l'ajout, les ingrédients partent dans la liste de courses, fusionnés (R2). | V1 |
| L3.5 | Je retire une recette de la semaine ; la liste est nettoyée selon la règle R3. | V1 |
| L3.6 | Avant d'envoyer dans la liste, je décoche les ingrédients que j'ai déjà (« j'ai déjà du riz »). | V1.1 |
| L3.7 | J'archive la semaine et j'en démarre une nouvelle. | V1 |
| L3.8 | Je change le nombre de portions d'une recette déjà planifiée, la liste s'ajuste. | V1.1 |
| L3.9 | Je consulte les semaines passées pour retrouver ce qu'on a mangé. | Plus tard |

**Critère d'acceptation L3.4** : ajouter une recette affiche un retour explicite indiquant combien de lignes ont été créées et combien ont été fusionnées.

---

## L4 — Robustesse d'usage

| # | Histoire | Priorité |
|---|---|---|
| L4.1 | L'app s'ouvre et affiche la liste **sans réseau** (données en cache). | V1.1 |
| L4.2 | Je peux cocher des articles hors ligne ; la synchronisation se fait au retour du réseau. | V1.1 |
| L4.3 | L'app s'installe sur l'écran d'accueil (PWA). | V1 |
| L4.4 | Les conflits (deux membres modifient la même ligne) se résolvent sans perte silencieuse. | V1.1 |

---

## L5 — Empaquetage mobile

| # | Histoire | Priorité |
|---|---|---|
| L5.1 | Build Android (APK) installable par la famille via Capacitor. | V1.1 |
| L5.2 | Icône, écran de démarrage, nom, thème de la barre système. | V1.1 |
| L5.3 | Accès natif à l'appareil photo pour les photos de recettes. | V1.1 |
| L5.4 | Build iOS + distribution TestFlight. | Plus tard *(nécessite le compte Apple à 99 $/an)* |

---

## L6 — Listes libres du foyer  *(après la v1)*

Un foyer ne partage pas que des courses : une liste de cadeaux, des choses à faire, des idées de sorties. Aujourd'hui tout cela finit dans une note de téléphone que personne d'autre ne voit — exactement le problème que l'app résout déjà pour les courses.

| # | Histoire | Priorité |
|---|---|---|
| L6.1 | Je crée une liste libre dans le foyer, avec un nom et une icône. | Plus tard |
| L6.2 | J'y ajoute des lignes en texte libre, je les coche, je les supprime. | Plus tard |
| L6.3 | Les autres membres voient la liste et ses changements en temps réel. | Plus tard |
| L6.4 | J'archive une liste terminée sans la perdre. | Plus tard |
| L6.5 | Je réordonne mes listes, ou j'en épingle une. | Plus tard |

**Décision d'architecture à prendre avant d'écrire la moindre ligne.** La tentation sera de généraliser `shopping_lists`. C'est probablement une erreur : les règles R1→R6 — fusion par produit, unités, quantités venues des recettes, origines — n'ont **aucun sens** pour une liste de cadeaux. Les faire cohabiter chargerait le cœur de l'app de conditions inutiles, au mépris du principe 1 (« la liste de courses est le cœur »).

Piste à privilégier : un concept **séparé et volontairement pauvre** — une liste, des lignes de texte, un état coché. Pas de produit, pas d'unité, pas de catalogue. Ce qu'elles partageront avec la liste de courses, c'est le foyer, la RLS et le temps réel, pas le domaine.

---

## L7 — Partage de recettes  *(après la v1, et à cadrer)*

⚠️ **Ce lot rouvre un non-objectif de [`01-vision.md`](01-vision.md)** : « pas de réseau social, pas de recettes publiques ». Il n'est recevable que si l'on choisit explicitement *lequel* des trois partages ci-dessous on veut. Les mélanger, c'est glisser vers le réseau social sans l'avoir décidé.

| # | Histoire | Priorité | Rouvre le non-objectif ? |
|---|---|---|---|
| L7.1 | J'exporte une recette (fichier ou lien) pour l'envoyer par le moyen de mon choix. | Plus tard | Non |
| L7.2 | J'importe une recette reçue : elle est **copiée** dans mon foyer, et m'appartient. | Plus tard | Non |
| L7.3 | J'envoie une recette à un autre foyer que je connais, depuis l'app. | Plus tard | Partiellement |
| L7.4 | Je publie une recette visible par tous, avec des « j'aime » et des abonnements. | **Refusé** | Oui, entièrement |

**Recommandation** : L7.1 + L7.2. Elles couvrent le besoin réel — « passe-moi ta recette de curry » — sans rien construire qui ressemble à une plateforme, sans modération à assurer, et sans changer la nature du produit.

**Contrainte technique non négociable.** Les recettes sont cloisonnées par foyer, et [ADR-0002](adr/0002-supabase.md) fait reposer cette isolation sur RLS. Un partage ne doit **jamais** donner à un foyer un droit de lecture sur les lignes d'un autre : ce serait percer la garantie d'isolation pour une fonctionnalité de confort. Le partage **copie**, il ne partage pas la ligne. Une recette reçue est une nouvelle recette, dans le foyer qui la reçoit, modifiable sans effet sur l'original.

---

## Périmètre V1 en une phrase

> Un foyer, ses membres, ses recettes, une semaine de recettes, une liste de courses qui se remplit toute seule et qu'on coche en magasin — installable sur l'écran d'accueil.
