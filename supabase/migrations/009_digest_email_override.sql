-- Optional override email for digests. Falls back to the Supabase auth
-- email when null. Useful when Resend is in testing mode and only delivers
-- to the address that signed up for Resend.
alter table public.notification_prefs
  add column if not exists digest_email text;
