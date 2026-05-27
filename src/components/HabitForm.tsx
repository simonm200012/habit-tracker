"use client";

import { useState } from "react";
import { addHabit } from "@/app/actions";
import { CATEGORIES } from "@/lib/categories";

export function HabitForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm shadow-sm transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New habit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md ring-1 ring-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Create a new habit
          </h3>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-slate-700 transition"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        <form
          action={async (fd) => {
            await addHabit(fd);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
              Name
            </label>
            <input
              name="name"
              required
              placeholder="e.g. Morning run"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c, i) => (
                <label
                  key={c.name}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-lg ring-1 cursor-pointer transition ${c.bg} ${c.ring} hover:ring-2 has-checked:ring-2 has-checked:ring-offset-1`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.name}
                    defaultChecked={i === 0}
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
                defaultValue="daily"
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
                defaultValue="medium"
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
                defaultValue={1}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                Unit
              </label>
              <input
                name="goal_unit"
                placeholder="min, pages…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                Reminder
              </label>
              <input
                name="reminder_time"
                type="time"
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
              defaultValue={7}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition tabular-nums"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-sm border border-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-sm shadow-sm transition"
            >
              Create habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
