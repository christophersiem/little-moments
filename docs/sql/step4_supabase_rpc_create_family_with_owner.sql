-- Step 4: Transactional family creation + automatic onboarding RPC
-- Scope:
-- - RPC: public.rpc_create_family_with_owner(name text)
-- - Minimal RLS adjustments for INSERT behavior (direct client inserts denied)
-- - No invitations / no children / no additional entities

-- Ensure RLS is enabled (safe if already enabled)
alter table public.families enable row level security;
alter table public.family_members enable row level security;

-- Explicitly deny direct INSERT from authenticated clients.
-- (SECURITY DEFINER RPC will still work because it runs with function owner privileges.)
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

  -- Prevent duplicates for concurrent calls of the same user (e.g. double mount/retry).
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  -- If user already belongs to any family, return that family id.
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

  -- Transactional unit inside the function call:
  -- either both inserts succeed, or the entire call rolls back.
  insert into public.families (name, created_by)
  values (normalized_name, current_user_id)
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (new_family_id, current_user_id, 'OWNER');

  return new_family_id;
end;
$$;

revoke all on function public.rpc_create_family_with_owner(text) from public;
grant execute on function public.rpc_create_family_with_owner(text) to authenticated;

-- ------------------------------------------------------------
-- Verification checklist (new user flow)
-- ------------------------------------------------------------
-- 1) Create/sign in with a brand-new auth user.
-- 2) In SQL Editor (service role), verify exactly one membership row:
--    select * from public.family_members where user_id = 'NEW_USER_UUID';
--    -- expect: 1 row, role='OWNER'
-- 3) Verify one family row with created_by = NEW_USER_UUID:
--    select * from public.families where created_by = 'NEW_USER_UUID';
--    -- expect: 1 row
-- 4) Call RPC again as the same authenticated user:
--    select public.rpc_create_family_with_owner('Another Name');
--    -- expect: returns existing family id, no extra rows created
