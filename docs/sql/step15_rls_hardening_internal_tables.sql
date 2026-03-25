-- Step 15: Harden internal tables that should not stay unrestricted
-- Scope:
-- - users
-- - memory_tags
-- - memory_enrichments
-- - embeddings
-- - embedding_dlq
--
-- Note: flyway_schema_history is intentionally not touched in this step.

create or replace function public.current_request_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function public.can_access_memory(p_memory_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_user_id uuid;
begin
  v_user_id := public.current_request_user_id();
  if v_user_id is null then
    return false;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'children'
  ) and exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'family_members'
  ) then
    return exists (
      select 1
      from public.memories m
      join public.children c on c.id = m.child_id
      join public.family_members fm on fm.family_id = c.family_id
      where m.id = p_memory_id
        and fm.user_id = v_user_id
    );
  end if;

  return exists (
    select 1
    from public.memories m
    where m.id = p_memory_id
      and (
        m.user_id = v_user_id
        or m.created_by = v_user_id
        or m.owner_id = v_user_id
      )
  );
end;
$$;

revoke all on function public.current_request_user_id() from public;
grant execute on function public.current_request_user_id() to authenticated;

revoke all on function public.can_access_memory(uuid) from public;
grant execute on function public.can_access_memory(uuid) to authenticated;

alter table public.users enable row level security;
alter table public.users force row level security;

drop policy if exists users_select_self_only on public.users;
create policy users_select_self_only
  on public.users
  for select
  to authenticated
  using (id = public.current_request_user_id());

drop policy if exists users_insert_self_only on public.users;
create policy users_insert_self_only
  on public.users
  for insert
  to authenticated
  with check (id = public.current_request_user_id());

drop policy if exists users_update_self_only on public.users;
create policy users_update_self_only
  on public.users
  for update
  to authenticated
  using (id = public.current_request_user_id())
  with check (id = public.current_request_user_id());

drop policy if exists users_delete_self_only on public.users;
create policy users_delete_self_only
  on public.users
  for delete
  to authenticated
  using (id = public.current_request_user_id());

grant select, insert, update, delete on public.users to authenticated;

alter table public.memory_tags enable row level security;
alter table public.memory_tags force row level security;

drop policy if exists memory_tags_select_if_memory_accessible on public.memory_tags;
create policy memory_tags_select_if_memory_accessible
  on public.memory_tags
  for select
  to authenticated
  using (public.can_access_memory(memory_id));

drop policy if exists memory_tags_insert_denied_direct on public.memory_tags;
create policy memory_tags_insert_denied_direct
  on public.memory_tags
  for insert
  to authenticated
  with check (false);

drop policy if exists memory_tags_update_denied_direct on public.memory_tags;
create policy memory_tags_update_denied_direct
  on public.memory_tags
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists memory_tags_delete_denied_direct on public.memory_tags;
create policy memory_tags_delete_denied_direct
  on public.memory_tags
  for delete
  to authenticated
  using (false);

grant select on public.memory_tags to authenticated;

alter table public.memory_enrichments enable row level security;
alter table public.memory_enrichments force row level security;

drop policy if exists memory_enrichments_select_if_memory_accessible on public.memory_enrichments;
create policy memory_enrichments_select_if_memory_accessible
  on public.memory_enrichments
  for select
  to authenticated
  using (public.can_access_memory(memory_id));

drop policy if exists memory_enrichments_insert_denied_direct on public.memory_enrichments;
create policy memory_enrichments_insert_denied_direct
  on public.memory_enrichments
  for insert
  to authenticated
  with check (false);

drop policy if exists memory_enrichments_update_denied_direct on public.memory_enrichments;
create policy memory_enrichments_update_denied_direct
  on public.memory_enrichments
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists memory_enrichments_delete_denied_direct on public.memory_enrichments;
create policy memory_enrichments_delete_denied_direct
  on public.memory_enrichments
  for delete
  to authenticated
  using (false);

grant select on public.memory_enrichments to authenticated;

alter table public.embeddings enable row level security;
alter table public.embeddings force row level security;

drop policy if exists embeddings_select_if_memory_accessible on public.embeddings;
create policy embeddings_select_if_memory_accessible
  on public.embeddings
  for select
  to authenticated
  using (public.can_access_memory(memory_id));

drop policy if exists embeddings_insert_denied_direct on public.embeddings;
create policy embeddings_insert_denied_direct
  on public.embeddings
  for insert
  to authenticated
  with check (false);

drop policy if exists embeddings_update_denied_direct on public.embeddings;
create policy embeddings_update_denied_direct
  on public.embeddings
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists embeddings_delete_denied_direct on public.embeddings;
create policy embeddings_delete_denied_direct
  on public.embeddings
  for delete
  to authenticated
  using (false);

grant select on public.embeddings to authenticated;

alter table public.embedding_dlq enable row level security;
alter table public.embedding_dlq force row level security;

drop policy if exists embedding_dlq_select_denied_direct on public.embedding_dlq;
create policy embedding_dlq_select_denied_direct
  on public.embedding_dlq
  for select
  to authenticated
  using (false);

drop policy if exists embedding_dlq_insert_denied_direct on public.embedding_dlq;
create policy embedding_dlq_insert_denied_direct
  on public.embedding_dlq
  for insert
  to authenticated
  with check (false);

drop policy if exists embedding_dlq_update_denied_direct on public.embedding_dlq;
create policy embedding_dlq_update_denied_direct
  on public.embedding_dlq
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists embedding_dlq_delete_denied_direct on public.embedding_dlq;
create policy embedding_dlq_delete_denied_direct
  on public.embedding_dlq
  for delete
  to authenticated
  using (false);
