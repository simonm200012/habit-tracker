-- Adds habit settings: category, difficulty, frequency, reminder, status, goal target.
-- Safe to run on top of schema.sql (additive).

alter table public.habits add column if not exists category text default 'Health';
alter table public.habits add column if not exists frequency text default 'daily';      -- 'daily' | 'weekdays' | 'weekly'
alter table public.habits add column if not exists difficulty text default 'medium';    -- 'easy' | 'medium' | 'hard'
alter table public.habits add column if not exists status text default 'active';        -- 'active' | 'paused' | 'archived'
alter table public.habits add column if not exists reminder_time time;
alter table public.habits add column if not exists goal_target int default 1;
alter table public.habits add column if not exists goal_unit text default '';

-- Backfill existing rows
update public.habits set category = coalesce(category, 'Health');
update public.habits set status = coalesce(status, 'active');
