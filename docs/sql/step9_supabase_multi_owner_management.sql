-- Step 9: Multi-owner family management + last-owner guard
-- Scope:
-- - rpc_set_member_role (OWNER <-> MEMBER)
-- - rpc_remove_member hardening
-- - direct UPDATE/DELETE/INSERT on family_members blocked for clients

create extension if not exists pgcrypto;

-- Helper re-declared for idempotency.
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

alter table public.family_members enable row level security;

drop policy if exists "family_members_select_if_same_family" on public.family_members;
create policy "family_members_select_if_same_family"
  on public.family_members
  for select
  to authenticated
  using (public.is_member_of_family(family_members.family_id));

drop policy if exists "family_members_insert_denied_direct" on public.family_members;
create policy "family_members_insert_denied_direct"
  on public.family_members
  for insert
  to authenticated
  with check (false);

drop policy if exists "family_members_update_denied_direct" on public.family_members;
create policy "family_members_update_denied_direct"
  on public.family_members
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists "family_members_delete_denied_direct" on public.family_members;
create policy "family_members_delete_denied_direct"
  on public.family_members
  for delete
  to authenticated
  using (false);

revoke insert, update, delete on public.family_members from authenticated;
grant select on public.family_members to authenticated;

create or replace function public.rpc_set_member_role(
  p_family_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
returns table (
  family_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  target_role text;
  owner_count integer;
  normalized_new_role text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  normalized_new_role := upper(coalesce(p_new_role, ''));
  if normalized_new_role not in ('OWNER', 'MEMBER') then
    raise exception 'Invalid role. Use OWNER or MEMBER';
  end if;

  if not public.is_owner_of_family(p_family_id) then
    raise exception 'Not authorized';
  end if;

  -- Lock full family membership set to make owner checks race-safe.
  perform 1
  from public.family_members fm
  where fm.family_id = p_family_id
  for update;

  select fm.role
    into target_role
  from public.family_members fm
  where fm.family_id = p_family_id
    and fm.user_id = p_target_user_id;

  if target_role is null then
    raise exception 'Member not found';
  end if;

  if target_role = normalized_new_role then
    return query
      select fm.family_id, fm.user_id, fm.role, fm.joined_at
      from public.family_members fm
      where fm.family_id = p_family_id
        and fm.user_id = p_target_user_id;
    return;
  end if;

  if target_role = 'OWNER' and normalized_new_role = 'MEMBER' then
    select count(*)
      into owner_count
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.role = 'OWNER';

    if owner_count <= 1 then
      raise exception 'Cannot remove the last owner';
    end if;
  end if;

  update public.family_members fm
  set role = normalized_new_role
  where fm.family_id = p_family_id
    and fm.user_id = p_target_user_id;

  return query
    select fm.family_id, fm.user_id, fm.role, fm.joined_at
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = p_target_user_id;
end;
$$;

create or replace function public.rpc_remove_member(
  p_family_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  target_role text;
  owner_count integer;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_owner_of_family(p_family_id) then
    raise exception 'Not authorized';
  end if;

  -- Lock full family membership set to make owner checks race-safe.
  perform 1
  from public.family_members fm
  where fm.family_id = p_family_id
  for update;

  select fm.role
    into target_role
  from public.family_members fm
  where fm.family_id = p_family_id
    and fm.user_id = p_user_id;

  if target_role is null then
    raise exception 'Member not found';
  end if;

  if target_role = 'OWNER' then
    select count(*)
      into owner_count
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.role = 'OWNER';

    if owner_count <= 1 then
      raise exception 'Cannot remove the last owner';
    end if;
  end if;

  delete from public.family_members fm
  where fm.family_id = p_family_id
    and fm.user_id = p_user_id;

  return true;
end;
$$;

revoke all on function public.is_owner_of_family(uuid) from public;
grant execute on function public.is_owner_of_family(uuid) to authenticated;

revoke all on function public.rpc_set_member_role(uuid, uuid, text) from public;
grant execute on function public.rpc_set_member_role(uuid, uuid, text) to authenticated;

revoke all on function public.rpc_remove_member(uuid, uuid) from public;
grant execute on function public.rpc_remove_member(uuid, uuid) to authenticated;
