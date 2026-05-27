import { toggleHabitToday } from "@/app/actions";
import { categoryMeta } from "@/lib/categories";
import type { Habit } from "@/lib/types";

export function TodayHabitRow({
  habit,
  done,
  streak,
}: {
  habit: Habit;
  done: boolean;
  streak: number;
}) {
  const cat = categoryMeta(habit.category);
  return (
    <li
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition group ${
        done
          ? "bg-emerald-50/50 ring-1 ring-emerald-100"
          : "bg-slate-50/60 hover:bg-slate-100/60 ring-1 ring-transparent"
      }`}
    >
      <form action={toggleHabitToday.bind(null, habit.id)}>
        <button
          aria-label="toggle"
          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition shadow-sm ${
            done
              ? "bg-emerald-600 text-white"
              : "bg-white border-2 border-slate-300 hover:border-emerald-500"
          }`}
        >
          {done && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      </form>

      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ${cat.bg} ${cat.ring}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={cat.color}>
          <path d={cat.icon} />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold tracking-tight truncate ${done ? "text-slate-500 line-through" : "text-slate-900"}`}>
          {habit.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>
            {habit.category}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500 font-medium">
            {habit.goal_target > 1 ? `${habit.goal_target}${habit.goal_unit ? " " + habit.goal_unit : ""}` : habit.frequency}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-amber-600">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 0c-2.5 5.5-7 7-7 12 0 4 3 7 7 7s7-3 7-7c0-3.5-2.5-5-3.5-9-1 2-1.5 3-3.5 3 0-2 1-4 0-6z" />
        </svg>
        <span className="text-sm font-bold text-slate-900 tabular-nums">{streak}</span>
      </div>
    </li>
  );
}
