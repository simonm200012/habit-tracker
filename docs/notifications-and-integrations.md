# Tier 7+9 setup — notifications & integrations

## Web Push (works when app is closed)

One-time setup:

```bash
# Generate VAPID keys
npx web-push generate-vapid-keys
```

Add the output to env vars (locally in `.env.local`, on Vercel via Project Settings → Environment Variables):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BMxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:you@example.com
```

Redeploy. Then in the app: **Settings → Push notifications → Enable on this device**.

## Email digests (Resend)

1. Sign up at https://resend.com (free tier: 3000 emails/month, 100/day)
2. Verify a sending domain
3. Add to env:

```
RESEND_API_KEY=re_xxx
RESEND_FROM="habit-tracker <digest@yourdomain.com>"
```

In **Settings → Notification preferences**, check Email next to any digest you want.

## Vercel Cron

`vercel.json` already schedules the 3 cron routes to tick every hour. Each route checks per-user local time and only fires if it's the user's chosen hour.

For Vercel to authenticate the cron pings, set:

```
CRON_SECRET=<any-strong-random-string>
SUPABASE_SERVICE_ROLE_KEY=<from-supabase-api-settings>
```

Test locally:

```bash
curl http://localhost:3030/api/cron/morning-brief
```

(Without `CRON_SECRET` set, the route accepts unauthenticated requests for testing.)

## Apple Calendar / Google Calendar feed

Available immediately, no setup. In **Settings → Integrations → Calendar feed**, copy the URL and:

- **Apple Calendar**: File → New Calendar Subscription → paste URL
- **Google Calendar**: Other calendars `+` → From URL → paste

Habits appear as recurring 15-minute events at their `reminder_time` (or 9am if unset).

## Apple Health auto-sync

Requires the iOS app **Health Auto Export** ($5 one-time, ~$2/mo for cloud automations — App Store).

1. **Settings → Integrations → Apple Health auto-sync** — copy the URL
2. In Health Auto Export: Automations → New Automation → REST API → paste URL
3. Pick metrics: `step_count`, `sleep_analysis`, `active_energy`, `apple_exercise_time`, `workout`
4. Set frequency: hourly

How it maps to habits:

| Metric                  | Auto-fills habits where… |
| ----------------------- | -------------------------- |
| `step_count`            | `goal_unit` is `steps` (or name contains "step") |
| `sleep_analysis`        | `goal_unit` is `hrs` or `hours` (or name contains "sleep") |
| `active_energy`         | `goal_unit` is `kcal` or `cal` (or name contains "calorie", "burn") |
| `apple_exercise_time`   | `goal_unit` is `min` or `minutes` (or name contains "exercise", "workout") |
| `workout`               | name contains "workout", "exercise", "gym" |
