-- Step 12: Optional keep-audio support for memories.
-- Adds audio metadata columns to memories and ensures a private storage bucket exists.
-- Audio object access is signed server-side with SUPABASE_SERVICE_ROLE_KEY.

alter table public.memories
  add column if not exists audio_path text,
  add column if not exists audio_mime_type text,
  add column if not exists audio_size_bytes bigint,
  add column if not exists audio_duration_seconds integer;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-audio',
  'memory-audio',
  false,
  10485760,
  array['audio/webm', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/wav']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No direct storage object policies are added in this step.
-- The bucket remains private and backend signs short-lived URLs after membership checks.
