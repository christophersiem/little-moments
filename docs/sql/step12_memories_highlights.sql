-- Step 12: memory highlights
-- Adds a boolean flag so users can mark memories as Highlights.

alter table public.memories
    add column if not exists is_highlight boolean not null default false;

update public.memories
set is_highlight = false
where is_highlight is null;

create index if not exists idx_memories_is_highlight_recorded_created
    on public.memories (is_highlight, recorded_at desc, created_at desc);
