-- Option A (Supabase-first): authoritative schema + RLS + RPC
-- Copy/paste into Supabase SQL Editor.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) Core tables
-- ------------------------------------------------------------
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text null,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER', 'MEMBER')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  status text not null default 'PROCESSING' check (status in ('PROCESSING', 'READY', 'FAILED')),
  transcript text null,
  error_message text null,
  title text null,
  summary text null,
  tags text[] not null default '{}'
);

-- Reconcile existing installations where tables already exist with older shape.
-- `create table if not exists` does not add missing columns.
alter table public.memories
  add column if not exists title text null,
  add column if not exists summary text null,
  add column if not exists tags text[] not null default '{}';

create index if not exists idx_families_created_by on public.families(created_by);
create index if not exists idx_family_members_user_id on public.family_members(user_id);
create index if not exists idx_family_members_family_id on public.family_members(family_id);
create index if not exists idx_children_family_id on public.children(family_id);
create index if not exists idx_children_created_by on public.children(created_by);
create index if not exists idx_memories_child_created_at_desc on public.memories(child_id, created_at desc);
create index if not exists idx_memories_recorded_created_desc on public.memories(recorded_at desc, created_at desc);

-- ------------------------------------------------------------
-- 2) RLS
-- ------------------------------------------------------------
alter table public.families enable row level security;
alter table public.family_members enable row level security;
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

drop policy if exists "families_select_member_only" on public.families;
create policy "families_select_member_only"
  on public.families
  for select
  to authenticated
  using (public.is_member_of_family(families.id));

drop policy if exists "family_members_select_if_same_family" on public.family_members;
create policy "family_members_select_if_same_family"
  on public.family_members
  for select
  to authenticated
  using (public.is_member_of_family(family_members.family_id));

drop policy if exists "children_select_if_family_member" on public.children;
create policy "children_select_if_family_member"
  on public.children
  for select
  to authenticated
  using (public.is_member_of_family(children.family_id));

drop policy if exists "children_insert_owner_only" on public.children;
create policy "children_insert_owner_only"
  on public.children
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_owner_of_family(children.family_id)
  );

drop policy if exists "memories_select_if_child_family_member" on public.memories;
create policy "memories_select_if_child_family_member"
  on public.memories
  for select
  to authenticated
  using (public.is_member_of_child(memories.child_id));

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

drop policy if exists "memories_delete_if_creator_and_member" on public.memories;
create policy "memories_delete_if_family_member"
  on public.memories
  for delete
  to authenticated
  using (public.is_member_of_child(memories.child_id));

-- Direct inserts for families/family_members are denied.
drop policy if exists "families_insert_denied_direct" on public.families;
create policy "families_insert_denied_direct"
  on public.families
  for insert
  to authenticated
  with check (false);

drop policy if exists "family_members_insert_denied_direct" on public.family_members;
create policy "family_members_insert_denied_direct"
  on public.family_members
  for insert
  to authenticated
  with check (false);

grant select on public.families, public.family_members, public.children, public.memories to authenticated;
grant insert on public.children, public.memories to authenticated;
grant update, delete on public.memories to authenticated;
revoke all on function public.is_member_of_family(uuid) from public;
grant execute on function public.is_member_of_family(uuid) to authenticated;
revoke all on function public.is_owner_of_family(uuid) from public;
grant execute on function public.is_owner_of_family(uuid) to authenticated;
revoke all on function public.is_member_of_child(uuid) from public;
grant execute on function public.is_member_of_child(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3) RPC
-- ------------------------------------------------------------
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

revoke all on function public.rpc_create_family_with_owner(text) from public;
grant execute on function public.rpc_create_family_with_owner(text) to authenticated;

revoke all on function public.rpc_ensure_default_child_for_family(uuid, text) from public;
grant execute on function public.rpc_ensure_default_child_for_family(uuid, text) to authenticated;
