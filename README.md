# habit-tracker

A cloud-based dashboard for tracking habits, water intake, and nutrition (calories, protein, fiber, carbs, fat).

Built with **Next.js 16 (App Router) + Supabase + Tailwind**, deployable to Vercel.

## Features

- **Habits** — add, check off daily, weekly targets
- **Water** — quick-add buttons (250/500/750 ml) + custom amount
- **Nutrition** — log food with calories / protein / fiber / carbs / fat, see daily progress vs goals
- **Goals** — per-user daily targets (editable from the dashboard)
- **Auth** — email/password via Supabase Auth, with row-level security so each user only sees their own data

## Stack

| Layer    | Tech                                              |
| -------- | ------------------------------------------------- |
| Frontend | Next.js 16 (App Router, RSC, Server Actions)      |
| Styling  | Tailwind CSS v4                                   |
| Database | Supabase (Postgres + Row-Level Security)          |
| Auth     | Supabase Auth (`@supabase/ssr`)                   |
| Hosting  | Vercel (frontend) + Supabase Cloud (DB)           |

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy the **Project URL** and the **anon public key**.
3. Open the **SQL editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it.

### 2. Local development

```bash
git clone https://github.com/simonm200012/habit-tracker.git
cd habit-tracker
npm install
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and start tracking.

### 3. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it on [vercel.com/new](https://vercel.com/new).
3. Add the two env vars from `.env.example` in the Vercel project settings.
4. Deploy — that's it.

## Project structure

```
src/
├── app/
│   ├── actions.ts          # server actions: habits, water, food, goals
│   ├── page.tsx            # main dashboard (server component)
│   ├── login/              # auth page + actions
│   └── layout.tsx
├── components/
│   ├── HabitsCard.tsx
│   ├── WaterCard.tsx
│   ├── NutritionCard.tsx
│   ├── GoalsCard.tsx
│   └── ProgressRing.tsx
├── lib/
│   ├── supabase/           # browser, server, proxy clients
│   └── types.ts
└── proxy.ts                # Next 16 proxy (auth redirect)
supabase/
└── schema.sql              # database schema + RLS policies
```

## Roadmap

Things to add next:

- [ ] Streaks + week-view calendar per habit
- [ ] Food search powered by USDA / Open Food Facts
- [ ] Barcode scanning on mobile
- [ ] Weight / body measurement tracking
- [ ] Workouts (sets / reps / volume)
- [ ] Sleep + steps via Apple Health / Google Fit
- [ ] Charts (weekly/monthly trends)
- [ ] PWA + push reminders
