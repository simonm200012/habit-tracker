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
    supabase.from("habits").select("*").order("status").order("created_at"),
    supabase.from("habit_logs").select("habit_id, logged_on").gte("logged_on", isoDate(start)),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const logsByHabit = groupLogs(logsRes.data ?? []);

  const active = habits.filter((h) => h.status === "active");
  const paused = habits.filter((h) => h.status === "paused");
  const archived = habits.filter((h) => h.status === "archived");

  const difficultyChip = (d: string) => {
    const map: Record<string, string> = {
      easy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      medium: "bg-amber-50 text-amber-700 ring-amber-200",
      hard: "bg-rose-50 text-rose-700 ring-rose-200",
    };
    return map[d] ?? map.medium;
  };

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Habits</h1>
          <p className="text-slate-600 text-sm mt-1">
            {active.length} active · {paused.length} paused · {archived.length} archived
          </p>
        </div>
        <HabitForm />
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

      {/* Active habits table */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Active habits</h2>
          <span className="text-xs text-slate-500 font-semibold">{active.length} total</span>
        </div>
        {active.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-sm text-slate-600 font-medium">No active habits.</p>
            <p className="text-xs text-slate-500 mt-1">Click <b>New habit</b> to add your first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-left">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Habit</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Category</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Schedule</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Difficulty</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Streak</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Best</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">30d</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active.map((h) => {
                  const logs = logsByHabit.get(h.id) ?? new Set();
                  const cat = categoryMeta(h.category);
                  const rate = completionRate(h, logs, 30);
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/50 transition group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ring-1 ${cat.bg} ${cat.ring} shrink-0`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
                              <path d={cat.icon} />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{h.name}</p>
                            {h.goal_target > 1 && (
                              <p className="text-xs text-slate-500">
                                {h.goal_target}{h.goal_unit ? " " + h.goal_unit : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${cat.bg} ${cat.color} ring-1 ${cat.ring}`}>
                          {h.category}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-slate-700 font-medium capitalize">{h.frequency}</td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ring-1 ${difficultyChip(h.difficulty)}`}>
                          {h.difficulty}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right font-bold text-slate-900 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500">
                            <path d="M13.5 0c-2.5 5.5-7 7-7 12 0 4 3 7 7 7s7-3 7-7c0-3.5-2.5-5-3.5-9-1 2-1.5 3-3.5 3 0-2 1-4 0-6z" />
                          </svg>
                          {currentStreak(h, logs)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right font-semibold text-slate-600 tabular-nums">{bestStreak(h, logs)}</td>
                      <td className="px-3 py-4 text-right">
                        <span className={`font-bold tabular-nums ${rate >= 80 ? "text-emerald-700" : rate >= 50 ? "text-amber-700" : "text-rose-700"}`}>
                          {rate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                          <form action={setHabitStatus.bind(null, h.id, "paused")}>
                            <button className="px-2 py-1 text-xs font-semibold text-slate-700 rounded-md hover:bg-slate-100" title="Pause">
                              Pause
                            </button>
                          </form>
                          <form action={setHabitStatus.bind(null, h.id, "archived")}>
                            <button className="px-2 py-1 text-xs font-semibold text-slate-700 rounded-md hover:bg-slate-100" title="Archive">
                              Archive
                            </button>
                          </form>
                          <form action={deleteHabit.bind(null, h.id)}>
                            <button className="px-2 py-1 text-xs font-semibold text-rose-600 rounded-md hover:bg-rose-50" title="Delete">
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Paused / archived */}
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
                        <button className="text-xs font-semibold text-slate-700 hover:text-slate-900">Resume</button>
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
                      <button className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
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
