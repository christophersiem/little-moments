-- Step 5: children + memory scoping by child/family
-- Scope:
-- - Create children table
-- - Add child_id to memories
-- - Add index (child_id, created_at desc)
-- - Enable/adjust RLS for children + memories
-- Notes:
-- - No invitation flow in this step
-- - UI assumes one child per family for now, schema supports many

create extension if not exists pgcrypto;

-- 1) children table
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create index if not exists idx_children_family_id on public.children(family_id);
create index if not exists idx_children_created_by on public.children(created_by);

-- Ensure family RPC creates a default child when a brand-new family is created.
create or replace function public.rpc_create_family_with_owner(name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  existing_family_id uuid;
  new_family_id uuid;
  normalized_name text;
  current_user_is_owner boolean;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select fm.family_id
    into existing_family_id
  from public.family_members fm
  where fm.user_id = current_user_id
  order by fm.joined_at asc
  limit 1;

  if existing_family_id is not null then
    select exists (
      select 1
      from public.family_members fm
      where fm.family_id = existing_family_id
        and fm.user_id = current_user_id
        and upper(trim(fm.role)) = 'OWNER'
    )
    into current_user_is_owner;

    if current_user_is_owner then
      insert into public.children (family_id, name, created_by)
      select existing_family_id, 'My Child', current_user_id
      where not exists (
        select 1
        from public.children c
        where c.family_id = existing_family_id
      );
    end if;

    return existing_family_id;
  end if;

  normalized_name := nullif(btrim(name), '');
  if normalized_name is null then
    normalized_name := 'My Family';
  end if;

  insert into public.families (name, created_by)
  values (normalized_name, current_user_id)
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (new_family_id, current_user_id, 'OWNER');

  insert into public.children (family_id, name, created_by)
  values (new_family_id, 'My Child', current_user_id);

  return new_family_id;
end;
$$;

revoke all on function public.rpc_create_family_with_owner(text) from public;
grant execute on function public.rpc_create_family_with_owner(text) to authenticated;

-- Ensure a family has at least one child and return its id.
-- Allows any family member to self-heal onboarding when legacy data has no child row.
create or replace function public.rpc_ensure_default_child_for_family(
  p_family_id uuid,
  p_child_name text default 'My Child'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  existing_child_id uuid;
  normalized_name text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = current_user_id
  ) then
    raise exception 'Not allowed for this family';
  end if;

  select c.id
    into existing_child_id
  from public.children c
  where c.family_id = p_family_id
  order by c.created_at asc
  limit 1;

  if existing_child_id is not null then
    return existing_child_id;
  end if;

  normalized_name := nullif(btrim(p_child_name), '');
  if normalized_name is null then
    normalized_name := 'My Child';
  end if;

  insert into public.children (family_id, name, created_by)
  values (p_family_id, normalized_name, current_user_id)
  returning id into existing_child_id;

  return existing_child_id;
end;
$$;

revoke all on function public.rpc_ensure_default_child_for_family(uuid, text) from public;
grant execute on function public.rpc_ensure_default_child_for_family(uuid, text) to authenticated;

-- 2) memories.child_id (supports dev reset or backfill)
alter table public.memories
  add column if not exists child_id uuid references public.children(id);

-- Keep frontend-compatible metadata columns available on older schemas.
alter table public.memories
  add column if not exists title text null,
  add column if not exists summary text null,
  add column if not exists tags text[] not null default '{}';

-- Optional backfill for existing dev data (best effort):
-- - Creates one default child for every family that has none yet.
insert into public.children (family_id, name, created_by)
select f.id, 'My Child', f.created_by
from public.families f
left join public.children c on c.family_id = f.id
where c.id is null;

update public.memories m
set child_id = first_child.id
from public.family_members fm
join lateral (
  select c.id
  from public.children c
  where c.family_id = fm.family_id
  order by c.created_at asc
  limit 1
) first_child on true
where m.child_id is null
  and fm.user_id = m.created_by;

-- If this fails due to remaining null child_id rows, reset dev data and rerun.
alter table public.memories
  alter column child_id set not null;

create index if not exists idx_memories_child_created_at_desc
  on public.memories(child_id, created_at desc);

-- 3) RLS
alter table public.children enable row level security;
alter table public.memories enable row level security;

create or replace function public.is_member_of_family(p_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = auth.uid()
  );
$$;

create or replace function public.is_owner_of_family(p_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = auth.uid()
      and fm.role = 'OWNER'
  );
$$;

create or replace function public.is_member_of_child(p_child_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.children c
    join public.family_members fm on fm.family_id = c.family_id
    where c.id = p_child_id
      and fm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_member_of_family(uuid) from public;
grant execute on function public.is_member_of_family(uuid) to authenticated;
revoke all on function public.is_owner_of_family(uuid) from public;
grant execute on function public.is_owner_of_family(uuid) to authenticated;
revoke all on function public.is_member_of_child(uuid) from public;
grant execute on function public.is_member_of_child(uuid) to authenticated;

-- children SELECT: visible only to members of the same family
drop policy if exists "children_select_if_family_member" on public.children;
create policy "children_select_if_family_member"
  on public.children
  for select
  to authenticated
  using (public.is_member_of_family(children.family_id));

-- children INSERT: OWNER only (for that family) and created_by must match auth user
drop policy if exists "children_insert_owner_only" on public.children;
create policy "children_insert_owner_only"
  on public.children
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_owner_of_family(children.family_id)
  );

-- memories SELECT: visible if user belongs to the child's family
drop policy if exists "memories_select_if_child_family_member" on public.memories;
create policy "memories_select_if_child_family_member"
  on public.memories
  for select
  to authenticated
  using (public.is_member_of_child(memories.child_id));

-- memories INSERT: allowed for family members; created_by must be auth user
drop policy if exists "memories_insert_if_member_and_owner_of_row" on public.memories;
create policy "memories_insert_if_member_and_owner_of_row"
  on public.memories
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_member_of_child(memories.child_id)
  );

drop policy if exists "memories_update_if_creator_and_member" on public.memories;
create policy "memories_update_if_creator_and_member"
  on public.memories
  for update
  to authenticated
  using (
    created_by = auth.uid()
    and public.is_member_of_child(memories.child_id)
  )
  with check (
    created_by = auth.uid()
    and public.is_member_of_child(memories.child_id)
  );

drop policy if exists "memories_delete_if_family_member" on public.memories;
create policy "memories_delete_if_family_member"
  on public.memories
  for delete
  to authenticated
  using (public.is_member_of_child(memories.child_id));

grant select on public.children, public.memories to authenticated;
grant insert on public.children, public.memories to authenticated;
grant update, delete on public.memories to authenticated;

-- ------------------------------------------------------------
-- Verification checklist (2 users, same family)
-- ------------------------------------------------------------
-- 1) USER_A signs up and gets onboarded:
--    - family exists
--    - one default child exists for that family
--
-- 2) Add USER_B to same family (SQL Editor / admin context):
--    insert into public.family_members (family_id, user_id, role)
--    values ('FAMILY_ID', 'USER_B_UUID', 'MEMBER');
--
-- 3) As USER_A (authenticated session):
--    - select from public.children -> sees child
--    - insert into public.memories with that child_id and created_by = USER_A_UUID -> succeeds
--
-- 4) As USER_B:
--    - select from public.children -> sees same child
--    - select from public.memories -> sees USER_A memory
--    - insert into public.memories with same child_id and created_by = USER_B_UUID -> succeeds
--
-- 5) Negative checks:
--    - USER_B cannot insert child (not OWNER)
--    - any user cannot insert memories with created_by != auth.uid()
