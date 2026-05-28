-- Tier 10 + 13 schema.

-- iOS Shortcut tokens (one per shortcut, scoped to a user)
create table if not exists public.shortcut_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  label text not null default 'Shortcut',
  created_at timestamptz default now(),
  last_used_at timestamptz,
  use_count int default 0
);

create index if not exists shortcut_tokens_user_idx on public.shortcut_tokens(user_id);
create index if not exists shortcut_tokens_token_idx on public.shortcut_tokens(token);

alter table public.shortcut_tokens enable row level security;

drop policy if exists "shortcut_tokens_self" on public.shortcut_tokens;
create policy "shortcut_tokens_self" on public.shortcut_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Streak insurance / skip credits
alter table public.notification_prefs
  add column if not exists skip_credits int default 0;

-- Daily quest completion
create table if not exists public.daily_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  quest_id text not null,
  completed_at timestamptz default now(),
  primary key (user_id, day, quest_id)
);

alter table public.daily_quests enable row level security;

drop policy if exists "daily_quests_self" on public.daily_quests;
create policy "daily_quests_self" on public.daily_quests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Unlocked theme accents (text array)
alter table public.notification_prefs
  add column if not exists unlocked_themes text[] default array['slate']::text[];
