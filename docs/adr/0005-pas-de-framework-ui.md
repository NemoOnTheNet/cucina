# ADR-0005 — CSS natif, pas de framework UI

**Statut** : accepté · **Date** : 2026-08-26

## Contexte

Ionic, Angular Material ou Tailwind auraient pu fournir des composants mobiles prêts à l'emploi.

## Décision

**CSS natif, variables CSS, mobile-first**, et nos propres composants dans `shared/`.

## Raisons

- Le produit tient sur **très peu de composants** : une ligne de liste cochable, un champ d'ajout, une carte de recette, une barre d'onglets, une feuille modale. Cinq briques ne justifient pas une dépendance qui pèse sur chaque build et chaque montée de version.
- Angular Material a une identité visuelle forte et coûteuse à contredire ; l'app doit avoir **son** apparence.
- Ionic apporterait de bons composants mobiles mais impose sa propre couche de routage et de cycle de vie, en doublon de Capacitor.
- Le CSS moderne (grid, `:has`, conteneurs, `env(safe-area-inset-*)`, `oklch`) couvre nos besoins sans intermédiaire.

## Conséquences

- **Accessibilité et ergonomie tactile sont à notre charge** : zones de 44 px, focus visible, contrastes, rôles ARIA sur les composants faits main. C'est inscrit dans les conventions et dans la définition de « terminé ».
- Il faudra une base de styles sérieuse dès M0 (variables de couleur, d'espacement, de typographie), sinon la dette visuelle s'accumule vite.
- Réévaluer **uniquement** si un besoin réellement complexe apparaît (glisser-déposer riche, listes virtualisées à grande échelle).
