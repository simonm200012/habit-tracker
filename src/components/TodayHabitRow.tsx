"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleHabitToday } from "@/app/actions";
import { categoryMeta } from "@/lib/categories";
import type { Habit } from "@/lib/types";

export function TodayHabitRow({
  habit,
  done,
  streak,
  stackTrigger,
}: {
  habit: Habit;
  done: boolean;
  streak: number;
  stackTrigger?: { name: string; done: boolean } | null;
}) {
  const [, startTransition] = useTransition();
  const [optimisticState, setOptimisticState] = useOptimistic(
    { done, streak },
    (state, next: { done: boolean; streak: number }) => next,
  );

  const cat = categoryMeta(habit.category);

  function handleToggle() {
    const nextDone = !optimisticState.done;
    const nextStreak = nextDone
      ? optimisticState.streak + 1
      : Math.max(0, optimisticState.streak - 1);

    startTransition(async () => {
      setOptimisticState({ done: nextDone, streak: nextStreak });
      try {
        await toggleHabitToday(habit.id);
        if (nextDone) {
          if (nextStreak >= 7 && nextStreak % 7 === 0) {
            toast.success(`${habit.name} — ${nextStreak}-day streak 🔥`);
          } else if (nextStreak === 1) {
            toast.success(`${habit.name} done — streak started`);
          } else {
            toast.success(`${habit.name} done · ${nextStreak}-day streak`);
          }
        } else {
          toast(`${habit.name} unchecked`, { duration: 1500 });
        }
      } catch {
        toast.error("Couldn't save. Please retry.");
      }
    });
  }

  return (
    <li
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition group ${
        optimisticState.done
          ? "bg-emerald-50/50 ring-1 ring-emerald-100"
          : "bg-slate-50/60 hover:bg-slate-100/60 ring-1 ring-transparent"
      }`}
    >
      <button
        onClick={handleToggle}
        aria-label="toggle"
        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition shadow-sm ${
          optimisticState.done
            ? "bg-emerald-600 text-white animate-pop"
            : "bg-white border-2 border-slate-300 hover:border-emerald-500"
        }`}
      >
        {optimisticState.done && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ${cat.bg} ${cat.ring}`}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cat.color}
        >
          <path d={cat.icon} />
        </svg>
      </div>

      <a href={`/habits/${habit.id}`} className="flex-1 min-w-0 group/link">
        <p
          className={`font-semibold tracking-tight truncate group-hover/link:underline ${
            optimisticState.done ? "text-slate-500 line-through" : "text-slate-900"
          }`}
        >
          {habit.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>
            {habit.category}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500 font-medium">
            {habit.goal_target > 1
              ? `${habit.goal_target}${habit.goal_unit ? " " + habit.goal_unit : ""}`
              : habit.frequency}
          </span>
          {stackTrigger && (
            <>
              <span className="text-slate-300">·</span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ring-1 ${
                  stackTrigger.done
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-slate-100 text-slate-600 ring-slate-200"
                }`}
                title={`Stacked after ${stackTrigger.name}`}
              >
                {stackTrigger.done ? "↳ now" : `↳ after ${stackTrigger.name}`}
              </span>
            </>
          )}
        </div>
      </a>

      <div className="flex items-center gap-1.5 text-amber-600">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 0c-2.5 5.5-7 7-7 12 0 4 3 7 7 7s7-3 7-7c0-3.5-2.5-5-3.5-9-1 2-1.5 3-3.5 3 0-2 1-4 0-6z" />
        </svg>
        <span className="text-sm font-bold text-slate-900 tabular-nums">
          {optimisticState.streak}
        </span>
      </div>
    </li>
  );
}
