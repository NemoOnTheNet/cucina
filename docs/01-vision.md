# 01 — Vision

## Le problème

Dans un foyer, l'organisation des repas se fait à l'oral : « cette semaine on fait le curry, les lasagnes et la soupe ». Puis quelqu'un reconstitue la liste de courses **de mémoire**. Résultat : on oublie la crème pour le curry, on rachète des lardons qu'on a déjà, et le papier toilette — qui n'appartient à aucune recette — se retrouve noté sur un bout de papier à part.

Le problème n'est donc pas « je ne sais pas quoi cuisiner ». C'est : **la distance entre les recettes choisies et la liste de courses réelle**.

## La promesse

> Tu choisis les recettes de la semaine, la liste de courses se remplit toute seule — et tu y ajoutes librement tout le reste du panier.

## Pour qui

Un **foyer** de 2 à 6 personnes. Un membre crée le foyer (le *gérant*) et invite les autres. Tout le monde voit les mêmes recettes, la même semaine, la même liste de courses, en temps réel.

Usage réel visé, dans l'ordre d'importance :

1. **En magasin**, téléphone dans une main, caddie dans l'autre : cocher des articles.
2. **Sur le canapé**, le dimanche soir : choisir les recettes de la semaine.
3. **En cuisine** : suivre les étapes d'une recette.
4. **N'importe quand** : « tiens, on n'a plus de sopalin » → l'ajouter en 2 secondes.

## Principes produit

Ces principes servent d'arbitre quand une décision est ambiguë.

1. **La liste de courses est le cœur de l'app, pas les recettes.** C'est l'écran le plus ouvert, il s'ouvre en premier, il doit être le plus soigné.
2. **Pas de sur-planification.** On planifie *à la semaine*, jamais « lasagnes mardi soir ». La vie réelle ne suit pas un calendrier de repas.
3. **L'appli propose, l'humain décide.** Toute quantité, toute ligne générée automatiquement reste modifiable et supprimable à la main.
4. **Zéro friction à l'ajout.** Ajouter « papier toilette » ne doit demander ni catégorie, ni quantité, ni unité. Juste un nom et c'est dans la liste.
5. **Ça doit marcher avec du réseau pourri.** Un supermarché est une cave à signal.
6. **Une main, un pouce.** Toutes les actions fréquentes sont atteignables en bas de l'écran.

## Ce que Cucina n'est PAS (non-objectifs assumés)

Refuser ces sujets est une décision, pas un oubli. Ils pourront être rouverts plus tard, jamais en v1.

- Pas de **calories / nutrition / régimes**.
- Pas de **budget ni de prix** des articles.
- Pas de **scan de code-barres**.
- Pas d'**import automatique** de recettes depuis un site ou une photo.
- Pas de **réseau social** : pas de recettes publiques, pas de likes, pas de suivi d'autres foyers.
- Pas de **gestion de stock / garde-manger** (« il me reste 300 g de riz »).
- Pas de **planification par jour et par repas**.
- Pas de **suggestions par IA** de menus.

## À quoi ressemble le succès

La v1 est réussie si, pendant un mois, le foyer de test :

- fait ses courses **uniquement** avec l'app, sans repasser au papier ni aux notes du téléphone ;
- n'a plus d'oubli d'ingrédient lié à une recette planifiée ;
- ajoute des produits non-alimentaires dans l'app sans y penser.

Si l'app est ouverte pour planifier mais que la liste finale se refait ailleurs, c'est un échec — quel que soit le nombre de recettes saisies.
