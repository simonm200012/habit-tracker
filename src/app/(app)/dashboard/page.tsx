import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/StatCard";
import { TodayHabitRow } from "@/components/TodayHabitRow";
import { WeeklyBarChart } from "@/components/charts/WeeklyBarChart";
import { CompletionAreaChart } from "@/components/charts/CompletionAreaChart";
import { CategoryRadialChart } from "@/components/charts/CategoryRadialChart";
import { InsightCard } from "@/components/InsightCard";
import { AchievementCard } from "@/components/AchievementCard";
import { VacationButton } from "@/components/VacationButton";
import { NotificationManager } from "@/components/NotificationManager";
import { categoryMeta } from "@/lib/categories";
import { evaluateAchievements } from "@/lib/achievements";
import { generateInsights } from "@/lib/insights";
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const startWindow = addDays(today, -89); // 90 days of logs is enough

  const [habitsRes, logsRes, vacRes] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("status", "active")
      .order("display_order", { ascending: true })
      .order("created_at"),
    supabase
      .from("habit_logs")
      .select("habit_id, logged_on")
      .gte("logged_on", isoDate(startWindow)),
    supabase
      .from("vacation_days")
      .select("day")
      .gte("day", isoDate(startWindow)),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const logsByHabit = groupLogs(logsRes.data ?? []);
  const vacationDays = new Set((vacRes.data ?? []).map((r) => r.day as string));
  const todayIso = isoDate(today);
  const isVacationToday = vacationDays.has(todayIso);

  // Smart insights + achievements
  const insights = generateInsights({
    habits,
    logsByHabit,
    vacationDays,
    today,
  });
  const achievements = evaluateAchievements({
    habits,
    logsByHabit,
    vacationDays,
    today,
  });
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const featuredAchievements = achievements.slice(0, 4);

  // Habit stacking: which habit triggers each one
  const triggerForHabit = new Map<string, Habit>();
  for (const h of habits) {
    if (h.linked_to_habit_id) {
      const trigger = habits.find((x) => x.id === h.linked_to_habit_id);
      if (trigger) triggerForHabit.set(h.id, trigger);
    }
  }

  // Today summary
  const todaysHabits = habits.filter((h) => isScheduled(h, today));
  const completedToday = todaysHabits.filter((h) =>
    logsByHabit.get(h.id)?.has(todayIso),
  ).length;
  const todayPct = todaysHabits.length === 0 ? 0 : Math.round((completedToday / todaysHabits.length) * 100);

  // Total active streak (sum) and best streak. Vacation days don't break streaks.
  const totalCurrentStreak = habits.reduce(
    (s, h) => s + currentStreak(h, logsByHabit.get(h.id) ?? new Set(), today, vacationDays),
    0,
  );
  const longestStreak = habits.reduce(
    (m, h) => Math.max(m, bestStreak(h, logsByHabit.get(h.id) ?? new Set())),
    0,
  );

  // 30-day completion rate aggregate
  let scheduled30 = 0;
  let completed30 = 0;
  for (const h of habits) {
    const logs = logsByHabit.get(h.id) ?? new Set();
    for (const iso of dateRange(addDays(today, -29), today)) {
      const d = new Date(iso);
      if (!isScheduled(h, d)) continue;
      scheduled30 += 1;
      if (logs.has(iso)) completed30 += 1;
    }
  }
  const rate30 = scheduled30 === 0 ? 0 : Math.round((completed30 / scheduled30) * 100);

  // Previous 30 days for trend
  let scheduled60 = 0;
  let completed60 = 0;
  for (const h of habits) {
    const logs = logsByHabit.get(h.id) ?? new Set();
    for (const iso of dateRange(addDays(today, -59), addDays(today, -30))) {
      const d = new Date(iso);
      if (!isScheduled(h, d)) continue;
      scheduled60 += 1;
      if (logs.has(iso)) completed60 += 1;
    }
  }
  const ratePrev = scheduled60 === 0 ? 0 : Math.round((completed60 / scheduled60) * 100);
  const trendDelta = rate30 - ratePrev;

  // Weekly bar (last 7 days)
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData = dateRange(addDays(today, -6), today).map((iso) => {
    const d = new Date(iso);
    let s = 0;
    let c = 0;
    for (const h of habits) {
      if (!isScheduled(h, d)) continue;
      s += 1;
      if (logsByHabit.get(h.id)?.has(iso)) c += 1;
    }
    return { day: dayNames[d.getDay()], scheduled: s, completed: c };
  });

  // 30-day completion rate area chart
  const areaData = dateRange(addDays(today, -29), today).map((iso) => {
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

  // Category radial
  const byCategory = new Map<string, { s: number; c: number }>();
  for (const h of habits) {
    const cat = h.category;
    const logs = logsByHabit.get(h.id) ?? new Set();
    const r = byCategory.get(cat) ?? { s: 0, c: 0 };
    for (const iso of dateRange(addDays(today, -29), today)) {
      const d = new Date(iso);
      if (!isScheduled(h, d)) continue;
      r.s += 1;
      if (logs.has(iso)) r.c += 1;
    }
    byCategory.set(cat, r);
  }
  const categoryData = Array.from(byCategory.entries()).map(([name, v]) => ({
    name,
    rate: v.s === 0 ? 0 : Math.round((v.c / v.s) * 100),
    fill: categoryMeta(name).hex,
  }));

  const userName = user.email?.split("@")[0] ?? "there";
  const greet =
    today.getHours() < 12
      ? "Good morning"
      : today.getHours() < 18
      ? "Good afternoon"
      : "Good evening";

  // Build reminders payload for notification manager (only habits with reminder_time set)
  const remindersForNotif = habits
    .filter((h) => h.reminder_time)
    .map((h) => ({
      habitId: h.id,
      habitName: h.name,
      time: h.reminder_time!,
      frequency: h.frequency,
      done: logsByHabit.get(h.id)?.has(todayIso) ?? false,
    }));

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <NotificationManager reminders={remindersForNotif} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {greet}, <span className="text-slate-500">{userName}.</span>
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {today.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VacationButton isoDay={todayIso} initiallyOn={isVacationToday} />
          <div className="px-4 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
              Today
            </p>
            <p className="text-sm font-bold text-slate-900 tabular-nums">
              {completedToday} <span className="text-slate-400">/ {todaysHabits.length}</span>{" "}
              <span className="text-emerald-600">({todayPct}%)</span>
            </p>
          </div>
        </div>
      </div>

      {isVacationToday && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50/80 ring-1 ring-amber-200 flex items-start gap-3">
          <span className="text-2xl">🏝️</span>
          <div>
            <p className="font-bold text-amber-900 text-sm tracking-tight">Skip day active</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Streaks are paused for today — feel free to rest. Click <b>Skip day on</b> above to undo.
            </p>
          </div>
        </div>
      )}

      {/* Smart insights */}
      {insights.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Insights for you
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </div>
        </section>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Today's progress"
          value={`${todayPct}`}
          unit="%"
          hint={`${completedToday} of ${todaysHabits.length} habits`}
          accent="emerald"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <StatCard
          label="Active streaks"
          value={totalCurrentStreak}
          unit="days"
          hint={`across ${habits.length} habits`}
          accent="amber"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5 0c-2.5 5.5-7 7-7 12 0 4 3 7 7 7s7-3 7-7c0-3.5-2.5-5-3.5-9-1 2-1.5 3-3.5 3 0-2 1-4 0-6z" />
            </svg>
          }
        />
        <StatCard
          label="30-day completion"
          value={rate30}
          unit="%"
          hint={`${completed30} done · ${scheduled30 - completed30} missed`}
          trend={{ value: trendDelta, positive: trendDelta >= 0 }}
          accent="sky"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18M7 14l4-4 4 4 5-5" />
            </svg>
          }
        />
        <StatCard
          label="Longest streak"
          value={longestStreak}
          unit="days"
          hint="all time"
          accent="violet"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6-6 6 6M6 15l6 6 6-6" />
            </svg>
          }
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today's habits */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Today&apos;s habits
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Check off as you go — every tick builds the streak.
              </p>
            </div>
            <a
              href="/habits"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
            >
              Manage habits →
            </a>
          </div>
          {todaysHabits.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm text-slate-600 font-medium">No habits scheduled for today.</p>
              <p className="text-xs text-slate-500 mt-1">Add one from the Habits page.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {todaysHabits.map((h) => {
                const trigger = triggerForHabit.get(h.id);
                const triggerDone = trigger
                  ? logsByHabit.get(trigger.id)?.has(todayIso) ?? false
                  : false;
                return (
                  <TodayHabitRow
                    key={h.id}
                    habit={h}
                    done={logsByHabit.get(h.id)?.has(todayIso) ?? false}
                    streak={currentStreak(h, logsByHabit.get(h.id) ?? new Set(), today, vacationDays)}
                    stackTrigger={trigger ? { name: trigger.name, done: triggerDone } : null}
                  />
                );
              })}
            </ul>
          )}
        </section>

        {/* Weekly bar */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              This week
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Completed vs scheduled</p>
          </div>
          <WeeklyBarChart data={weeklyData} />
        </section>

        {/* Completion trend (area, 30 days) */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Completion trend
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Last 30 days</p>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md tabular-nums ${
                trendDelta >= 0
                  ? "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200"
                  : "text-rose-700 bg-rose-50 ring-1 ring-rose-200"
              }`}
            >
              {trendDelta >= 0 ? "↑" : "↓"} {Math.abs(trendDelta)}% vs prior 30
            </span>
          </div>
          <CompletionAreaChart data={areaData} />
        </section>

        {/* Category breakdown */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              By category
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">30-day completion</p>
          </div>
          {categoryData.length > 0 ? (
            <>
              <CategoryRadialChart data={categoryData} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {categoryData.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.fill }} />
                    <span className="text-slate-700 font-semibold">{c.name}</span>
                    <span className="ml-auto text-slate-900 font-bold tabular-nums">{c.rate}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 italic text-center py-12">
              No data yet.
            </p>
          )}
        </section>

        {/* Featured achievements */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Achievements
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {unlockedCount} of {achievements.length} unlocked
              </p>
            </div>
            <Link
              href="/achievements"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {featuredAchievements.map((a) => (
              <AchievementCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
