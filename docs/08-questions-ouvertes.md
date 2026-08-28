# 08 — Questions ouvertes

Ce qui n'est pas tranché, avec ma recommandation. **Rien ici ne bloque le démarrage** : chaque point a une valeur par défaut appliquée dans la doc, à corriger d'un mot.

Q1 à Q12 concernent la v1. Q13 et Q14 cadrent les deux évolutions retenues ensuite (M6 et M7).

| # | Question | Défaut appliqué | Ma recommandation |
|---|---|---|---|
| Q1 | Un utilisateur peut-il appartenir à **plusieurs foyers** ? | Non, un seul. | **Rester à un seul.** Ça supprime un sélecteur de foyer sur tous les écrans. À rouvrir seulement si un cas réel apparaît (garde alternée, colocation + famille). |
| Q2 | Faut-il **convertir les unités** (2 carottes ↔ 200 g) ? | Non, on affiche « 2 pièces + 200 g ». | **Ne jamais convertir.** Une carotte pèse entre 60 et 200 g : un chiffre précis serait faux. |
| Q3 | La semaine suit-elle un **calendrier lundi→dimanche** ? | Non, elle dure ce qu'elle dure. | Garder libre. Une date de début purement indicative pourra s'ajouter plus tard. |
| Q4 | Que faire quand on **modifie une recette déjà planifiée** ? | On propose de mettre la liste à jour, on ne le fait pas en silence. | Garder l'invite explicite. |
| Q5 | Clôturer les courses **archive-t-il aussi la semaine** ? | Non, les deux sont indépendants. | Garder séparé : on fait souvent les courses avant de cuisiner. |
| Q6 | Faut-il pouvoir **décocher des ingrédients avant l'envoi** (« j'ai déjà du riz ») ? | Prévu en V1.1 (L3.6). | Le mettre en V1 si le test montre qu'on corrige la liste à chaque recette. |
| Q7 | **Quantités par défaut** des produits ajoutés à la main ? | Aucune, la ligne est valide sans quantité. | Garder. C'est ce qui rend l'ajout instantané. |
| Q8 | **Rayons** : liste fixe ou libre ? | Liste fixe fournie, rayon modifiable par produit. | Garder fixe en v1 ; l'ordre personnalisé par magasin viendra plus tard. |
| Q9 | Les **écritures hors ligne** en v1 ? | Non : lecture hors ligne seulement. | Assumer la limitation. Une outbox mal faite perd des données ; c'est un chantier à part entière. |
| Q10 | **Nom du foyer** obligatoire à la création ? | Oui, avec une proposition par défaut. | Garder, mais pré-remplir pour ne pas bloquer l'inscription. |
| Q11 | **iOS** dans le périmètre ? | Non en v1 (compte développeur à 99 $/an). | Android + PWA d'abord ; l'iPhone du foyer utilise la PWA, qui est très correcte depuis iOS 16.4. |
| Q12 | Faut-il un **écran de réglages** en v1 ? | Minimal : foyer, membres, déconnexion. | Garder minimal. |
| Q13 | Les **listes libres** (cadeaux, à faire) réutilisent-elles la liste de courses ? | Non : un concept séparé, sans produit ni unité. | **Garder séparé.** Les règles R1→R6 n'ont aucun sens hors des courses ; les y faire cohabiter abîmerait le cœur de l'app pour une fonctionnalité annexe. |
| Q14 | Quelle forme prend le **partage de recettes** ? | Export / import : la recette est copiée chez qui la reçoit. | **Export/import d'abord.** Ça répond au vrai besoin sans construire de plateforme. Le catalogue public reste refusé ([`01-vision.md`](01-vision.md)) ; l'envoi direct entre foyers pourra suivre s'il manque. |
