"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateHabit, setHabitStatus, deleteHabit } from "@/app/actions";
import { CATEGORIES } from "@/lib/categories";
import type { Habit } from "@/lib/types";

export function HabitEditForm({ habit }: { habit: Habit }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  return (
    <form
      action={(fd) => {
        setSaving(true);
        startTransition(async () => {
          try {
            await updateHabit(habit.id, fd);
            toast.success("Habit updated");
          } catch {
            toast.error("Couldn't update");
          } finally {
            setSaving(false);
          }
        });
      }}
      className="space-y-5"
    >
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
          Name
        </label>
        <input
          name="name"
          required
          defaultValue={habit.name}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
          Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <label
              key={c.name}
              className={`flex items-center gap-1.5 px-2 py-2 rounded-lg ring-1 cursor-pointer transition ${c.bg} ${c.ring} hover:ring-2 has-checked:ring-2 has-checked:ring-offset-1`}
            >
              <input
                type="radio"
                name="category"
                value={c.name}
                defaultChecked={c.name === habit.category}
                className="sr-only"
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={c.color}>
                <path d={c.icon} />
              </svg>
              <span className={`text-xs font-semibold ${c.color}`}>{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
            Frequency
          </label>
          <select
            name="frequency"
            defaultValue={habit.frequency}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
          >
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
            Difficulty
          </label>
          <select
            name="difficulty"
            defaultValue={habit.difficulty}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
            Target
          </label>
          <input
            name="goal_target"
            type="number"
            min={1}
            defaultValue={habit.goal_target}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
            Unit
          </label>
          <input
            name="goal_unit"
            defaultValue={habit.goal_unit}
            placeholder="min, pages…"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
            Reminder
          </label>
          <input
            name="reminder_time"
            type="time"
            defaultValue={habit.reminder_time ?? ""}
            className="w-full px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
          Target per week
        </label>
        <input
          name="target_per_week"
          type="number"
          min={1}
          max={7}
          defaultValue={habit.target_per_week}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition tabular-nums"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {habit.status === "active" ? (
          <button
            type="button"
            onClick={() => {
              startTransition(async () => {
                await setHabitStatus(habit.id, "paused");
                toast(`${habit.name} paused`);
              });
            }}
            className="px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              startTransition(async () => {
                await setHabitStatus(habit.id, "active");
                toast.success(`${habit.name} resumed`);
              });
            }}
            className="px-3 py-2 text-sm font-semibold text-emerald-700 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
          >
            Resume
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            startTransition(async () => {
              await setHabitStatus(habit.id, "archived");
              toast(`${habit.name} archived`);
            });
          }}
          className="px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          Archive
        </button>
        <button
          type="button"
          onClick={() => {
            if (!confirm(`Delete "${habit.name}" and all its history? This can't be undone.`)) return;
            startTransition(async () => {
              await deleteHabit(habit.id);
              toast.success("Habit deleted");
              router.push("/habits");
            });
          }}
          className="ml-auto px-3 py-2 text-sm font-semibold text-rose-700 rounded-lg border border-rose-200 hover:bg-rose-50"
        >
          Delete
        </button>
      </div>
    </form>
  );
}
