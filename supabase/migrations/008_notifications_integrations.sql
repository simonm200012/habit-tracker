-- Tier 7+9: notifications & integrations.

-- ============================================================
-- 1) Web Push subscriptions (one row per browser/device)
-- ============================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text default '',
  created_at timestamptz default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_self" on public.push_subscriptions;
create policy "push_subscriptions_self" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 2) Email + integration preferences
-- ============================================================
create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  morning_brief_email boolean default false,
  morning_brief_push boolean default true,
  evening_alert_email boolean default false,
  evening_alert_push boolean default true,
  weekly_review_email boolean default true,
  weekly_review_push boolean default false,
  -- Local hour 0..23 to send / fire in user's timezone
  morning_brief_hour int default 7,
  evening_alert_hour int default 20,
  timezone text default 'UTC',
  -- secret tokens for token-protected public endpoints (iCal, Health Auto Export)
  ical_token text not null default replace(gen_random_uuid()::text, '-', ''),
  health_token text not null default replace(gen_random_uuid()::text, '-', ''),
  updated_at timestamptz default now()
);

create index if not exists notification_prefs_ical_idx on public.notification_prefs(ical_token);
create index if not exists notification_prefs_health_idx on public.notification_prefs(health_token);

alter table public.notification_prefs enable row level security;

drop policy if exists "notification_prefs_self" on public.notification_prefs;
create policy "notification_prefs_self" on public.notification_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
