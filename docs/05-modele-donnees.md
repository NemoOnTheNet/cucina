# 05 — Modèle de données

Cible : **PostgreSQL** (Supabase). Tous les identifiants sont des `uuid`. Toutes les tables métier portent `household_id` — c'est la clé de l'isolation par RLS.

## Schéma

```
auth.users (Supabase)
     │
     ├──< household_members >── households
     │                              │
     │        ┌─────────────────────┼──────────────────────┐
     │        │                     │                      │
   products  recipes            week_plans           shopping_lists
                │                   │                      │
     ┌──────────┼──────────┐   week_plan_recipes     shopping_items
     │          │          │           │                   │
recipe_      recipe_    recipe_        └──── sources ──────┘
ingredients  steps      utensils      (shopping_item_sources)
```

## Tables

### `households`
| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | « Chez les Fantino » |
| `owner_id` | uuid → auth.users | le gérant |
| `created_at` | timestamptz | |

### `household_members`
| Colonne | Type | Notes |
|---|---|---|
| `household_id` | uuid → households | PK composite |
| `user_id` | uuid → auth.users | PK composite, **unique** globalement → un utilisateur = un foyer |
| `role` | text | `owner` \| `member` |
| `display_name` | text | |
| `joined_at` | timestamptz | |

### `household_invites`
| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `household_id` | uuid → households | |
| `code` | text unique | court, lisible, partageable |
| `created_by` | uuid | |
| `expires_at` | timestamptz | +7 jours |
| `accepted_by` | uuid null | null tant que non utilisé |
| `accepted_at` | timestamptz null | |

### `products` — le catalogue du foyer
| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `household_id` | uuid | |
| `name` | text | unique par foyer (insensible à la casse) |
| `category` | text | rayon, cf. `domain/categories.ts` |
| `default_unit` | text null | mémorise l'unité la plus utilisée |
| `created_at` | timestamptz | |

### `recipes`
| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `household_id` | uuid | |
| `title` | text | obligatoire |
| `description` | text null | |
| `photo_path` | text null | chemin dans le bucket Storage |
| `servings` | int | portions **de référence**, défaut 4 |
| `prep_minutes` / `cook_minutes` | int null | |
| `source` | text null | URL, livre, personne |
| `tags` | text[] | |
| `created_by`, `created_at`, `updated_at` | | |

### `recipe_ingredients`
| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `recipe_id` | uuid → recipes (cascade) | |
| `product_id` | uuid → products | |
| `quantity` | numeric null | **null autorisé** (« sel ») |
| `unit` | text null | `g`, `kg`, `ml`, `l`, `piece`, `cs`, `cc`, `pincee`… |
| `note` | text null | « finement hachée » |
| `position` | int | ordre d'affichage |

### `recipe_steps`
`id`, `recipe_id` (cascade), `position` int, `text` text.

### `recipe_utensils`
`id`, `recipe_id` (cascade), `name` text, `position` int.

### `week_plans`
| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `household_id` | uuid | |
| `status` | text | `active` \| `archived` — **une seule `active` par foyer** (index unique partiel) |
| `started_at`, `archived_at` | timestamptz | |

### `week_plan_recipes`
| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `week_plan_id` | uuid → week_plans (cascade) | |
| `recipe_id` | uuid → recipes | |
| `servings` | int | portions choisies pour cette fois |
| `added_by`, `added_at` | | |

### `shopping_lists`
| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `household_id` | uuid | |
| `status` | text | `active` \| `archived` — **une seule `active` par foyer** (index unique partiel) |
| `created_at`, `closed_at` | timestamptz | |

### `shopping_items`
| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `shopping_list_id` | uuid → shopping_lists (cascade) | |
| `product_id` | uuid → products | |
| `unit` | text null | Unité **canonique** (`g`, `ml`, `piece`…). La fusion se fait sur (product_id, unit) — cf. règle R2 |
| `quantity` | numeric null | Total affiché. Toujours recalculé : `somme des sources + manual_quantity` |
| `manual_quantity` | numeric null | Contribution humaine. Aucune opération automatique n'y touche (règle R4) |
| `added_manually` | boolean | Vrai si un humain a créé la ligne. Sert à la provenance affichée et à la règle R3 |
| `checked` | boolean | |
| `checked_at`, `checked_by` | | |
| `note` | text null | |

> Contrainte : **unique (`shopping_list_id`, `product_id`, `unit`)** — c'est la base de données elle-même qui rend la règle R2 impossible à violer.

### `shopping_item_sources` — la traçabilité
| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `shopping_item_id` | uuid → shopping_items (cascade) | |
| `week_plan_recipe_id` | uuid **not null** → week_plan_recipes (cascade) | une source est toujours une recette planifiée |
| `quantity` | numeric null | contribution de cette recette |

C'est cette table qui permet la règle R3 : retirer une recette = supprimer ses `sources`, recalculer la quantité de la ligne, puis supprimer la ligne si elle n'a plus aucune source, aucune contribution manuelle, **et** qu'elle n'est pas cochée.

L'apport humain n'est **pas** une ligne de cette table : il vit dans `shopping_items.manual_quantity`. Une seule contribution humaine par ligne, donc une seule colonne — et il devient impossible qu'une opération automatique la supprime par erreur.

## Isolation (RLS)

Une fonction unique, puis la même politique partout :

```sql
create function public.is_member(h uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from household_members
    where household_id = h and user_id = auth.uid()
  );
$$;
```

- Tables portant `household_id` : `using (is_member(household_id))`.
- Tables filles (`recipe_ingredients`, `shopping_items`, `shopping_item_sources`…) : politique remontant au parent par jointure.
- `household_invites` : lecture par code autorisée aux non-membres (c'est le principe même d'une invitation), écriture réservée au gérant.
- **RLS activée sur absolument toutes les tables.** Une table sans politique en base est un incident, pas un oubli.

## Stockage des photos

Bucket privé `recipe-photos`, chemin `{household_id}/{recipe_id}.jpg`, politique alignée sur `is_member`. Compression côté client avant envoi (largeur max 1200 px) — un téléphone produit des photos de 5 Mo dont on n'a aucun besoin.

## Migrations

Les migrations SQL vivent dans `supabase/migrations/`, versionnées dans git, appliquées via la CLI Supabase. **Aucune modification de schéma faite à la main dans l'interface web** : ce qui n'est pas dans une migration n'existe pas.
