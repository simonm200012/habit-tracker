-- Tier 6: social features (public profiles, accountability partners, group challenges).
-- Safe to run on top of earlier migrations.

-- ============================================================
-- public_profiles: opt-in showcase URL
-- ============================================================
create table if not exists public.public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text unique not null check (slug ~* '^[a-z0-9][a-z0-9_-]{2,30}$'),
  display_name text,
  bio text default '',
  is_public boolean default true,
  show_streaks boolean default true,
  show_achievements boolean default true,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.public_profiles enable row level security;

drop policy if exists "public_profiles_self_write" on public.public_profiles;
create policy "public_profiles_self_write" on public.public_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "public_profiles_public_read" on public.public_profiles;
create policy "public_profiles_public_read" on public.public_profiles
  for select using (is_public = true);

-- ============================================================
-- partner_invites: shareable codes; one-time redemption
-- ============================================================
create table if not exists public.partner_invites (
  code text primary key,
  from_user uuid not null references auth.users(id) on delete cascade,
  redeemed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);

alter table public.partner_invites enable row level security;

drop policy if exists "partner_invites_self" on public.partner_invites;
create policy "partner_invites_self" on public.partner_invites
  for all using (from_user = auth.uid() or redeemed_by = auth.uid())
  with check (from_user = auth.uid());

-- Anyone authenticated can look up an unredeemed invite by code
drop policy if exists "partner_invites_read_active" on public.partner_invites;
create policy "partner_invites_read_active" on public.partner_invites
  for select using (auth.uid() is not null);

-- ============================================================
-- partnerships: accepted bidirectional links (canonical ordering)
-- ============================================================
create table if not exists public.partnerships (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

alter table public.partnerships enable row level security;

drop policy if exists "partnerships_self" on public.partnerships;
create policy "partnerships_self" on public.partnerships
  for all using (user_a = auth.uid() or user_b = auth.uid())
  with check (user_a = auth.uid() or user_b = auth.uid());

-- ============================================================
-- challenges: group challenges with shareable invite codes
-- ============================================================
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  category text default 'Health',
  starts_on date not null default current_date,
  ends_on date not null,
  creator_id uuid not null references auth.users(id) on delete cascade,
  invite_code text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (challenge_id, user_id)
);

alter table public.challenges        enable row level security;
alter table public.challenge_members enable row level security;

-- Any authenticated user can read challenges (so they can preview by code)
drop policy if exists "challenges_read_all_auth" on public.challenges;
create policy "challenges_read_all_auth" on public.challenges
  for select using (auth.uid() is not null);

drop policy if exists "challenges_creator_write" on public.challenges;
create policy "challenges_creator_write" on public.challenges
  for insert with check (creator_id = auth.uid());

drop policy if exists "challenges_creator_update" on public.challenges;
create policy "challenges_creator_update" on public.challenges
  for update using (creator_id = auth.uid());

drop policy if exists "challenges_creator_delete" on public.challenges;
create policy "challenges_creator_delete" on public.challenges
  for delete using (creator_id = auth.uid());

drop policy if exists "challenge_members_self" on public.challenge_members;
create policy "challenge_members_self" on public.challenge_members
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "challenge_members_co_read" on public.challenge_members;
create policy "challenge_members_co_read" on public.challenge_members
  for select using (
    exists (
      select 1 from public.challenge_members me
      where me.challenge_id = challenge_members.challenge_id
        and me.user_id = auth.uid()
    )
  );

-- ============================================================
-- Cross-user habit visibility (partners + challenge co-members + public profile)
-- ============================================================
drop policy if exists "habits_partner_read" on public.habits;
create policy "habits_partner_read" on public.habits for select using (
  exists (
    select 1 from public.partnerships p
    where p.accepted_at is not null
    and ((p.user_a = auth.uid() and p.user_b = habits.user_id)
      or (p.user_b = auth.uid() and p.user_a = habits.user_id))
  )
  OR exists (
    select 1
    from public.challenge_members me
    join public.challenge_members them
      on them.challenge_id = me.challenge_id
    where me.user_id = auth.uid()
      and them.user_id = habits.user_id
  )
  OR exists (
    select 1 from public.public_profiles pp
    where pp.user_id = habits.user_id
      and pp.is_public = true
      and pp.show_streaks = true
  )
);

drop policy if exists "habit_logs_partner_read" on public.habit_logs;
create policy "habit_logs_partner_read" on public.habit_logs for select using (
  exists (
    select 1 from public.partnerships p
    where p.accepted_at is not null
    and ((p.user_a = auth.uid() and p.user_b = habit_logs.user_id)
      or (p.user_b = auth.uid() and p.user_a = habit_logs.user_id))
  )
  OR exists (
    select 1
    from public.challenge_members me
    join public.challenge_members them
      on them.challenge_id = me.challenge_id
    where me.user_id = auth.uid()
      and them.user_id = habit_logs.user_id
  )
  OR exists (
    select 1 from public.public_profiles pp
    where pp.user_id = habit_logs.user_id
      and pp.is_public = true
      and pp.show_streaks = true
  )
);
