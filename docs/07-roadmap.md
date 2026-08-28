# 07 — Feuille de route

> **État au 28 août 2026** : M0 à M4 **livrés**, M5 livré pour la partie PWA. L'application est en production sur Supabase et Vercel. Détail à la fin du document.

Des jalons, pas des dates. Chaque jalon se termine par un usage réel, jamais par « le code est écrit ».

---

### M0 — Fondations *(aucun écran utile, mais tout repose dessus)*

- Repo remis à plat : scaffold Angular nettoyé, structure de dossiers en place.
- `domain/` écrit **en premier**, avec ses tests : quantités, unités, mise à l'échelle par portions, fusion et retrait de lignes (R1→R6).
- Projet Supabase créé, migrations initiales, RLS active, types générés.
- Squelette applicatif : navigation par onglets, thème, états vides.

**Fini quand** : `npm test` couvre les 6 règles métier, et l'app se lance avec ses 3 onglets vides.

> Écrire le domaine avant l'UI n'est pas du zèle : la fusion des lignes est *le* seul endroit vraiment délicat du produit. Le faire au calme, testé, hors de tout composant, évite de le redécouvrir trois fois dans des `if` planqués dans un template.

---

### M1 — Le foyer

Comptes, création de foyer, invitation, arrivée d'un membre.

**Fini quand** : toi et un proche êtes dans le même foyer depuis deux téléphones.

---

### M2 — La liste de courses seule

Tout le lot L1 : ajout rapide, autocomplétion, rayons, cocher/décocher, quantités, suppression, clôture.

**Fini quand** : tu as fait de vraies courses avec, sans recettes, et sans repasser au papier. **C'est le premier moment où l'app a une valeur réelle** — et c'est volontairement avant les recettes.

---

### M3 — Les recettes

Création, photo, ingrédients, étapes, ustensiles, recherche.

**Fini quand** : 10 recettes du foyer sont saisies et consultables en cuisine.

---

### M4 — La semaine  *(le moment où le produit prend son sens)*

Sélection des recettes de la semaine, portions, propagation vers la liste, retrait propre, archivage.

**Fini quand** : une semaine complète de repas a été planifiée et les courses faites uniquement depuis la liste générée.

---

### M5 — Vraie app mobile

PWA installable, cache hors ligne, build Android via Capacitor, icône, écran de démarrage, appareil photo natif.

**Fini quand** : l'app est sur l'écran d'accueil des téléphones du foyer et s'ouvre sans réseau.

---

---

## Où en est-on vraiment

| Jalon | État | Reste à faire |
|---|---|---|
| M0 — Fondations | ✅ | — |
| M1 — Le foyer | ✅ | Vérifier l'isolation entre deux vrais comptes, jamais testée |
| M2 — Liste de courses | ✅ | Faire de vraies courses avec |
| M3 — Recettes | ✅ | Saisir les 10 recettes du foyer |
| M4 — La semaine | ✅ | Planifier une vraie semaine |
| M5 — Vraie app mobile | 🟡 | PWA installable ✅ · cache hors ligne ✅ · photo fiabilisée ✅ · **application native reportée** (décision du 28 août 2026) |

Ce qui **bloque une ouverture au-delà du foyer** :

- **Réinitialisation du mot de passe** : absente des deux backends. Aujourd'hui, un mot de passe oublié se règle depuis le tableau de bord Supabase — impensable pour quelqu'un d'autre que l'administrateur.
- **Suppression de compte** : absente. Or `households.owner_id` est en `on delete cascade` : supprimer un utilisateur depuis le tableau de bord détruit son foyer entier. Il faut un vrai parcours, et une réponse à « que devient le foyer quand son gérant part ? ».

Ce qui n'est **pas** fait, et qui est assumé :

- **Écritures hors ligne** (L4.2) : l'app s'ouvre et se lit sans réseau, mais cocher un article demande la connexion dès que Supabase est branché. Chantier à part entière.
- **Consultation des listes archivées** (L1.11) : les listes sont bien archivées, l'écran qui les affiche n'existe pas.
- **Décocher des ingrédients avant l'envoi** (L3.6) : « j'ai déjà du riz » se corrige après coup, dans la liste.
- **Plugin appareil photo Capacitor** (L5.3) : écarté tant qu'il n'y a pas d'application native — sur le web il retombe sur le même champ fichier. Le chemin photo de la PWA, lui, a été fiabilisé (orientation, aperçu fidèle, formats illisibles signalés).
- **iOS natif** (L5.4) : PWA uniquement.

---

### M6 — Les listes libres du foyer  *(prochaine évolution retenue)*

Une zone où le foyer garde ses autres listes : cadeaux, choses à faire, idées de sorties. Détail en [L6](03-fonctionnalites.md#l6--listes-libres-du-foyer-après-la-v1).

À garder en tête : un concept **séparé** de la liste de courses. Les règles R1→R6 ne s'appliquent pas à une liste de cadeaux, et généraliser `shopping_lists` alourdirait le cœur de l'app pour rien.

**Fini quand** : le foyer tient une vraie liste — de cadeaux, de travaux — dans l'app plutôt que dans une note de téléphone.

---

### M7 — Partage de recettes  *(prochaine évolution retenue, à cadrer)*

« Passe-moi ta recette de curry » sans capture d'écran. Détail et cadrage en [L7](03-fonctionnalites.md#l7--partage-de-recettes-après-la-v1-et-à-cadrer).

⚠️ Ce jalon rouvre un non-objectif de [`01-vision.md`](01-vision.md) (« pas de recettes publiques »). Il demande donc **une décision produit avant tout code** : export/import entre personnes, ou envoi d'un foyer à un autre. Le catalogue public reste refusé.

Contrainte : le partage **copie** la recette, il ne donne jamais à un foyer un droit de lecture sur les données d'un autre. L'isolation par RLS ne se troue pas pour du confort.

**Fini quand** : une recette est passée d'un foyer à un autre, et le destinataire peut la modifier sans que l'original bouge.

---

### Ensuite (non engagé)

Écritures hors ligne (outbox), semaines passées, suggestions de produits récurrents, ordre des rayons par magasin, iOS/TestFlight, application native Android, ouverture au-delà du foyer de test.
