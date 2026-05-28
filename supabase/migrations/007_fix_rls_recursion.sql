-- Fix: infinite recursion in challenge_members RLS policy from migration 006.
-- The previous "challenge_members_co_read" policy queried challenge_members
-- from within a policy ON challenge_members, which Postgres can't evaluate.
-- The cascade also broke habits / habit_logs policies that joined through it.
--
-- Solution: move membership checks into SECURITY DEFINER functions that bypass
-- RLS, then have the policies call them.

-- ============================================================
-- 1) Drop the recursive policies
-- ============================================================
drop policy if exists "challenge_members_co_read"     on public.challenge_members;
drop policy if exists "habits_partner_read"            on public.habits;
drop policy if exists "habit_logs_partner_read"        on public.habit_logs;

-- ============================================================
-- 2) Helper functions (SECURITY DEFINER → bypass RLS)
-- ============================================================

-- Returns true if `who` is a member of `cid`. Used by challenge_members policy.
create or replace function public.is_member_of_challenge(cid uuid, who uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.challenge_members
    where challenge_id = cid
      and user_id = who
  );
$$;

-- Returns true if `viewer` has any read access to `target`'s habits/logs.
-- Allows: owner themself · accepted partner · same-challenge co-member · target's public profile is visible.
create or replace function public.can_view_user_habits(target uuid, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Always: yourself
    target = viewer
    -- Accepted partner
    or exists (
      select 1 from public.partnerships p
      where p.accepted_at is not null
        and ((p.user_a = viewer and p.user_b = target)
          or (p.user_b = viewer and p.user_a = target))
    )
    -- Share at least one challenge
    or exists (
      select 1
      from public.challenge_members me
      join public.challenge_members them
        on them.challenge_id = me.challenge_id
      where me.user_id  = viewer
        and them.user_id = target
    )
    -- Target has a public, streak-visible profile
    or exists (
      select 1 from public.public_profiles pp
      where pp.user_id = target
        and pp.is_public = true
        and pp.show_streaks = true
    );
$$;

-- ============================================================
-- 3) Recreate policies using the helpers (no more recursion)
-- ============================================================

-- challenge_members: members of a challenge can see each other's rows
create policy "challenge_members_co_read" on public.challenge_members
  for select using (
    public.is_member_of_challenge(challenge_id, auth.uid())
  );

-- habits: extra read access for partners / challenge mates / public profile
create policy "habits_partner_read" on public.habits
  for select using (
    public.can_view_user_habits(user_id, auth.uid())
  );

-- habit_logs: same
create policy "habit_logs_partner_read" on public.habit_logs
  for select using (
    public.can_view_user_habits(user_id, auth.uid())
  );
