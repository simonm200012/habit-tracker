import { createClient } from "@/lib/supabase/server";
import { categoryMeta, CATEGORIES } from "@/lib/categories";
import {
  bestStreak,
  completionRate,
  currentStreak,
  groupLogs,
  isoDate,
  addDays,
} from "@/lib/habits";
import { HabitForm } from "@/components/HabitForm";
import { HabitsFilterShell } from "@/components/HabitsFilterShell";
import { TemplatePicker } from "@/components/TemplatePicker";
import { ExportButton } from "@/components/ExportButton";
import { setHabitStatus, deleteHabit } from "@/app/actions";
import type { Habit } from "@/lib/types";

export default async function HabitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const start = addDays(today, -89);
  const [habitsRes, logsRes] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .order("status")
      .order("display_order", { ascending: true })
      .order("created_at"),
    supabase
      .from("habit_logs")
      .select("habit_id, logged_on")
      .gte("logged_on", isoDate(start)),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const logsByHabit = groupLogs(logsRes.data ?? []);

  const active = habits.filter((h) => h.status === "active");
  const paused = habits.filter((h) => h.status === "paused");
  const archived = habits.filter((h) => h.status === "archived");

  const activeRows = active.map((h) => {
    const logs = logsByHabit.get(h.id) ?? new Set();
    return {
      habit: h,
      streak: currentStreak(h, logs),
      best: bestStreak(h, logs),
      rate30: completionRate(h, logs, 30),
    };
  });

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Habits</h1>
          <p className="text-slate-600 text-sm mt-1">
            {active.length} active · {paused.length} paused · {archived.length} archived
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton />
          <TemplatePicker />
          <HabitForm />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => {
          const count = habits.filter((h) => h.category === c.name && h.status === "active").length;
          return (
            <div
              key={c.name}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${c.bg} ring-1 ${c.ring}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={c.color}>
                <path d={c.icon} />
              </svg>
              <span className={`text-xs font-bold ${c.color}`}>{c.name}</span>
              <span className="text-xs font-bold text-slate-700 tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Active habits</h2>
            <p className="text-xs text-slate-500 mt-0.5">Drag the handle to reorder · search and filter below</p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">{active.length} total</span>
        </div>
        <HabitsFilterShell rows={activeRows} />
      </section>

      {(paused.length > 0 || archived.length > 0) && (
        <section className="mt-6 grid lg:grid-cols-2 gap-5">
          {paused.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-3">Paused</h3>
              <ul className="space-y-2">
                {paused.map((h) => {
                  const cat = categoryMeta(h.category);
                  return (
                    <li key={h.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center ring-1 ${cat.bg} ${cat.ring}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
                          <path d={cat.icon} />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-700 flex-1">{h.name}</span>
                      <form action={setHabitStatus.bind(null, h.id, "active")}>
                        <button className="text-xs font-semibold text-slate-700 hover:text-slate-900">
                          Resume
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {archived.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-3">Archived</h3>
              <ul className="space-y-2">
                {archived.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50/60 opacity-70">
                    <span className="font-medium text-slate-600 flex-1 line-through">{h.name}</span>
                    <form action={deleteHabit.bind(null, h.id)}>
                      <button className="text-xs font-semibold text-rose-600 hover:text-rose-700">
                        Delete
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
