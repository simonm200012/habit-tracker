import { addHabit, toggleHabitToday, deleteHabit } from "@/app/actions";
import type { Habit } from "@/lib/types";

export function HabitsCard({
  habits,
  doneToday,
}: {
  habits: Habit[];
  doneToday: Set<string>;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
      <h2 className="text-lg font-semibold mb-4">Habits</h2>

      <ul className="space-y-2 mb-4">
        {habits.length === 0 && (
          <li className="text-sm text-neutral-500 italic">No habits yet — add one below.</li>
        )}
        {habits.map((h) => {
          const done = doneToday.has(h.id);
          return (
            <li
              key={h.id}
              className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition"
            >
              <form action={toggleHabitToday.bind(null, h.id)} className="flex items-center gap-3 flex-1">
                <button
                  type="submit"
                  aria-label="toggle"
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
                    done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-neutral-300 hover:border-emerald-400"
                  }`}
                >
                  {done && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <span className={`font-medium ${done ? "line-through text-neutral-400" : ""}`}>
                  {h.name}
                </span>
                <span className="text-xs text-neutral-400 ml-auto">
                  {h.target_per_week}×/week
                </span>
              </form>
              <form action={deleteHabit.bind(null, h.id)} className="ml-3">
                <button
                  type="submit"
                  className="text-neutral-300 hover:text-red-500 transition text-sm"
                  aria-label="delete"
                >
                  ✕
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      <form action={addHabit} className="flex gap-2">
        <input
          name="name"
          placeholder="New habit (e.g. Gym, Read)"
          required
          className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />
        <input
          name="target_per_week"
          type="number"
          min={1}
          max={7}
          defaultValue={7}
          className="w-16 px-2 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />
        <button className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
          Add
        </button>
      </form>
    </section>
  );
}
