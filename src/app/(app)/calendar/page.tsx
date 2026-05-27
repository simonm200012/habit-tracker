import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  dateRange,
  groupLogs,
  isScheduled,
  isoDate,
} from "@/lib/habits";
import { HabitHeatmap, HabitDotStrip } from "@/components/HabitHeatmap";
import { DailyJournal } from "@/components/DailyJournal";
import type { Habit } from "@/lib/types";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const startWindow = addDays(today, -120);

  const todayIso = isoDate(today);
  const [habitsRes, logsRes, noteRes] = await Promise.all([
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
      .from("daily_notes")
      .select("content")
      .eq("note_on", todayIso)
      .maybeSingle(),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const logsByHabit = groupLogs(logsRes.data ?? []);
  const todayNote = (noteRes.data?.content as string | undefined) ?? "";

  // Monthly grid for current month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const padStart = (monthStart.getDay() + 6) % 7; // Mon=0
  const totalCells = Math.ceil((padStart + monthEnd.getDate()) / 7) * 7;

  type Cell = { d: Date | null; iso: string | null; pct: number; done: number; sched: number; isToday: boolean };
  const cells: Cell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - padStart + 1;
    if (dayNum < 1 || dayNum > monthEnd.getDate()) {
      cells.push({ d: null, iso: null, pct: 0, done: 0, sched: 0, isToday: false });
      continue;
    }
    const d = new Date(today.getFullYear(), today.getMonth(), dayNum);
    const iso = isoDate(d);
    let s = 0;
    let c = 0;
    for (const h of habits) {
      if (!isScheduled(h, d)) continue;
      s += 1;
      if (logsByHabit.get(h.id)?.has(iso)) c += 1;
    }
    cells.push({
      d,
      iso,
      pct: s === 0 ? 0 : c / s,
      done: c,
      sched: s,
      isToday: iso === isoDate(today),
    });
  }

  function cellColor(c: Cell): string {
    if (!c.d) return "bg-transparent";
    if (c.d > today) return "bg-slate-50 text-slate-400";
    if (c.sched === 0) return "bg-slate-50 text-slate-500";
    if (c.pct === 0) return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    if (c.pct < 0.5) return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    if (c.pct < 1) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    return "bg-emerald-600 text-white ring-1 ring-emerald-700";
  }

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Calendar</h1>
        <p className="text-slate-600 text-sm mt-1">
          A visual history of your habit completion.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Monthly grid */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {today.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Daily completion rate</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-emerald-600" /> All
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-emerald-50 ring-1 ring-emerald-200" /> Most
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-amber-50 ring-1 ring-amber-200" /> Half
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-rose-50 ring-1 ring-rose-200" /> None
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((c, i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-semibold transition relative ${cellColor(c)} ${
                  c.isToday ? "ring-2 ring-slate-900" : ""
                }`}
                title={c.iso ? `${c.iso} — ${c.done}/${c.sched}` : ""}
              >
                {c.d && (
                  <>
                    <span className={`tabular-nums ${c.isToday ? "font-extrabold" : ""}`}>
                      {c.d.getDate()}
                    </span>
                    {c.sched > 0 && c.d <= today && (
                      <span className="text-[9px] font-bold tabular-nums opacity-80 -mt-0.5">
                        {c.done}/{c.sched}
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 12-week heatmap */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-1">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              12-week heatmap
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">All habits combined</p>
          </div>
          <HabitHeatmap habits={habits} logsByHabit={logsByHabit} weeks={12} />
        </section>

        {/* Daily journal */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-3">
          <DailyJournal isoDay={todayIso} initial={todayNote} />
        </section>

        {/* Per-habit strips */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-3">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Per habit · last 30 days
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Green = done · Gray = missed · Amber = today
            </p>
          </div>
          <div className="space-y-3">
            {habits.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No habits yet.</p>
            ) : (
              habits.map((h) => (
                <HabitDotStrip
                  key={h.id}
                  habit={h}
                  logs={logsByHabit.get(h.id) ?? new Set()}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
