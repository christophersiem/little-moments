-- Step 2: Supabase Postgres schema for families + family_members
-- Scope: tables, constraints, indexes only (no RLS, no RPC)

create extension if not exists pgcrypto;

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

create index if not exists idx_family_members_user_id
  on public.family_members(user_id);

create index if not exists idx_family_members_family_id
  on public.family_members(family_id);

create index if not exists idx_families_created_by
  on public.families(created_by);

-- ------------------------------------------------------------
-- Tiny manual test (run in Supabase SQL Editor, adjust UUIDs)
-- ------------------------------------------------------------
-- 1) Pick existing users:
--    select id, email from auth.users order by created_at desc limit 2;
--
-- 2) Insert one family (replace OWNER_USER_UUID):
--    insert into public.families (name, created_by)
--    values ('Little Moments Family', 'OWNER_USER_UUID')
--    returning id;
--
-- 3) Insert owner membership (replace FAMILY_UUID + OWNER_USER_UUID):
--    insert into public.family_members (family_id, user_id, role)
--    values ('FAMILY_UUID', 'OWNER_USER_UUID', 'OWNER');
--
-- 4) Insert second member (replace FAMILY_UUID + MEMBER_USER_UUID):
--    insert into public.family_members (family_id, user_id, role)
--    values ('FAMILY_UUID', 'MEMBER_USER_UUID', 'MEMBER');
--
-- 5) Verify:
--    select * from public.families;
--    select * from public.family_members order by joined_at asc;
