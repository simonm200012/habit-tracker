import { categoryMeta } from "@/lib/categories";
import { addDays, isoDate, isScheduled } from "@/lib/habits";
import type { Habit } from "@/lib/types";

/** 12-week heatmap (today on the right). Color intensity = completion. */
export function HabitHeatmap({
  habits,
  logsByHabit,
  weeks = 12,
}: {
  habits: Habit[];
  logsByHabit: Map<string, Set<string>>;
  weeks?: number;
}) {
  const today = new Date();
  // Start of grid: start of week (Mon=1)
  const days = weeks * 7;
  const startDate = addDays(today, -(days - 1));
  // Align to Monday: shift back to most recent Monday <= startDate
  const startDow = (startDate.getDay() + 6) % 7; // mon=0..sun=6
  const alignedStart = addDays(startDate, -startDow);

  // Build columns of 7 days each
  const cols: { d: Date; iso: string }[][] = [];
  for (let w = 0; w < weeks + 1; w++) {
    const col: { d: Date; iso: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(alignedStart, w * 7 + i);
      col.push({ d, iso: isoDate(d) });
    }
    cols.push(col);
  }

  function intensity(iso: string, d: Date): { pct: number; sched: number; done: number } {
    let s = 0;
    let c = 0;
    for (const h of habits) {
      if (!isScheduled(h, d)) continue;
      s += 1;
      if (logsByHabit.get(h.id)?.has(iso)) c += 1;
    }
    return { pct: s === 0 ? 0 : c / s, sched: s, done: c };
  }

  function color(pct: number, sched: number, isFuture: boolean): string {
    if (isFuture) return "bg-slate-100/50";
    if (sched === 0) return "bg-slate-100";
    if (pct === 0) return "bg-slate-200";
    if (pct < 0.34) return "bg-emerald-200";
    if (pct < 0.67) return "bg-emerald-400";
    if (pct < 1) return "bg-emerald-500";
    return "bg-emerald-700";
  }

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-fit">
        <div className="flex flex-col gap-1 pr-1 pt-4">
          {dayLabels.map((l, i) => (
            <div key={i} className="h-3.5 text-[10px] font-bold text-slate-500 leading-3.5">
              {l}
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map(({ d, iso }, i) => {
                const isFuture = d > today;
                const { pct, sched, done } = intensity(iso, d);
                return (
                  <div
                    key={i}
                    title={`${iso} — ${done}/${sched}`}
                    className={`w-3.5 h-3.5 rounded-sm ${color(pct, sched, isFuture)} ring-1 ring-inset ring-slate-900/5`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500 font-semibold">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-slate-200 ring-1 ring-inset ring-slate-900/5" />
        <div className="w-3 h-3 rounded-sm bg-emerald-200 ring-1 ring-inset ring-slate-900/5" />
        <div className="w-3 h-3 rounded-sm bg-emerald-400 ring-1 ring-inset ring-slate-900/5" />
        <div className="w-3 h-3 rounded-sm bg-emerald-500 ring-1 ring-inset ring-slate-900/5" />
        <div className="w-3 h-3 rounded-sm bg-emerald-700 ring-1 ring-inset ring-slate-900/5" />
        <span>More</span>
      </div>
    </div>
  );
}

/** Per-habit row of 30-day dots, colored by category. */
export function HabitDotStrip({
  habit,
  logs,
  days = 30,
}: {
  habit: Habit;
  logs: Set<string>;
  days?: number;
}) {
  const cat = categoryMeta(habit.category);
  const today = new Date();
  const cells: { iso: string; sched: boolean; done: boolean; isToday: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const iso = isoDate(d);
    cells.push({
      iso,
      sched: isScheduled(habit, d),
      done: logs.has(iso),
      isToday: i === 0,
    });
  }
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center ring-1 ${cat.bg} ${cat.ring} shrink-0`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
          <path d={cat.icon} />
        </svg>
      </div>
      <span className="text-sm font-semibold text-slate-900 truncate w-32 sm:w-40">{habit.name}</span>
      <div className="flex gap-0.5 flex-1 overflow-hidden">
        {cells.map((c, i) => (
          <div
            key={i}
            title={c.iso}
            className={`flex-1 max-w-[14px] min-w-[6px] h-5 rounded ${
              !c.sched
                ? "bg-slate-100"
                : c.done
                ? "bg-emerald-500"
                : c.isToday
                ? "bg-amber-300 ring-1 ring-amber-500"
                : "bg-slate-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
