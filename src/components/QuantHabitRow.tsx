"use client";

import { useOptimistic, useState, useTransition } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { setHabitValue } from "@/app/actions";
import { categoryMeta } from "@/lib/categories";
import type { Habit } from "@/lib/types";

function fireConfetti() {
  const defaults = {
    spread: 75,
    startVelocity: 35,
    decay: 0.92,
    scalar: 0.9,
    ticks: 120,
    origin: { y: 0.55 },
    colors: ["#10b981", "#0ea5e9", "#f59e0b", "#e11d48", "#7c3aed"],
  };
  confetti({ ...defaults, particleCount: 50, angle: 90 });
  confetti({ ...defaults, particleCount: 30, angle: 60, origin: { x: 0.1, y: 0.6 } });
  confetti({ ...defaults, particleCount: 30, angle: 120, origin: { x: 0.9, y: 0.6 } });
}

export function QuantHabitRow({
  habit,
  todayValue,
  isoDay,
  streak,
  stackTrigger,
}: {
  habit: Habit;
  todayValue: number | null;
  isoDay: string;
  streak: number;
  stackTrigger?: { name: string; done: boolean } | null;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic<
    { value: number | null; streak: number },
    { value: number | null; streak: number }
  >({ value: todayValue, streak }, (_, next) => next);
  const [input, setInput] = useState<string>(todayValue?.toString() ?? "");

  const target = habit.goal_target || 1;
  const reached = (optimistic.value ?? 0) >= target;
  const cat = categoryMeta(habit.category);
  const pct = Math.min(100, Math.round(((optimistic.value ?? 0) / target) * 100));

  function commit(val: number | null) {
    const prevDone = (optimistic.value ?? 0) > 0;
    const nextDone = (val ?? 0) > 0;
    let nextStreak = optimistic.streak;
    if (!prevDone && nextDone) nextStreak += 1;
    else if (prevDone && !nextDone) nextStreak = Math.max(0, nextStreak - 1);

    startTransition(async () => {
      setOptimistic({ value: val, streak: nextStreak });
      try {
        await setHabitValue(habit.id, isoDay, val);
        if (nextDone) {
          const milestones = [7, 14, 30, 60, 100, 200, 365];
          if (milestones.includes(nextStreak)) {
            fireConfetti();
            toast.success(`🎉 ${habit.name} — ${nextStreak}-day streak!`);
          } else if (val !== null && val >= target) {
            toast.success(`${habit.name}: ${val}${habit.goal_unit ? " " + habit.goal_unit : ""} · goal hit`);
          } else if (val !== null) {
            toast.success(`${habit.name}: ${val}${habit.goal_unit ? " " + habit.goal_unit : ""} logged`);
          }
        } else {
          toast(`${habit.name} cleared`);
        }
      } catch {
        toast.error("Couldn't save. Please retry.");
      }
    });
  }

  function inc(by: number) {
    const next = (optimistic.value ?? 0) + by;
    setInput(String(next));
    commit(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = input.trim() === "" ? null : Number(input);
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      toast.error("Enter a non-negative number");
      return;
    }
    commit(parsed);
  }

  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition group ${
        reached
          ? "bg-emerald-50/50 ring-1 ring-emerald-100"
          : (optimistic.value ?? 0) > 0
          ? "bg-amber-50/40 ring-1 ring-amber-100"
          : "bg-slate-50/60 hover:bg-slate-100/60 ring-1 ring-transparent"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ${cat.bg} ${cat.ring} shrink-0`}
      >
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
            reached ? "text-slate-700" : "text-slate-900"
          }`}
        >
          {habit.name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-1.5 flex-1 max-w-[120px] bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                reached ? "bg-emerald-500" : "bg-slate-700"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 tabular-nums">
            <span className="text-slate-900">{optimistic.value ?? 0}</span>
            <span className="text-slate-400"> / {target} {habit.goal_unit}</span>
          </span>
        </div>
      </a>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => inc(-Math.max(1, Math.round(target / 10)))}
          className="w-7 h-7 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition"
          aria-label="decrement"
          title="−"
        >
          −
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={handleSubmit}
          inputMode="numeric"
          pattern="[0-9.]*"
          className="w-14 px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-900 text-center font-bold text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
        />
        <button
          type="button"
          onClick={() => inc(Math.max(1, Math.round(target / 10)))}
          className="w-7 h-7 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition"
          aria-label="increment"
          title="+"
        >
          +
        </button>
      </form>

      <div className="flex items-center gap-1.5 text-amber-600 ml-1 shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 0c-2.5 5.5-7 7-7 12 0 4 3 7 7 7s7-3 7-7c0-3.5-2.5-5-3.5-9-1 2-1.5 3-3.5 3 0-2 1-4 0-6z" />
        </svg>
        <span className="text-sm font-bold text-slate-900 tabular-nums">{optimistic.streak}</span>
      </div>

      {stackTrigger?.done && (
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ml-2 shrink-0"
          title={`Stacked after ${stackTrigger.name}`}
        >
          ↳ now
        </span>
      )}
    </li>
  );
}
