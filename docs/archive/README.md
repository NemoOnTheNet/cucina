# Archive — première version du projet (juillet 2026)

Ces documents décrivent une **autre** Cucina : même idée, autre technique. Ils
visaient PostgreSQL, une API Express et une interface React, avec une
organisation en lots pilotée par un backlog.

Le code qui existe aujourd'hui ne suit rien de tout cela. La direction technique
actuelle est décrite dans [`docs/04-architecture.md`](../04-architecture.md) et
figée par les six [ADR](../adr/) : Angular 21 zoneless, Capacitor, Supabase, deux
implémentations d'un même contrat de données.

**Aucun de ces fichiers ne fait autorité.** En cas de contradiction avec la
documentation courante, c'est la documentation courante qui l'emporte, toujours.
Ils restent ici parce que le raisonnement qui a mené au produit garde de la
valeur — notamment ce qui a été écarté, et pourquoi.

| Document | Ce qu'il contient |
|---|---|
| [Réflexion — vision](2026-07-24-reflexion-vision.md) | Le brainstorm d'origine : le problème, les usages visés |
| [Spec V1](2026-07-24-spec-v1-react-express.md) | La spécification détaillée, marquée « validée » à l'époque |
| [Backlog](backlog-react-express.md) | Le découpage en lots et son principe |
| [Lot 0 — fondations](backlog-lot-0-fondations.md) | Le premier lot, jamais réalisé sous cette forme |
| [Conventions](conventions-react-express.md) | L'ancien `AGENTS.md`, remplacé par [`CLAUDE.md`](../../CLAUDE.md) |

Ce qui a survécu au changement de direction se retrouve dans
[`01-vision.md`](../01-vision.md) et [`02-domaine.md`](../02-domaine.md) : la
promesse produit et les règles de la liste de courses n'ont pas bougé, seule la
manière de les réaliser a changé.
