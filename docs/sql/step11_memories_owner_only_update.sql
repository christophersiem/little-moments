-- Step 11: owner-only memory updates
-- Apply in Supabase SQL Editor after step10.

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

drop policy if exists "memories_update_if_creator_and_member" on public.memories;
drop policy if exists "memories_update_owner_only" on public.memories;
create policy "memories_update_owner_only"
  on public.memories
  for update
  to authenticated
  using (public.is_owner_of_child(memories.child_id))
  with check (public.is_owner_of_child(memories.child_id));
