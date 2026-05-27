-- Tier 2: habit stacking + vacation mode
-- Safe to run on top of earlier migrations.

-- 1) Habit stacking: a habit can be linked to a "trigger" habit so checking
--    the trigger surfaces the stacked one in the UI.
alter table public.habits
  add column if not exists linked_to_habit_id uuid
  references public.habits(id) on delete set null;

create index if not exists habits_linked_to_idx on public.habits(linked_to_habit_id);

-- 2) Vacation days: skipped days don't count against streaks.
create table if not exists public.vacation_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  reason text default '',
  created_at timestamptz default now(),
  primary key (user_id, day)
);

create index if not exists vacation_days_user_idx on public.vacation_days(user_id);

alter table public.vacation_days enable row level security;

drop policy if exists "vacation_days self" on public.vacation_days;
create policy "vacation_days self" on public.vacation_days
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
