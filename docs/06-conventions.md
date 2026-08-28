# 06 — Conventions

## Langue

- **Interface, documentation, messages d'erreur utilisateur** → français.
- **Code, noms de fichiers, tables, colonnes, commits, commentaires techniques** → anglais.
- Jamais de mélange dans un identifiant : `shoppingList` ✅ · `listeDeCourses` ❌ · `shoppingListe` ❌❌.

## Fichiers et nommage

Le style Angular moderne (celui du scaffold) : **pas de suffixe `.component`, `.service`, `.pipe`**.

```
features/shopping/shopping-list.ts       # composant
features/shopping/shopping-list.html
features/shopping/shopping-list.css
features/shopping/shopping.store.ts      # store (signals)
data/shopping.repository.ts              # accès données
domain/shopping-list.ts                  # règles pures
domain/shopping-list.spec.ts             # tests des règles
```

- Fichiers en `kebab-case`, classes en `PascalCase`, symboles en `camelCase`.
- Un composant = un dossier de fonctionnalité, pas un dossier par composant tant que ça reste lisible.

## Angular

- `standalone` partout (c'est le défaut, ne pas écrire `standalone: true`).
- `changeDetection: ChangeDetectionStrategy.OnPush` **systématique**.
- Entrées/sorties par fonctions : `input()`, `input.required()`, `output()` — jamais les décorateurs `@Input`/`@Output`.
- État par `signal()`, dérivations par `computed()`, effets de bord par `effect()` **avec parcimonie** (un `effect` qui écrit dans un signal est presque toujours un `computed` mal écrit).
- Injection par `inject()`, pas par constructeur.
- Templates : `@if` / `@for` / `@switch`, jamais `*ngIf` / `*ngFor`.
- `@for` porte toujours un `track` explicite sur l'identifiant.
- Le zoneless est actif : aucune dépendance à `zone.js`, aucun `setTimeout` pour « forcer un rafraîchissement ».

## TypeScript

- `strict` activé, et il le reste.
- **`any` interdit.** Si un type est inconnu, c'est `unknown` + une validation.
- Pas d'assertion non-nulle `!` sur des données venant du réseau.
- Les types de la base sont **générés** depuis Supabase (`supabase gen types`), pas écrits à la main.
- Les modèles applicatifs (`domain/models.ts`) sont **distincts** des types de la base : le mapping se fait dans `data/`. La base ne fuit pas dans l'UI.

## CSS

- Mobile-first : on écrit le petit écran d'abord, les `@media` ajoutent le grand.
- Variables CSS centralisées dans `src/styles.css` (couleurs, espacements, rayons, typographies). Aucune couleur en dur dans un composant.
- Zones tactiles de **44 px minimum**.
- Respect des zones sûres iOS (`env(safe-area-inset-*)`) : la barre d'onglets basse ne doit pas passer sous la barre d'accueil.

## Tests

Priorité assumée, dans l'ordre :

1. **`domain/`** — couverture élevée exigée. Les règles R1→R6 ont chacune leurs tests, y compris les cas tordus (unités différentes, ligne cochée, quantité manuelle, quantité nulle).
2. **Stores** — les enchaînements d'actions.
3. **Composants** — uniquement le comportement visible qui compte (une case se coche, une erreur s'affiche). Pas de test de rendu cosmétique.

Pas de course à la couverture globale. Un test qui n'échouerait jamais est un test à supprimer.

## Git

- Branche `main` stable. Une branche par lot ou par histoire : `feat/l1-shopping-list`.
- Commits conventionnels : `feat(shopping): merge identical products on add`.
- Un commit = un changement cohérent qui compile et dont les tests passent.
- Les migrations SQL sont commitées **avec** le code qui les utilise.

## Définition de « terminé »

Une histoire n'est finie que si :

- [ ] elle fonctionne sur un **vrai téléphone**, pas seulement dans le navigateur redimensionné ;
- [ ] `npm run build` et `npm test` passent ;
- [ ] aucun `any`, aucun `console.log` oublié, aucun `TODO` non tracé ;
- [ ] les cas d'erreur sont gérés visuellement (chargement, vide, échec réseau) ;
- [ ] la documentation touchée par le changement est mise à jour dans le même commit.
