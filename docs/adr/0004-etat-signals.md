# ADR-0004 — État par signals, pas de NgRx

**Statut** : accepté · **Date** : 2026-08-26

## Contexte

L'app a un état partagé non trivial : le foyer courant, le catalogue de produits, la liste active, la semaine — et ces états se répondent (ajouter une recette modifie la liste).

## Décision

**Signals Angular + un service `store` par fonctionnalité.** Pas de NgRx, pas de NgRx SignalStore, pas de RxJS pour l'état applicatif (RxJS reste légitime pour les flux : temps réel, saisie avec anti-rebond).

## Raisons

- Angular 21 est **zoneless** : les signals sont le mécanisme natif de réactivité, pas une couche ajoutée.
- La taille du projet ne justifie pas le cérémonial actions/reducers/effets. Le coût de NgRx se paie à chaque fonctionnalité, son bénéfice n'arrive qu'à une complexité qu'on n'atteindra pas.
- Les règles métier délicates vivent dans `domain/`, **pures et testées**. Le store n'orchestre que des appels ; il n'y a donc pas de logique complexe à discipliner par un framework d'état.

## Conséquences

- Discipline à tenir à la main : un store expose des signaux en **lecture seule** (`asReadonly()`), les mutations passent par ses méthodes. Un composant qui écrit directement dans un signal partagé est un défaut à refuser en relecture.
- Pas d'outil de debug type Redux DevTools. Acceptable à cette échelle.
- La cohérence entre stores (semaine ↔ liste) est **explicite** : le store `week` appelle le store `shopping`. Ce couplage est assumé et documenté, plutôt que caché derrière un bus d'événements.
