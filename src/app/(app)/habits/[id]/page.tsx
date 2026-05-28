import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoryMeta } from "@/lib/categories";
import {
  addDays,
  bestStreak,
  completionRate,
  currentStreak,
  dateRange,
  isScheduled,
  isoDate,
} from "@/lib/habits";
import { HabitEditForm } from "@/components/HabitEditForm";
import { HabitStreakChart } from "@/components/charts/HabitStreakChart";
import { HabitValueBarChart } from "@/components/charts/HabitValueBarChart";
import { HabitDotStrip } from "@/components/HabitHeatmap";
import { StreakShareButton } from "@/components/StreakShareButton";
import type { Habit } from "@/lib/types";

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const start = addDays(today, -89);
  const [habitRes, logsRes, otherHabitsRes] = await Promise.all([
    supabase.from("habits").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("habit_logs")
      .select("logged_on, value")
      .eq("habit_id", id)
      .gte("logged_on", isoDate(start)),
    supabase
      .from("habits")
      .select("*")
      .neq("id", id)
      .eq("status", "active")
      .order("display_order"),
  ]);

  const habit = habitRes.data as Habit | null;
  if (!habit) notFound();
  const stackCandidates = (otherHabitsRes.data ?? []) as Habit[];

  const rawLogs = (logsRes.data ?? []) as { logged_on: string; value: number | null }[];
  const logs = new Set(rawLogs.map((r) => r.logged_on));
  const valueByDay = new Map<string, number>();
  for (const r of rawLogs) {
    if (r.value !== null) valueByDay.set(r.logged_on, Number(r.value));
  }
  const isQuant = (habit.goal_unit ?? "").trim() !== "" && habit.goal_target > 1;
  const cat = categoryMeta(habit.category);

  const streak = currentStreak(habit, logs);
  const best = bestStreak(habit, logs);
  const rate30 = completionRate(habit, logs, 30);
  const rate90 = completionRate(habit, logs, 90);
  // Streak milestone predictions
  const { predictMilestones, summarizeNextMilestone } = await import("@/lib/predictions");
  const predictions = predictMilestones(habit, streak, today);

  // Rolling 7-day rate over last 90 days (smoother chart line)
  const chartData = dateRange(addDays(today, -89), today).map((iso) => {
    const d = new Date(iso);
    // average of trailing 7-day window
    let s = 0;
    let c = 0;
    for (let i = 0; i < 7; i++) {
      const dd = addDays(d, -i);
      if (!isScheduled(habit, dd)) continue;
      s += 1;
      if (logs.has(isoDate(dd))) c += 1;
    }
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      rate: s === 0 ? 0 : Math.round((c / s) * 100),
    };
  });

  // Last 30 days check-off list
  const recent: { iso: string; done: boolean; scheduled: boolean }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i);
    const iso = isoDate(d);
    recent.push({
      iso,
      done: logs.has(iso),
      scheduled: isScheduled(habit, d),
    });
  }

  // Quant value bar data for last 30 days
  const valueData = isQuant
    ? Array.from({ length: 30 }).map((_, i) => {
        const d = addDays(today, -(29 - i));
        const iso = isoDate(d);
        const v = valueByDay.get(iso) ?? 0;
        return {
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          value: v,
          reached: v >= habit.goal_target,
        };
      })
    : [];
  const valueAvg = isQuant && valueData.length > 0
    ? Math.round(
        (valueData.reduce((s, x) => s + x.value, 0) / valueData.filter((x) => x.value > 0).length || 0) || 0,
      )
    : 0;
  const valueTotal = isQuant ? valueData.reduce((s, x) => s + x.value, 0) : 0;

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <Link
        href="/habits"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-4 transition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        All habits
      </Link>

      <div className="flex items-start gap-4 mb-7">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ring-1 ${cat.bg} ${cat.ring} shrink-0`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
            <path d={cat.icon} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>{habit.category}</span>
            <span className="text-slate-300">·</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {habit.frequency} · {habit.difficulty}
            </span>
            {habit.status !== "active" && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                {habit.status}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{habit.name}</h1>
          {habit.goal_target > 1 && (
            <p className="text-sm text-slate-600 mt-1">
              Goal: <b className="text-slate-900">{habit.goal_target}{habit.goal_unit ? " " + habit.goal_unit : ""}</b> · {habit.target_per_week}×/week
            </p>
          )}
        </div>
        {streak > 0 && (
          <StreakShareButton
            habitName={habit.name}
            category={habit.category}
            streak={streak}
            best={best}
            rate30={rate30}
            rate90={rate90}
          />
        )}
      </div>

      {/* Predictions */}
      {predictions.length > 0 && streak > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            If you keep going
          </p>
          <p className="text-base font-semibold text-white mb-3">
            {summarizeNextMilestone(predictions[0])}
          </p>
          <div className="flex flex-wrap gap-2">
            {predictions.slice(1).map((p) => (
              <div
                key={p.milestone}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold text-white tabular-nums"
              >
                {p.milestone}d ·{" "}
                {p.date.toLocaleDateString("en", { month: "short", day: "numeric" })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Current streak</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1.5 tabular-nums">
            <span className="text-amber-600 mr-1">🔥</span>{streak}
            <span className="text-lg text-slate-400 font-semibold ml-1">days</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Best streak</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1.5 tabular-nums">
            {best}<span className="text-lg text-slate-400 font-semibold ml-1">days</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">30-day rate</p>
          <p className={`text-3xl font-bold tracking-tight mt-1.5 tabular-nums ${rate30 >= 80 ? "text-emerald-700" : rate30 >= 50 ? "text-amber-700" : "text-rose-700"}`}>
            {rate30}<span className="text-lg text-slate-400 font-semibold">%</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">90-day rate</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1.5 tabular-nums">
            {rate90}<span className="text-lg text-slate-400 font-semibold">%</span>
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Trend chart */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">90-day trend</h2>
            <p className="text-xs text-slate-500 mt-0.5">Rolling 7-day completion rate</p>
          </div>
          <HabitStreakChart data={chartData} color={cat.hex} />
        </section>

        {/* Edit form */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
          <h2 className="text-base font-bold text-slate-900 tracking-tight mb-5">Settings</h2>
          <HabitEditForm habit={habit} stackCandidates={stackCandidates} />
        </section>

        {/* Quantitative value chart */}
        {isQuant && (
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-3">
            <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {habit.goal_unit || "Values"} · last 30 days
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Goal {habit.goal_target} {habit.goal_unit} per day · green = goal reached
                </p>
              </div>
              <div className="flex gap-4 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Total</p>
                  <p className="text-lg font-bold text-slate-900 tabular-nums">
                    {valueTotal}<span className="text-xs text-slate-400 font-semibold ml-1">{habit.goal_unit}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Avg / logged day</p>
                  <p className="text-lg font-bold text-slate-900 tabular-nums">
                    {valueAvg}<span className="text-xs text-slate-400 font-semibold ml-1">{habit.goal_unit}</span>
                  </p>
                </div>
              </div>
            </div>
            <HabitValueBarChart
              data={valueData}
              target={habit.goal_target}
              color={cat.hex}
              unit={habit.goal_unit ?? ""}
            />
          </section>
        )}

        {/* 30 day strip */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-3">
          <h2 className="text-base font-bold text-slate-900 tracking-tight mb-4">Last 30 days</h2>
          <HabitDotStrip habit={habit} logs={logs} />

          <div className="grid grid-cols-7 sm:grid-cols-10 gap-2 mt-5">
            {recent.map((r) => {
              const d = new Date(r.iso);
              return (
                <div
                  key={r.iso}
                  className={`text-center py-2 rounded-lg text-xs ${
                    !r.scheduled
                      ? "bg-slate-50 text-slate-400"
                      : r.done
                      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                  }`}
                  title={r.iso}
                >
                  <div className="font-bold tabular-nums">{d.getDate()}</div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
                    {d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
