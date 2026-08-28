-- Cucina — isolation entre foyers.
--
-- Principe : AUCUNE logique de sécurité côté client. Un client compromis ne doit
-- pouvoir lire ni écrire la moindre donnée d'un autre foyer. Toute table de ce
-- schéma a RLS activée ; une table sans politique est un incident.

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.products enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_utensils enable row level security;
alter table public.week_plans enable row level security;
alter table public.week_plan_recipes enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.shopping_item_sources enable row level security;

-- ── Foyer ────────────────────────────────────────────────────

create policy households_read on public.households
  for select using (public.is_member(id));

-- La création passe par create_household() : atomique, donc pas d'insertion directe.
create policy households_update on public.households
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy households_delete on public.households
  for delete using (owner_id = auth.uid());

create policy members_read on public.household_members
  for select using (public.is_member(household_id));

-- Seul le gérant retire un membre ; un membre peut se retirer lui-même.
create policy members_delete on public.household_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
  );

create policy members_update_self on public.household_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Invitations ──────────────────────────────────────────────
-- La lecture par un non-membre passe par invite_preview(), l'acceptation par
-- accept_invite() : deux fonctions security definer. Ici, seul le gérant agit.

create policy invites_read on public.household_invites
  for select using (public.is_member(household_id));

create policy invites_insert on public.household_invites
  for insert with check (
    exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
  );

create policy invites_delete on public.household_invites
  for delete using (
    exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
  );

-- ── Contenu du foyer : tous les membres ont les mêmes droits ──

create policy products_all on public.products
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy recipes_all on public.recipes
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy week_plans_all on public.week_plans
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy shopping_lists_all on public.shopping_lists
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

-- ── Tables filles : l'appartenance remonte au parent ──────────

create policy recipe_ingredients_all on public.recipe_ingredients
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and public.is_member(r.household_id))
  ) with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and public.is_member(r.household_id))
  );

create policy recipe_steps_all on public.recipe_steps
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and public.is_member(r.household_id))
  ) with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and public.is_member(r.household_id))
  );

create policy recipe_utensils_all on public.recipe_utensils
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and public.is_member(r.household_id))
  ) with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and public.is_member(r.household_id))
  );

create policy week_plan_recipes_all on public.week_plan_recipes
  for all using (
    exists (select 1 from public.week_plans p where p.id = week_plan_id and public.is_member(p.household_id))
  ) with check (
    exists (select 1 from public.week_plans p where p.id = week_plan_id and public.is_member(p.household_id))
  );

create policy shopping_items_all on public.shopping_items
  for all using (
    exists (select 1 from public.shopping_lists l where l.id = shopping_list_id and public.is_member(l.household_id))
  ) with check (
    exists (select 1 from public.shopping_lists l where l.id = shopping_list_id and public.is_member(l.household_id))
  );

create policy shopping_item_sources_all on public.shopping_item_sources
  for all using (
    exists (
      select 1 from public.shopping_items i
      join public.shopping_lists l on l.id = i.shopping_list_id
      where i.id = shopping_item_id and public.is_member(l.household_id)
    )
  ) with check (
    exists (
      select 1 from public.shopping_items i
      join public.shopping_lists l on l.id = i.shopping_list_id
      where i.id = shopping_item_id and public.is_member(l.household_id)
    )
  );

-- ── Photos de recettes ───────────────────────────────────────
-- Bucket privé, chemin {household_id}/{recipe_id}. Le premier segment du chemin
-- porte l'appartenance : c'est lui qu'on vérifie.

insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', false)
on conflict (id) do nothing;

create policy recipe_photos_read on storage.objects
  for select using (
    bucket_id = 'recipe-photos'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

create policy recipe_photos_write on storage.objects
  for insert with check (
    bucket_id = 'recipe-photos'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

create policy recipe_photos_update on storage.objects
  for update using (
    bucket_id = 'recipe-photos'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

create policy recipe_photos_delete on storage.objects
  for delete using (
    bucket_id = 'recipe-photos'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
