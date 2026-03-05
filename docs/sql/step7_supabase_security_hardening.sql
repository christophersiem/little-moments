-- Step 7: Security hardening + edge-case protection
-- Scope:
-- - rpc_remove_member with owner-only enforcement
-- - Prevent removal of the last OWNER
-- - Explicitly deny direct update/delete writes on family_members
-- - Keep duplicate membership protection via PK (family_id, user_id)

-- Security notes:
-- - RLS remains the source of truth for all table access.
-- - Membership writes are controlled through SECURITY DEFINER RPCs.
-- - "At least one OWNER" is enforced transactionally in rpc_remove_member.

create extension if not exists pgcrypto;

-- helper should already exist from prior steps; re-declare for idempotency.
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

create or replace function public.rpc_remove_member(
  p_family_id uuid,
  p_user_id uuid
)
returns void
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
    raise exception 'Only owners can remove members';
  end if;

  -- lock all rows for the family to avoid races in owner-count checks.
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
end;
$$;

revoke all on function public.is_owner_of_family(uuid) from public;
grant execute on function public.is_owner_of_family(uuid) to authenticated;

revoke all on function public.rpc_remove_member(uuid, uuid) from public;
grant execute on function public.rpc_remove_member(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- Verification checklist (multi-user matrix)
-- ------------------------------------------------------------
-- A) Setup:
--    - Family F with OWNER_A, OWNER_B, MEMBER_C
-- B) OWNER_A removes MEMBER_C via rpc_remove_member(F, MEMBER_C) -> succeeds
-- C) OWNER_A removes OWNER_B via rpc_remove_member(F, OWNER_B) -> succeeds
-- D) OWNER_A removes OWNER_A via rpc_remove_member(F, OWNER_A) -> fails (last OWNER)
-- E) MEMBER_C attempts rpc_remove_member(F, OWNER_A) -> fails (403/owner check)
-- F) Duplicate membership insert still blocked by PK(family_id, user_id)
