# 09 — Mise en service

Par défaut, Cucina tourne en **mode local** : tout fonctionne, mais les données restent sur l'appareil. Ce document décrit les deux étapes pour en sortir.

---

## 1. Brancher Supabase (partage entre membres du foyer)

### a. Créer le projet

Sur [supabase.com](https://supabase.com), crée un projet (offre gratuite, sans carte bancaire). Note l'**URL du projet** et la clé **anon / public** — *jamais* la clé `service_role`, qui ne doit exister nulle part dans ce dépôt.

### b. Appliquer les migrations

```bash
npx supabase link --project-ref <ref-du-projet>
npx supabase db push
```

Cela applique, dans l'ordre :

- `supabase/migrations/0001_initial.sql` — tables, contraintes, fonctions `create_household` / `accept_invite` / `invite_preview` ;
- `supabase/migrations/0002_rls.sql` — RLS sur **toutes** les tables, bucket `recipe-photos` et ses politiques.

À défaut de CLI, coller les deux fichiers dans l'éditeur SQL de Supabase, dans cet ordre, produit le même résultat.

### c. Renseigner la configuration

Dans `src/app/core/config.ts` :

```ts
export const defaultConfig: AppConfig = {
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseAnonKey: 'eyJ...',
};
```

Au prochain démarrage, `provideBackend()` bascule seul sur `SupabaseBackend` (cf. [ADR-0006](adr/0006-deux-backends.md)). Rien d'autre à changer : ni composant, ni store.

> La clé `anon` est publique par construction — c'est RLS qui protège les données. Elle peut être commitée sans risque. La clé `service_role`, elle, ne doit jamais approcher ce dépôt.

### d. Vérifier

Trois contrôles qui valent tous les tests unitaires du monde :

1. Créer un compte, créer un foyer, ajouter un article → l'article apparaît dans la table `shopping_items`.
2. Créer un code d'invitation, l'accepter depuis un **second compte** → les deux voient la même liste.
3. Depuis le second compte, tenter de lire les données d'un **troisième** foyer via l'API → doit retourner vide, pas une erreur : c'est RLS qui fait son travail.

---

## 2. Empaqueter l'application Android

Le projet natif n'est **pas** versionné : il se régénère, et le garder dans git n'apporte que du bruit.

```bash
npm run mobile:add:android    # une seule fois — nécessite le SDK Android
npm run mobile:sync           # après chaque changement de code
npm run mobile:open:android   # ouvre Android Studio pour produire l'APK
```

Prérequis : Android Studio et un JDK. `capacitor.config.ts` pointe déjà `webDir` sur la sortie de `ng build`.

### iOS

Hors périmètre v1 : la distribution demande un compte développeur Apple à 99 $/an. Sur iPhone, la **PWA** installée depuis Safari (Partager → Sur l'écran d'accueil) couvre le besoin.

---

## 3. Héberger la PWA

Le build est statique. N'importe quel hébergeur statique convient (Netlify, Vercel, Cloudflare Pages, Firebase Hosting, Supabase Hosting).

```bash
npm run build      # sortie : dist/cucina/browser
```

Une seule contrainte : **rediriger toutes les routes inconnues vers `index.html`** (l'application gère son propre routage). Sans cette règle, ouvrir directement `/courses` renvoie un 404.
