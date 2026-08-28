# Documentation Cucina

À lire dans l'ordre la première fois. Ensuite, chacun se consulte seul.

| Document | À quoi il sert | À lire avant de… |
|---|---|---|
| [01 — Vision](01-vision.md) | Le problème, la promesse, les principes, ce qu'on refuse de faire | discuter d'une nouvelle idée |
| [02 — Domaine](02-domaine.md) | Le vocabulaire et **les 6 règles métier** (R1→R6) | toucher à la liste de courses |
| [03 — Fonctionnalités](03-fonctionnalites.md) | Les histoires utilisateur par lot, et le périmètre V1 | démarrer un lot |
| [04 — Architecture](04-architecture.md) | Découpage technique, arborescence, flux de données | écrire du code |
| [05 — Modèle de données](05-modele-donnees.md) | Tables, contraintes, RLS, stockage | écrire une migration |
| [06 — Conventions](06-conventions.md) | Style, nommage, tests, git, « terminé » | ouvrir une PR |
| [07 — Feuille de route](07-roadmap.md) | Les jalons M0→M5 | savoir quoi faire ensuite |
| [08 — Questions ouvertes](08-questions-ouvertes.md) | Ce qui n'est pas tranché, avec les valeurs par défaut | trancher un point flou |
| [09 — Mise en service](09-mise-en-service.md) | Brancher Supabase, empaqueter l'app Android | sortir du mode local |

## Décisions d'architecture (ADR)

Une décision structurante = un ADR. On ne réécrit pas un ADR accepté : on en écrit un nouveau qui le remplace.

- [ADR-0001 — Angular + Capacitor plutôt que React Native](adr/0001-angular-capacitor.md)
- [ADR-0002 — Supabase plutôt que Firebase](adr/0002-supabase.md)
- [ADR-0003 — Planifier à la semaine, sans jour ni repas](adr/0003-planning-hebdo-sans-jour.md)
- [ADR-0004 — État par signals, pas de NgRx](adr/0004-etat-signals.md)
- [ADR-0005 — CSS natif, pas de framework UI](adr/0005-pas-de-framework-ui.md)
- [ADR-0006 — Deux implémentations du backend : locale et Supabase](adr/0006-deux-backends.md)

## Archive

- [Première version du projet (juillet 2026)](archive/) — spec, backlog et réflexion
  d'une Cucina en React / Express, abandonnée. Conservés pour le raisonnement,
  sans aucune autorité sur le code actuel.
