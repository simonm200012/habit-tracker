import { createClient } from "@/lib/supabase/server";
import { CompletionAreaChart } from "@/components/charts/CompletionAreaChart";
import { DayOfWeekChart } from "@/components/charts/DayOfWeekChart";
import { CorrelationsCard } from "@/components/CorrelationsCard";
import { pairwiseCorrelations } from "@/lib/correlations";
import { categoryMeta } from "@/lib/categories";
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

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const start = addDays(today, -89);

  const [habitsRes, logsRes] = await Promise.all([
    supabase.from("habits").select("*").eq("status", "active").order("created_at"),
    supabase.from("habit_logs").select("habit_id, logged_on").gte("logged_on", isoDate(start)),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const logsByHabit = groupLogs(logsRes.data ?? []);
  const correlations = pairwiseCorrelations(habits, logsRes.data ?? [], start, today);

  // 90-day completion area
  const areaData = dateRange(addDays(today, -89), today).map((iso) => {
    const d = new Date(iso);
    let s = 0;
    let c = 0;
    for (const h of habits) {
      if (!isScheduled(h, d)) continue;
      s += 1;
      if (logsByHabit.get(h.id)?.has(iso)) c += 1;
    }
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      rate: s === 0 ? 0 : Math.round((c / s) * 100),
    };
  });

  // Day-of-week radar (last 90 days)
  const dowNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dowAgg = dowNames.map(() => ({ s: 0, c: 0 }));
  for (const iso of dateRange(addDays(today, -89), today)) {
    const d = new Date(iso);
    const idx = (d.getDay() + 6) % 7;
    for (const h of habits) {
      if (!isScheduled(h, d)) continue;
      dowAgg[idx].s += 1;
      if (logsByHabit.get(h.id)?.has(iso)) dowAgg[idx].c += 1;
    }
  }
  const dowData = dowAgg.map((x, i) => ({
    day: dowNames[i],
    rate: x.s === 0 ? 0 : Math.round((x.c / x.s) * 100),
  }));
  const bestDay = dowData.reduce((b, d) => (d.rate > b.rate ? d : b), dowData[0]);
  const worstDay = dowData.reduce((w, d) => (d.rate < w.rate ? d : w), dowData[0]);

  // Per-habit ranking
  type Row = { habit: Habit; rate: number; streak: number; best: number; logged: number };
  const rows: Row[] = habits.map((h) => {
    const logs = logsByHabit.get(h.id) ?? new Set();
    return {
      habit: h,
      rate: completionRate(h, logs, 30),
      streak: currentStreak(h, logs),
      best: bestStreak(h, logs),
      logged: Array.from(logs).filter((iso) => {
        const d = new Date(iso);
        return d >= addDays(today, -29) && d <= today;
      }).length,
    };
  });
  const ranked = [...rows].sort((a, b) => b.rate - a.rate);
  const topPerformers = ranked.slice(0, 3);
  const weakSpots = [...ranked].reverse().slice(0, 3);

  // Monthly buckets (last 3 months)
  function monthLabel(d: Date) {
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  const months: { label: string; rate: number; done: number; scheduled: number }[] = [];
  for (let offset = 2; offset >= 0; offset--) {
    const ref = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const next = new Date(today.getFullYear(), today.getMonth() - offset + 1, 1);
    let s = 0;
    let c = 0;
    for (const iso of dateRange(ref, addDays(next, -1))) {
      const d = new Date(iso);
      if (d > today) break;
      for (const h of habits) {
        if (!isScheduled(h, d)) continue;
        s += 1;
        if (logsByHabit.get(h.id)?.has(iso)) c += 1;
      }
    }
    months.push({
      label: monthLabel(ref),
      rate: s === 0 ? 0 : Math.round((c / s) * 100),
      done: c,
      scheduled: s,
    });
  }

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-slate-600 text-sm mt-1">
          Trends, patterns, and where to focus next.
        </p>
      </div>

      {/* Top row: best day / weak day / monthly trends */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Best day</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1.5">
            {bestDay.day}
          </p>
          <p className="text-sm text-emerald-700 font-bold mt-1 tabular-nums">{bestDay.rate}% completion</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Weak spot</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1.5">
            {worstDay.day}
          </p>
          <p className="text-sm text-rose-700 font-bold mt-1 tabular-nums">{worstDay.rate}% completion</p>
        </div>
        {months.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{m.label}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1.5 tabular-nums">
              {m.rate}<span className="text-lg text-slate-400 font-semibold">%</span>
            </p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">{m.done} of {m.scheduled} done</p>
          </div>
        )).slice(0, 2)}
      </div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              90-day completion trend
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Daily completion rate across all habits</p>
          </div>
          <CompletionAreaChart data={areaData} />
        </section>

        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Day-of-week pattern
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Which days you show up most</p>
          </div>
          <DayOfWeekChart data={dowData} />
        </section>
      </div>

      {/* Correlations */}
      <div className="mb-6">
        <CorrelationsCard correlations={correlations} />
      </div>

      {/* Top performers & weak spots */}
      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Top performers</h2>
              <p className="text-xs text-slate-500 mt-0.5">Habits you&apos;re crushing</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-emerald-700">
                <path d="M7 14l4-4 4 4 5-5M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <ul className="space-y-2">
            {topPerformers.map((r, i) => {
              const cat = categoryMeta(r.habit.category);
              return (
                <li key={r.habit.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <span className="text-lg font-extrabold text-slate-400 tabular-nums w-5">#{i + 1}</span>
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ring-1 ${cat.bg} ${cat.ring}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
                      <path d={cat.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{r.habit.name}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      🔥 {r.streak}d streak · best {r.best}d
                    </p>
                  </div>
                  <span className="text-emerald-700 font-bold tabular-nums">{r.rate}%</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Weak spots</h2>
              <p className="text-xs text-slate-500 mt-0.5">Could use more attention</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center ring-1 ring-rose-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-rose-700">
                <path d="M12 8v4M12 16h.01M22 12c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2s10 4.5 10 10z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <ul className="space-y-2">
            {weakSpots.map((r) => {
              const cat = categoryMeta(r.habit.category);
              return (
                <li key={r.habit.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ring-1 ${cat.bg} ${cat.ring}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
                      <path d={cat.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{r.habit.name}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {r.logged} of 30 days completed
                    </p>
                  </div>
                  <span className="text-rose-700 font-bold tabular-nums">{r.rate}%</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Full habit table */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">All habits · detail</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sorted by 30-day completion</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50">
              <tr className="text-left">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Habit</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Streak</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Best</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">30d done</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ranked.map((r) => {
                const cat = categoryMeta(r.habit.category);
                return (
                  <tr key={r.habit.id}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center ring-1 ${cat.bg} ${cat.ring}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
                            <path d={cat.icon} />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{r.habit.name}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{r.habit.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">{r.streak}d</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-600 tabular-nums">{r.best}d</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-600 tabular-nums">{r.logged}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="inline-flex items-center gap-2 w-40 justify-end">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              r.rate >= 80 ? "bg-emerald-500" : r.rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${r.rate}%` }}
                          />
                        </div>
                        <span className={`font-bold tabular-nums w-9 text-right ${
                          r.rate >= 80 ? "text-emerald-700" : r.rate >= 50 ? "text-amber-700" : "text-rose-700"
                        }`}>
                          {r.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
