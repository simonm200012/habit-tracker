-- Adds display ordering to habits and a daily journal table.
-- Safe to run on top of earlier migrations.

-- 1) Habit ordering for drag-to-reorder
alter table public.habits add column if not exists display_order int default 0;

-- Initial order = creation order (only for rows where it's still 0)
update public.habits
set display_order = sub.rn
from (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from public.habits
) sub
where public.habits.id = sub.id and public.habits.display_order = 0;

-- 2) Daily journal: one short reflection per user per day
create table if not exists public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_on date not null default current_date,
  content text not null default '',
  updated_at timestamptz default now(),
  unique (user_id, note_on)
);

create index if not exists daily_notes_user_date_idx on public.daily_notes(user_id, note_on);

alter table public.daily_notes enable row level security;

drop policy if exists "daily_notes self" on public.daily_notes;
create policy "daily_notes self" on public.daily_notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
