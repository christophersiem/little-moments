-- Step 8: profiles + account baseline (Supabase Auth)
-- Scope:
-- - profiles table for display_name
-- - RLS: own read/write + shared-family read
-- - updated_at trigger

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.share_family_with_user(p_other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members me
    join public.family_members other_member
      on other_member.family_id = me.family_id
    where me.user_id = auth.uid()
      and other_member.user_id = p_other_user_id
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_same_family" on public.profiles;
create policy "profiles_select_own_or_same_family"
  on public.profiles
  for select
  to authenticated
  using (
    profiles.user_id = auth.uid()
    or public.share_family_with_user(profiles.user_id)
  );

drop policy if exists "profiles_insert_self_only" on public.profiles;
create policy "profiles_insert_self_only"
  on public.profiles
  for insert
  to authenticated
  with check (profiles.user_id = auth.uid());

drop policy if exists "profiles_update_self_only" on public.profiles;
create policy "profiles_update_self_only"
  on public.profiles
  for update
  to authenticated
  using (profiles.user_id = auth.uid())
  with check (profiles.user_id = auth.uid());

grant select, insert, update on public.profiles to authenticated;
revoke all on function public.share_family_with_user(uuid) from public;
grant execute on function public.share_family_with_user(uuid) to authenticated;
