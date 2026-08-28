-- Cucina — temps réel sur la liste de courses, et deux verrous manquants.

-- ─────────────────────────────────────────────────────────────
-- Temps réel
--
-- Sans publication, Realtime n'émet rien : deux téléphones ouverts dans le même
-- magasin continueraient de travailler chacun sur une photo périmée de la liste.
-- RLS s'applique aussi aux évènements : un membre ne reçoit que son foyer.
-- ─────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.shopping_item_sources;

-- `update` ne transporte l'ancienne ligne que si l'identité de réplique est
-- complète ; sans cela, un filtre sur une colonne non modifiée laisse passer
-- des évènements incomplets.
alter table public.shopping_items replica identity full;
alter table public.shopping_item_sources replica identity full;

-- ─────────────────────────────────────────────────────────────
-- Un membre ne se promeut pas lui-même
--
-- `members_update_self` autorise la mise à jour de sa propre ligne, ce qui
-- incluait la colonne `role`. RLS ne sait pas restreindre une colonne : c'est
-- un privilège au sens Postgres qui fait le travail.
-- ─────────────────────────────────────────────────────────────

revoke update (role) on public.household_members from authenticated;

-- ─────────────────────────────────────────────────────────────
-- Chemin de photo : un premier segment qui n'est pas un UUID faisait échouer
-- la politique entière sur une erreur de conversion, au lieu de refuser l'accès.
-- ─────────────────────────────────────────────────────────────

create or replace function public.photo_household(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  segment text := (storage.foldername(object_name))[1];
begin
  return segment::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

drop policy if exists recipe_photos_read on storage.objects;
drop policy if exists recipe_photos_write on storage.objects;
drop policy if exists recipe_photos_update on storage.objects;
drop policy if exists recipe_photos_delete on storage.objects;

create policy recipe_photos_read on storage.objects
  for select using (
    bucket_id = 'recipe-photos' and public.is_member(public.photo_household(name))
  );

create policy recipe_photos_write on storage.objects
  for insert with check (
    bucket_id = 'recipe-photos' and public.is_member(public.photo_household(name))
  );

create policy recipe_photos_update on storage.objects
  for update using (
    bucket_id = 'recipe-photos' and public.is_member(public.photo_household(name))
  );

create policy recipe_photos_delete on storage.objects
  for delete using (
    bucket_id = 'recipe-photos' and public.is_member(public.photo_household(name))
  );
