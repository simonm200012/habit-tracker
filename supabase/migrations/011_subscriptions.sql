-- Tier 15 — Stripe billing.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'free',  -- free | trialing | active | past_due | canceled | incomplete | incomplete_expired | unpaid | paused
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_customer_idx on public.subscriptions(stripe_customer_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_self_read" on public.subscriptions;
create policy "subscriptions_self_read" on public.subscriptions
  for select using (user_id = auth.uid());
-- writes go through the Stripe webhook (service role) only — no self-write policy
