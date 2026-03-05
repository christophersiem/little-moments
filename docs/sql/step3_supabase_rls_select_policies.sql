-- Step 3: Enable RLS + minimal SELECT policies
-- Scope: families + family_members
-- No INSERT/UPDATE/DELETE policies in this step.

-- 1) Enable RLS
alter table public.families enable row level security;
alter table public.family_members enable row level security;

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

revoke all on function public.is_member_of_family(uuid) from public;
grant execute on function public.is_member_of_family(uuid) to authenticated;

-- 2) Recreate SELECT policies (idempotent script)
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

-- ------------------------------------------------------------
-- Verification checklist (2 users)
-- ------------------------------------------------------------
-- Assumptions:
-- - Two auth users already exist: USER_A_UUID, USER_B_UUID.
-- - SQL Editor runs with elevated rights, so use the "simulate user" blocks below
--   to validate RLS behavior with auth.uid().
--
-- A) Create test data manually (elevated SQL Editor context)
--    1) Create family owned by User A:
--       insert into public.families (name, created_by)
--       values ('Family A', 'USER_A_UUID')
--       returning id;   -- copy FAMILY_ID
--
--    2) Add membership for User A only:
--       insert into public.family_members (family_id, user_id, role)
--       values ('FAMILY_ID', 'USER_A_UUID', 'OWNER');
--
-- B) User A should see family + members
--    begin;
--      set local role authenticated;
--      set local "request.jwt.claim.sub" = 'USER_A_UUID';
--
--      select id, name, created_by from public.families;
--      select family_id, user_id, role from public.family_members;
--    rollback;
--
-- C) User B should see nothing yet
--    begin;
--      set local role authenticated;
--      set local "request.jwt.claim.sub" = 'USER_B_UUID';
--
--      select id, name, created_by from public.families;        -- expect 0 rows
--      select family_id, user_id, role from public.family_members; -- expect 0 rows
--    rollback;
--
-- D) Add User B to family
--    insert into public.family_members (family_id, user_id, role)
--    values ('FAMILY_ID', 'USER_B_UUID', 'MEMBER');
--
-- E) User B should now see the family and both member rows
--    begin;
--      set local role authenticated;
--      set local "request.jwt.claim.sub" = 'USER_B_UUID';
--
--      select id, name, created_by from public.families;          -- expect Family A
--      select family_id, user_id, role from public.family_members; -- expect A + B rows
--    rollback;
