-- Step 10: owner-only memory writes
-- Apply in Supabase SQL Editor after step5+ policies are in place.

create or replace function public.is_owner_of_child(p_child_id uuid)
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
      and fm.role = 'OWNER'
  );
$$;

revoke all on function public.is_owner_of_child(uuid) from public;
grant execute on function public.is_owner_of_child(uuid) to authenticated;

drop policy if exists "memories_insert_if_member_and_owner_of_row" on public.memories;
drop policy if exists "memories_insert_owner_only" on public.memories;
create policy "memories_insert_owner_only"
  on public.memories
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_owner_of_child(memories.child_id)
  );

drop policy if exists "memories_delete_if_family_member" on public.memories;
drop policy if exists "memories_delete_owner_only" on public.memories;
create policy "memories_delete_owner_only"
  on public.memories
  for delete
  to authenticated
  using (public.is_owner_of_child(memories.child_id));
