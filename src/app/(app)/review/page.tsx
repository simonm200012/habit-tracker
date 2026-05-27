import { createClient } from "@/lib/supabase/server";
import { categoryMeta } from "@/lib/categories";
import { WeeklyBarChart } from "@/components/charts/WeeklyBarChart";
import {
  addDays,
  bestStreak,
  completionRate,
  currentStreak,
  dateRange,
  groupLogs,
  isScheduled,
  isoDate,
} from "@/lib/habits";
import type { Habit } from "@/lib/types";

/** Returns the Monday of the week containing `d`. */
function startOfWeek(d: Date) {
  const copy = new Date(d);
  const dow = (copy.getDay() + 6) % 7; // Mon=0
  copy.setDate(copy.getDate() - dow);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const thisMon = startOfWeek(today);
  const sundayThis = addDays(thisMon, 6);
  const lastMon = addDays(thisMon, -7);
  const sundayLast = addDays(thisMon, -1);

  const [habitsRes, logsRes, vacRes] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("status", "active")
      .order("display_order"),
    supabase.from("habit_logs").select("habit_id, logged_on").gte("logged_on", isoDate(addDays(today, -29))),
    supabase.from("vacation_days").select("day").gte("day", isoDate(addDays(today, -29))),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const logsByHabit = groupLogs(logsRes.data ?? []);
  const vacationDays = new Set((vacRes.data ?? []).map((r) => r.day as string));

  function tallyWeek(start: Date, end: Date) {
    let scheduled = 0;
    let completed = 0;
    const perHabit = new Map<string, { s: number; c: number }>();
    const dayBuckets: { day: string; scheduled: number; completed: number; iso: string }[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (const iso of dateRange(start, end)) {
      const d = new Date(iso);
      let s = 0;
      let c = 0;
      if (!vacationDays.has(iso)) {
        for (const h of habits) {
          if (!isScheduled(h, d)) continue;
          s += 1;
          scheduled += 1;
          const ph = perHabit.get(h.id) ?? { s: 0, c: 0 };
          ph.s += 1;
          if (logsByHabit.get(h.id)?.has(iso)) {
            ph.c += 1;
            c += 1;
            completed += 1;
          }
          perHabit.set(h.id, ph);
        }
      }
      dayBuckets.push({ day: dayNames[d.getDay()], scheduled: s, completed: c, iso });
    }
    return {
      scheduled,
      completed,
      rate: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100),
      perHabit,
      dayBuckets,
    };
  }

  const wk = tallyWeek(thisMon, sundayThis);
  const prev = tallyWeek(lastMon, sundayLast);
  const trend = wk.rate - prev.rate;

  // Best day this week
  const bestDay = wk.dayBuckets
    .filter((d) => d.scheduled > 0)
    .reduce(
      (best, d) =>
        (d.completed / d.scheduled) > (best.completed / best.scheduled) ? d : best,
      wk.dayBuckets.find((d) => d.scheduled > 0) ?? wk.dayBuckets[0],
    );
  const bestDayDate = bestDay ? new Date(bestDay.iso) : null;

  // Per-habit ranking
  const habitRows = habits
    .map((h) => {
      const stats = wk.perHabit.get(h.id) ?? { s: 0, c: 0 };
      const allLogs = logsByHabit.get(h.id) ?? new Set();
      return {
        habit: h,
        scheduled: stats.s,
        completed: stats.c,
        rate: stats.s === 0 ? 0 : Math.round((stats.c / stats.s) * 100),
        streak: currentStreak(h, allLogs, today, vacationDays),
        best: bestStreak(h, allLogs),
        rate30: completionRate(h, allLogs, 30),
      };
    })
    .sort((a, b) => b.rate - a.rate);

  // Highest streak gained this week (current vs week ago)
  // (Simple: just show top current)
  const topStreak = habitRows.reduce((m, r) => Math.max(m, r.streak), 0);

  const rangeLabel = `${thisMon.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${sundayThis.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Weekly review</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">{rangeLabel}</h1>
        <p className="text-slate-600 text-sm mt-1">
          How the week went · what to carry into next week.
        </p>
      </div>

      {/* Headline */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl shadow-lg p-7 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Completion</p>
            <p className="text-4xl font-bold mt-1 tabular-nums">{wk.rate}<span className="text-xl text-slate-400 font-semibold">%</span></p>
            <p className="text-xs text-slate-300 tabular-nums mt-1">{wk.completed} / {wk.scheduled} done</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Vs last week</p>
            <p className={`text-4xl font-bold mt-1 tabular-nums ${trend >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {trend >= 0 ? "↑" : "↓"}{Math.abs(trend)}<span className="text-xl text-slate-400 font-semibold">%</span>
            </p>
            <p className="text-xs text-slate-300 mt-1">prior: {prev.rate}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Top streak</p>
            <p className="text-4xl font-bold mt-1 tabular-nums">
              🔥 {topStreak}<span className="text-xl text-slate-400 font-semibold ml-1">d</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Best day</p>
            <p className="text-4xl font-bold mt-1">
              {bestDayDate
                ? bestDayDate.toLocaleDateString(undefined, { weekday: "short" })
                : "—"}
            </p>
            {bestDay && bestDay.scheduled > 0 && (
              <p className="text-xs text-slate-300 mt-1 tabular-nums">
                {bestDay.completed} of {bestDay.scheduled}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-5">
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">This week, day by day</h2>
            <p className="text-xs text-slate-500 mt-0.5">Completed vs scheduled</p>
          </div>
          <WeeklyBarChart
            data={wk.dayBuckets.map((d) => ({
              day: d.day,
              scheduled: d.scheduled,
              completed: d.completed,
            }))}
          />
        </section>

        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Plan for next week</h2>
            <p className="text-xs text-slate-500 mt-0.5">What's one thing to lock in?</p>
          </div>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-slate-400 font-bold">1.</span>
              <span>Pick the lowest-performing habit from below and lower the bar for next week.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 font-bold">2.</span>
              <span>Protect your best day — schedule the hardest habit on {bestDayDate ? bestDayDate.toLocaleDateString(undefined, { weekday: "long" }) : "your best day"}s.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 font-bold">3.</span>
              <span>Use Skip Day if you're traveling — it pauses streaks without breaking them.</span>
            </li>
          </ul>
        </section>

        {/* Habits table */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 overflow-hidden lg:col-span-3">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Habit-by-habit · this week</h2>
            <p className="text-xs text-slate-500 mt-0.5">Sorted by this week's completion</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50">
                <tr className="text-left">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Habit</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Done</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Streak</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">30d</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Week</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {habitRows.map((r) => {
                  const cat = categoryMeta(r.habit.category);
                  return (
                    <tr key={r.habit.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3">
                        <a href={`/habits/${r.habit.id}`} className="flex items-center gap-3 group">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center ring-1 ${cat.bg} ${cat.ring}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
                              <path d={cat.icon} />
                            </svg>
                          </div>
                          <p className="font-semibold text-slate-900 group-hover:underline">{r.habit.name}</p>
                        </a>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-600 tabular-nums">{r.completed} / {r.scheduled}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">{r.streak}d</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-600 tabular-nums">{r.rate30}%</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`font-bold tabular-nums ${r.rate >= 80 ? "text-emerald-700" : r.rate >= 50 ? "text-amber-700" : "text-rose-700"}`}>
                          {r.rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
