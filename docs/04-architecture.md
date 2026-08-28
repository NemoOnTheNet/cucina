# 04 — Architecture technique

## Décisions structurantes

| Sujet | Choix | Détail |
|---|---|---|
| Front | **Angular 21**, standalone, **zoneless**, signals | Vérifié : le scaffold n'embarque pas `zone.js`. |
| Mobile | **Capacitor** | Un seul code : web installable aujourd'hui, `.apk` / `.ipa` plus tard. Voir [ADR-0001](adr/0001-angular-capacitor.md). |
| Back-end | **Supabase** (Postgres, Auth, Storage, Realtime) | Voir [ADR-0002](adr/0002-supabase.md). |
| Stockage local | **IndexedDB**, même contrat que Supabase | Mode par défaut tant que Supabase n'est pas configuré. Voir [ADR-0006](adr/0006-deux-backends.md). |
| État | **Signals** + services par fonctionnalité | Pas de NgRx. Voir [ADR-0004](adr/0004-etat-signals.md). |
| Tests | **Vitest** (déjà dans le projet) + jsdom | Priorité absolue : la logique de fusion de la liste. |
| Styles | CSS natif + variables CSS, mobile-first | Pas de framework UI en v1. Voir [ADR-0005](adr/0005-pas-de-framework-ui.md). |

## Vue d'ensemble

```
┌──────────────────────────────────────────────────┐
│  Application Angular (web / WebView Capacitor)   │
│                                                  │
│  features/  écrans + stores (signals)            │
│      ↓ dépend de                                 │
│  domain/    modèles, règles métier PURES         │
│      ↑ implémenté par                            │
│  data/      repositories → Supabase              │
└──────────────────────────────────────────────────┘
                       ↕ HTTPS / WebSocket
┌──────────────────────────────────────────────────┐
│  Supabase : Postgres + RLS · Auth · Storage      │
└──────────────────────────────────────────────────┘
```

**La règle d'or** : `domain/` ne connaît **ni Angular, ni Supabase, ni HTTP**. Ce sont des fonctions et des types purs. Les règles R1→R6 du [domaine](02-domaine.md) y vivent, et sont testables sans démarrer quoi que ce soit. C'est ce qui rend un futur changement de back-end (ou une API maison) supportable.

## Arborescence cible

```
src/app/
├── core/                      # transverse, chargé une fois
│   ├── auth/                  # session, garde de route, contexte utilisateur
│   ├── household/             # foyer courant (signal global)
│   ├── supabase/              # client, typage généré, mapping erreurs
│   └── ui/                    # toasts, dialogues, layout applicatif
│
├── domain/                    # ⚠️ ZÉRO import Angular ou Supabase
│   ├── models.ts              # Product, Recipe, ShoppingItem, WeekPlan…
│   ├── shopping-list.ts       # R1..R6 : fusion, retrait, agrégation
│   ├── quantities.ts          # quantités, unités, mise à l'échelle portions
│   └── categories.ts          # rayons et ordre de parcours magasin
│
├── data/                      # accès aux données
│   ├── backend.ts             # LE contrat : gateways auth/foyer/produits/recettes/semaine/courses/photos
│   ├── idb.ts                 # micro-couche IndexedDB, sans dépendance
│   ├── local/                 # implémentation locale (par défaut)
│   └── supabase/              # implémentation Supabase (dès que configurée)
│
├── features/
│   ├── shopping/              # LA liste de courses
│   ├── recipes/               # liste, fiche, édition, mode cuisine
│   ├── week/                  # la semaine
│   ├── household/             # membres, invitations
│   └── auth/                  # connexion, inscription, invitation
│
└── shared/                    # composants réutilisables sans métier
```

Chaque `features/x/` contient : ses composants (`.ts` + `.html` + `.css`), un `x.store.ts` (signals) et ses routes lazy `x.routes.ts`.

## Navigation

Barre d'onglets basse, trois entrées, dans cet ordre — l'ordre reflète la fréquence d'usage :

1. **Courses** *(écran d'accueil par défaut)*
2. **Semaine**
3. **Recettes**

Le foyer et le compte vivent dans un écran de réglages accessible depuis l'en-tête.

## Flux de données

Un seul sens, prévisible :

```
Composant ──action──▶ Store (signals) ──▶ Repository ──▶ Supabase
    ▲                     │
    └────signal lecture───┘
```

- Le **store** est la seule source de vérité d'une fonctionnalité. Il expose des `signal()` en lecture seule et des méthodes d'action.
- Le composant ne parle **jamais** directement à un repository.
- Les règles métier ne vivent **jamais** dans un composant ni dans un store : elles sont appelées depuis `domain/`.
- Mise à jour **optimiste** sur les actions fréquentes (cocher un article) : on met à jour le signal immédiatement, on envoie derrière, on annule visuellement si ça échoue. En magasin, attendre le réseau pour voir une case se cocher est inacceptable.

## Hors ligne

Position v1 assumée : **l'app s'ouvre hors ligne en lecture, les écritures nécessitent le réseau.**

- Service Worker Angular pour le shell applicatif et les photos.
- Cache local (IndexedDB) des données du foyer, réhydraté à l'ouverture.
- La file d'écritures différées (« outbox ») est un chantier identifié en L4.2, **pas** en v1 — c'est un vrai sujet de synchronisation et le bâcler ferait perdre des données. Documenté comme limitation connue.

## Sécurité

- Aucune logique de sécurité côté client. **L'isolation entre foyers est garantie par les politiques RLS Postgres**, pas par des filtres Angular. Un client compromis ne doit pouvoir lire aucune donnée d'un autre foyer.
- Les clés Supabase publiques (`anon key`) sont, par nature, publiques : c'est RLS qui protège. Aucune clé `service_role` ne doit exister côté client, jamais.
