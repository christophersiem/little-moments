-- Step 6: Invitations (create + accept), no email sending
-- Scope:
-- - invitations table
-- - rpc_create_invitation (owner only)
-- - rpc_accept_invitation (token acceptance for logged-in user)
-- - RLS: owner-only select, no direct client writes

create extension if not exists pgcrypto;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  role text not null check (role in ('OWNER', 'MEMBER')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  accepted_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create index if not exists idx_invitations_family_id on public.invitations(family_id);
create index if not exists idx_invitations_email on public.invitations(lower(email));
create index if not exists idx_invitations_expires_at on public.invitations(expires_at);
create index if not exists idx_invitations_created_by on public.invitations(created_by);

-- Ensure helper exists (used by RLS + RPC checks).
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

alter table public.invitations enable row level security;

drop policy if exists "invitations_select_owner_only" on public.invitations;
create policy "invitations_select_owner_only"
  on public.invitations
  for select
  to authenticated
  using (public.is_owner_of_family(invitations.family_id));

drop policy if exists "invitations_insert_denied_direct" on public.invitations;
create policy "invitations_insert_denied_direct"
  on public.invitations
  for insert
  to authenticated
  with check (false);

drop policy if exists "invitations_update_denied_direct" on public.invitations;
create policy "invitations_update_denied_direct"
  on public.invitations
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists "invitations_delete_denied_direct" on public.invitations;
create policy "invitations_delete_denied_direct"
  on public.invitations
  for delete
  to authenticated
  using (false);

grant select on public.invitations to authenticated;

create or replace function public.rpc_create_invitation(
  p_family_id uuid,
  p_email text,
  p_role text default 'MEMBER'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  normalized_email text;
  normalized_role text;
  raw_token text;
  hashed_token text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_owner_of_family(p_family_id) then
    raise exception 'Only owners can create invitations';
  end if;

  normalized_email := lower(btrim(coalesce(p_email, '')));
  if normalized_email = '' then
    raise exception 'Email is required';
  end if;

  normalized_role := upper(btrim(coalesce(p_role, 'MEMBER')));
  if normalized_role not in ('OWNER', 'MEMBER') then
    raise exception 'Invalid role';
  end if;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  hashed_token := encode(extensions.digest(raw_token, 'sha256'), 'hex');

  insert into public.invitations (
    family_id,
    email,
    role,
    token_hash,
    expires_at,
    created_by
  )
  values (
    p_family_id,
    normalized_email,
    normalized_role,
    hashed_token,
    now() + interval '7 days',
    current_user_id
  );

  return raw_token;
end;
$$;

create or replace function public.rpc_accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  current_user_email text;
  normalized_token text;
  hashed_token text;
  invitation_row public.invitations%rowtype;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select lower(u.email)
    into current_user_email
  from auth.users u
  where u.id = current_user_id;

  if current_user_email is null then
    raise exception 'Authenticated user has no email';
  end if;

  normalized_token := btrim(coalesce(p_token, ''));
  if normalized_token = '' then
    raise exception 'Invitation token is required';
  end if;

  hashed_token := encode(extensions.digest(normalized_token, 'sha256'), 'hex');

  select *
    into invitation_row
  from public.invitations i
  where i.token_hash = hashed_token
  for update;

  if invitation_row.id is null then
    raise exception 'Invitation not found';
  end if;
  if invitation_row.accepted_at is not null then
    raise exception 'Invitation already accepted';
  end if;
  if invitation_row.expires_at <= now() then
    raise exception 'Invitation expired';
  end if;
  if lower(invitation_row.email) <> current_user_email then
    raise exception 'Invitation email does not match current account';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (invitation_row.family_id, current_user_id, invitation_row.role)
  on conflict (family_id, user_id) do update
    set role = case
      when public.family_members.role = 'OWNER' then 'OWNER'
      else excluded.role
    end;

  update public.invitations
  set accepted_at = now(),
      accepted_by = current_user_id
  where id = invitation_row.id;

  return invitation_row.family_id;
end;
$$;

revoke all on function public.is_owner_of_family(uuid) from public;
grant execute on function public.is_owner_of_family(uuid) to authenticated;

revoke all on function public.rpc_create_invitation(uuid, text, text) from public;
grant execute on function public.rpc_create_invitation(uuid, text, text) to authenticated;

revoke all on function public.rpc_accept_invitation(text) from public;
grant execute on function public.rpc_accept_invitation(text) to authenticated;

-- ------------------------------------------------------------
-- Verification checklist
-- ------------------------------------------------------------
-- 1) As OWNER account: call rpc_create_invitation(FAMILY_ID, 'member@example.com', 'MEMBER')
--    -> returns RAW token.
-- 2) Build invite link:
--    https://<frontend-host>/invite/accept?token=<RAW_TOKEN>
-- 3) Log in as second account with member@example.com.
-- 4) Open invite link and accept.
-- 5) Validate:
--    select * from public.family_members where family_id = 'FAMILY_ID';
--    select accepted_at, accepted_by from public.invitations order by created_at desc limit 1;
