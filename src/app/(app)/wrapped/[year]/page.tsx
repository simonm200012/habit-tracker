import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryMeta } from "@/lib/categories";
import {
  bestStreak,
  groupLogs,
  isScheduled,
  dateRange,
} from "@/lib/habits";
import type { Habit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WrappedPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const startIso = `${year}-01-01`;
  const endIso = `${year}-12-31`;

  const [habitsRes, logsRes, profileRes] = await Promise.all([
    supabase.from("habits").select("*"),
    supabase
      .from("habit_logs")
      .select("habit_id, logged_on")
      .gte("logged_on", startIso)
      .lte("logged_on", endIso),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const logs = (logsRes.data ?? []) as Array<{ habit_id: string; logged_on: string }>;
  const logsByHabit = groupLogs(logs);
  const name = profileRes.data?.display_name ?? user.email?.split("@")[0] ?? "you";

  /* ============================================================
   * Stats
   * ============================================================ */
  const totalCheckoffs = logs.length;
  const uniqueDays = new Set(logs.map((l) => l.logged_on)).size;

  // Top habit by check-offs
  const habitCounts = new Map<string, number>();
  for (const l of logs) habitCounts.set(l.habit_id, (habitCounts.get(l.habit_id) ?? 0) + 1);
  const topHabits = Array.from(habitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ habit: habits.find((h) => h.id === id), count }))
    .filter((x) => x.habit) as Array<{ habit: Habit; count: number }>;

  // Best streak across all habits this year
  let absoluteBestStreak = 0;
  let absoluteBestHabit: Habit | null = null;
  for (const h of habits) {
    const stk = bestStreak(h, logsByHabit.get(h.id) ?? new Set());
    if (stk > absoluteBestStreak) {
      absoluteBestStreak = stk;
      absoluteBestHabit = h;
    }
  }

  // Category breakdown
  const categoryCounts = new Map<string, number>();
  for (const l of logs) {
    const h = habits.find((x) => x.id === l.habit_id);
    if (h) categoryCounts.set(h.category, (categoryCounts.get(h.category) ?? 0) + 1);
  }
  const categoryRows = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({ cat, count, meta: categoryMeta(cat) }));

  // Day-of-week
  const dowNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const l of logs) {
    const idx = (new Date(l.logged_on).getDay() + 6) % 7;
    dowCounts[idx]++;
  }
  const maxDow = Math.max(1, ...dowCounts);
  const bestDayIdx = dowCounts.indexOf(Math.max(...dowCounts));
  const worstDayIdx = dowCounts.indexOf(Math.min(...dowCounts));

  // Month-by-month
  const monthCounts = new Array(12).fill(0);
  for (const l of logs) monthCounts[new Date(l.logged_on).getMonth()]++;
  const maxMonth = Math.max(1, ...monthCounts);

  // Perfect days (all scheduled habits done)
  let perfectDays = 0;
  const logsByDayHabit = new Map<string, Set<string>>();
  for (const l of logs) {
    const s = logsByDayHabit.get(l.logged_on) ?? new Set();
    s.add(l.habit_id);
    logsByDayHabit.set(l.logged_on, s);
  }
  for (const iso of dateRange(new Date(startIso), new Date(endIso))) {
    const d = new Date(iso);
    if (d > new Date()) break;
    const scheduled = habits.filter((h) => h.status === "active" && isScheduled(h, d));
    if (scheduled.length === 0) continue;
    const done = logsByDayHabit.get(iso) ?? new Set();
    if (scheduled.every((h) => done.has(h.id))) perfectDays++;
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (totalCheckoffs === 0) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
          {year} wrapped
        </h1>
        <p className="text-slate-600">No data for this year yet. Check off some habits and come back.</p>
        <Link href="/dashboard" className="inline-block mt-6 px-5 py-2.5 bg-slate-900 text-white rounded-lg font-semibold text-sm">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Hero */}
        <section className="text-center pt-8 pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-4">Year in review</p>
          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-4">
            {year}
          </h1>
          <p className="text-lg text-slate-300">
            {name}, here&apos;s your year in habits.
          </p>
        </section>

        {/* Big numbers */}
        <section className="grid grid-cols-2 gap-4">
          <StatBlock label="Habits checked off" value={totalCheckoffs.toLocaleString()} accent="emerald" />
          <StatBlock label="Active days" value={uniqueDays.toString()} accent="sky" />
          <StatBlock label="Perfect days" value={perfectDays.toString()} accent="amber" />
          <StatBlock label="Best streak" value={`${absoluteBestStreak}d`} accent="rose" />
        </section>

        {/* Best streak callout */}
        {absoluteBestHabit && (
          <section className="p-6 rounded-3xl bg-white/5 backdrop-blur ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              🏆 Longest streak this year
            </p>
            <p className="text-3xl font-extrabold tracking-tight mb-1">{absoluteBestHabit.name}</p>
            <p className="text-slate-300 text-sm">
              <span className="text-amber-400 font-bold tabular-nums">{absoluteBestStreak} days</span>{" "}
              · {absoluteBestHabit.category}
            </p>
          </section>
        )}

        {/* Top habits */}
        {topHabits.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Your top habits
            </h2>
            <ul className="space-y-2">
              {topHabits.map(({ habit, count }, i) => {
                const meta = categoryMeta(habit.category);
                return (
                  <li
                    key={habit.id}
                    className="p-4 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center gap-4"
                  >
                    <span className="text-3xl font-extrabold tabular-nums text-slate-500 w-8">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{habit.name}</p>
                      <p className="text-xs text-slate-400">
                        {count} times · {meta.name}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Day of week */}
        <section className="p-6 rounded-3xl bg-white/5 ring-1 ring-white/10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Your week</h2>
          <p className="text-sm text-slate-300 mb-4">
            You show up most on{" "}
            <span className="text-emerald-400 font-bold">{dowNames[bestDayIdx]}</span>, least on{" "}
            <span className="text-rose-400 font-bold">{dowNames[worstDayIdx]}</span>.
          </p>
          <div className="flex items-end gap-2 h-32">
            {dowCounts.map((n, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full bg-white/5 rounded-md relative overflow-hidden h-full">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-400 to-emerald-300 rounded-md transition-all"
                    style={{ height: `${(n / maxDow) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{dowNames[i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Months */}
        <section className="p-6 rounded-3xl bg-white/5 ring-1 ring-white/10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Month by month
          </h2>
          <div className="flex items-end gap-1.5 h-32">
            {monthCounts.map((n, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full bg-white/5 rounded-md relative overflow-hidden h-full">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-400 to-sky-300 rounded-md"
                    style={{ height: `${(n / maxMonth) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold text-slate-400">{monthNames[i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        {categoryRows.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              How you spent your year
            </h2>
            <ul className="space-y-2">
              {categoryRows.map(({ cat, count, meta }) => {
                const total = categoryRows.reduce((a, b) => a + b.count, 0);
                const pct = Math.round((count / total) * 100);
                return (
                  <li
                    key={cat}
                    className="p-4 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold">{meta.name}</span>
                        <span className="text-xs tabular-nums text-slate-300">{count} · {pct}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Footer */}
        <section className="text-center pt-8 pb-4">
          <p className="text-sm text-slate-400 mb-6">Onwards, {name}. Make next year your best.</p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition shadow-lg"
          >
            Back to dashboard →
          </Link>
        </section>
      </div>
    </main>
  );
}

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "sky" | "amber" | "rose";
}) {
  const accentClass = {
    emerald: "from-emerald-400 to-emerald-200",
    sky: "from-sky-400 to-sky-200",
    amber: "from-amber-400 to-amber-200",
    rose: "from-rose-400 to-rose-200",
  }[accent];
  return (
    <div className="p-5 rounded-3xl bg-white/5 ring-1 ring-white/10">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <p
        className={`text-4xl font-extrabold tracking-tight tabular-nums bg-gradient-to-br ${accentClass} bg-clip-text text-transparent`}
      >
        {value}
      </p>
    </div>
  );
}
