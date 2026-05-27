"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setHabitStack } from "@/app/actions";
import type { Habit } from "@/lib/types";

export function HabitStackPicker({
  habit,
  candidates,
}: {
  habit: Habit;
  /** All other habits that could be the trigger. */
  candidates: Habit[];
}) {
  const [, startTransition] = useTransition();

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
        Stack after another habit
      </label>
      <select
        defaultValue={habit.linked_to_habit_id ?? ""}
        onChange={(e) => {
          const v = e.target.value || null;
          startTransition(async () => {
            try {
              await setHabitStack(habit.id, v);
              if (v) {
                const trigger = candidates.find((c) => c.id === v);
                toast.success(`${habit.name} now stacks after ${trigger?.name}`);
              } else {
                toast(`${habit.name} unlinked`);
              }
            } catch {
              toast.error("Couldn't save");
            }
          });
        }}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
      >
        <option value="">— No stack —</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            After: {c.name}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
        When the trigger habit is checked off, this one is highlighted next.
      </p>
    </div>
  );
}
