# ADR-0003 — Planifier à la semaine, sans jour ni repas

**Statut** : accepté · **Date** : 2026-08-26

## Contexte

Toutes les applications de meal planning proposent une grille : 7 jours × 2 ou 3 repas. C'est l'attendu du marché.

## Décision

Cucina planifie **un simple panier de recettes pour la semaine**. Pas de jour, pas de midi/soir, pas de grille.

## Raisons

- C'est **la pratique réelle** du foyer : « cette semaine on fait ces quatre plats », puis on décide au dernier moment lequel on cuisine ce soir.
- La grille crée une **dette de saisie** : il faut remplir 14 cases, dont la moitié seront fausses dès mercredi. Un plan qu'on ne respecte pas devient un plan qu'on n'ouvre plus.
- Le but de la planification ici n'est **pas** de savoir quoi manger tel soir : c'est de **produire la bonne liste de courses**. Or la liste se moque totalement du jour où la recette sera cuisinée.

## Conséquences

- Le modèle de données ne porte **aucune date de repas** (`week_plan_recipes` n'a pas de champ jour ni type de repas). Ajouter la grille plus tard serait donc une migration, pas un simple champ ignoré.
- L'app paraîtra « moins riche » qu'un concurrent affichant un calendrier. C'est délibéré et c'est un avantage : moins d'écrans, moins de saisie, moins d'abandon.
- Si le besoin d'un jour précis émerge à l'usage, la porte reste ouverte — mais il faudra une preuve d'usage, pas une intuition.
