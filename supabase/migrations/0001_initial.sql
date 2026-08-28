-- Cucina — schéma initial.
-- Voir docs/05-modele-donnees.md. Toute évolution passe par une nouvelle migration :
-- ce qui n'est pas dans un fichier de ce dossier n'existe pas.

-- ─────────────────────────────────────────────────────────────
-- Foyers et membres
-- ─────────────────────────────────────────────────────────────

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  -- Un utilisateur n'appartient qu'à un seul foyer (question Q1, docs/08).
  user_id uuid not null references auth.users (id) on delete cascade unique,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- Appartenance : la fonction sur laquelle repose toute l'isolation
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_member(h uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = h and user_id = auth.uid()
  );
$$;

create or replace function public.my_household()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from public.household_members where user_id = auth.uid() limit 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- Catalogue de produits
-- ─────────────────────────────────────────────────────────────

create table public.products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text not null default 'autre',
  default_unit text,
  created_at timestamptz not null default now()
);

-- Un même produit ne peut pas exister deux fois dans un foyer, à la casse près.
create unique index products_household_name_key
  on public.products (household_id, lower(trim(name)));

-- ─────────────────────────────────────────────────────────────
-- Recettes
-- ─────────────────────────────────────────────────────────────

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  photo_path text,
  servings integer not null default 4 check (servings > 0),
  prep_minutes integer check (prep_minutes >= 0),
  cook_minutes integer check (cook_minutes >= 0),
  source text,
  tags text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  -- null est légitime : « sel », « huile d'olive ».
  quantity numeric check (quantity is null or quantity >= 0),
  unit text,
  note text,
  position integer not null default 0
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position integer not null default 0,
  text text not null
);

create table public.recipe_utensils (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  name text not null,
  position integer not null default 0
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);
create index recipe_steps_recipe_idx on public.recipe_steps (recipe_id);
create index recipe_utensils_recipe_idx on public.recipe_utensils (recipe_id);

-- ─────────────────────────────────────────────────────────────
-- La semaine (sans jour ni repas — ADR-0003)
-- ─────────────────────────────────────────────────────────────

create table public.week_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived')),
  started_at timestamptz not null default now(),
  archived_at timestamptz
);

-- Une seule semaine active par foyer.
create unique index week_plans_one_active
  on public.week_plans (household_id) where status = 'active';

create table public.week_plan_recipes (
  id uuid primary key default gen_random_uuid(),
  week_plan_id uuid not null references public.week_plans (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  servings integer not null check (servings > 0),
  added_by uuid references auth.users (id) on delete set null,
  added_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Liste de courses
-- ─────────────────────────────────────────────────────────────

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- Une seule liste active par foyer.
create unique index shopping_lists_one_active
  on public.shopping_lists (household_id) where status = 'active';

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  unit text,
  quantity numeric,
  -- Contribution saisie par un humain (règle R4). Jamais écrasée automatiquement.
  manual_quantity numeric,
  added_manually boolean not null default false,
  checked boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references auth.users (id) on delete set null,
  note text
);

-- Règle R2 rendue impossible à violer par la base elle-même.
create unique index shopping_items_merge_key
  on public.shopping_items (shopping_list_id, product_id, coalesce(unit, '-'));

create table public.shopping_item_sources (
  id uuid primary key default gen_random_uuid(),
  shopping_item_id uuid not null references public.shopping_items (id) on delete cascade,
  week_plan_recipe_id uuid not null references public.week_plan_recipes (id) on delete cascade,
  quantity numeric
);

create index shopping_items_list_idx on public.shopping_items (shopping_list_id);
create index shopping_item_sources_item_idx on public.shopping_item_sources (shopping_item_id);

-- ─────────────────────────────────────────────────────────────
-- Invitations : deux fonctions, parce qu'un invité n'est pas encore membre
-- et ne peut donc rien lire ni écrire via les politiques normales.
-- ─────────────────────────────────────────────────────────────

create or replace function public.invite_preview(invite_code text)
returns table (household_id uuid, household_name text, expires_at timestamptz, already_used boolean)
language sql
security definer
stable
set search_path = public
as $$
  select h.id, h.name, i.expires_at, i.accepted_by is not null
  from public.household_invites i
  join public.households h on h.id = i.household_id
  where i.code = upper(trim(invite_code));
$$;

create or replace function public.accept_invite(invite_code text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.household_invites;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  select * into invite from public.household_invites
  where code = upper(trim(invite_code));

  if not found then
    raise exception 'Ce code d''invitation n''existe pas.';
  end if;
  if invite.accepted_by is not null then
    raise exception 'Cette invitation a déjà été utilisée.';
  end if;
  if invite.expires_at <= now() then
    raise exception 'Cette invitation a expiré.';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'Un compte ne peut être rattaché qu''à un seul foyer.';
  end if;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (invite.household_id, auth.uid(), 'member', coalesce(nullif(trim(member_name), ''), 'Membre'));

  update public.household_invites
  set accepted_by = auth.uid(), accepted_at = now()
  where id = invite.id;

  return invite.household_id;
end;
$$;

-- Création d'un foyer : l'insertion du foyer et celle de son gérant doivent être
-- atomiques, sinon un foyer orphelin devient invisible à son propre créateur.
create or replace function public.create_household(household_name text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'Un compte ne peut être rattaché qu''à un seul foyer.';
  end if;

  insert into public.households (name, owner_id)
  values (coalesce(nullif(trim(household_name), ''), 'Mon foyer'), auth.uid())
  returning id into new_id;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (new_id, auth.uid(), 'owner', coalesce(nullif(trim(member_name), ''), 'Moi'));

  return new_id;
end;
$$;

grant execute on function public.invite_preview(text) to anon, authenticated;
grant execute on function public.accept_invite(text, text) to authenticated;
grant execute on function public.create_household(text, text) to authenticated;
