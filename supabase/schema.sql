-- habit-tracker schema
-- Run this in the Supabase SQL editor on a fresh project.

-- ============================================================
-- profiles: per-user goals (calories, protein, fiber, water)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  daily_calorie_goal int default 2000,
  daily_protein_goal_g int default 150,
  daily_fiber_goal_g int default 30,
  daily_water_goal_ml int default 2500,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- habits: things the user wants to do (gym, meditation, etc.)
-- ============================================================
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,                       -- e.g. 'dumbbell', 'book'
  color text default '#10b981',
  target_per_week int default 7,   -- e.g. gym 3x/week → 3
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists habits_user_idx on public.habits(user_id);

-- ============================================================
-- habit_logs: one row per check-in
-- ============================================================
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  logged_on date not null default current_date,
  note text,
  created_at timestamptz default now(),
  unique (habit_id, logged_on)
);

create index if not exists habit_logs_user_date_idx on public.habit_logs(user_id, logged_on);

-- ============================================================
-- water_logs: ml of water consumed
-- ============================================================
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_ml int not null check (amount_ml > 0),
  logged_at timestamptz default now(),
  logged_on date generated always as ((logged_at at time zone 'utc')::date) stored
);

create index if not exists water_logs_user_date_idx on public.water_logs(user_id, logged_on);

-- ============================================================
-- food_logs: calorie / macro entries
-- ============================================================
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  calories int not null default 0 check (calories >= 0),
  protein_g numeric(6,2) not null default 0 check (protein_g >= 0),
  fiber_g numeric(6,2) not null default 0 check (fiber_g >= 0),
  carbs_g numeric(6,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6,2) not null default 0 check (fat_g >= 0),
  logged_at timestamptz default now(),
  logged_on date generated always as ((logged_at at time zone 'utc')::date) stored
);

create index if not exists food_logs_user_date_idx on public.food_logs(user_id, logged_on);

-- ============================================================
-- Row-Level Security: every user sees only their own rows
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.habits      enable row level security;
alter table public.habit_logs  enable row level security;
alter table public.water_logs  enable row level security;
alter table public.food_logs   enable row level security;

-- profiles: id == auth.uid()
drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- generic helper: user_id == auth.uid()
do $$
declare t text;
begin
  foreach t in array array['habits','habit_logs','water_logs','food_logs'] loop
    execute format('drop policy if exists "%s self" on public.%I', t, t);
    execute format(
      'create policy "%s self" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t, t
    );
  end loop;
end$$;

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
