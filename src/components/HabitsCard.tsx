import { addHabit, toggleHabitToday, deleteHabit } from "@/app/actions";
import type { Habit } from "@/lib/types";

export function HabitsCard({
  habits,
  doneToday,
}: {
  habits: Habit[];
  doneToday: Set<string>;
}) {
  const completed = habits.filter((h) => doneToday.has(h.id)).length;
  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Habits</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {habits.length > 0
              ? `${completed} of ${habits.length} done today`
              : "Build your daily routine"}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
          <svg
            className="w-5 h-5 text-emerald-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      </div>

      <ul className="space-y-2 mb-4">
        {habits.length === 0 && (
          <li className="text-sm text-slate-500 italic text-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No habits yet — add one below.
          </li>
        )}
        {habits.map((h) => {
          const done = doneToday.has(h.id);
          return (
            <li
              key={h.id}
              className={`flex items-center justify-between p-3 rounded-xl transition group ${
                done
                  ? "bg-emerald-50/60 ring-1 ring-emerald-100"
                  : "bg-slate-50 hover:bg-slate-100/80 ring-1 ring-transparent"
              }`}
            >
              <form
                action={toggleHabitToday.bind(null, h.id)}
                className="flex items-center gap-3 flex-1"
              >
                <button
                  type="submit"
                  aria-label="toggle"
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition shrink-0 ${
                    done
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white border-2 border-slate-300 hover:border-emerald-500"
                  }`}
                >
                  {done && (
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
                <span
                  className={`font-medium ${
                    done
                      ? "line-through text-slate-500"
                      : "text-slate-900"
                  }`}
                >
                  {h.name}
                </span>
                <span className="text-xs font-medium text-slate-500 ml-auto bg-white px-2 py-0.5 rounded-md ring-1 ring-slate-200">
                  {h.target_per_week}×/wk
                </span>
              </form>
              <form action={deleteHabit.bind(null, h.id)} className="ml-2">
                <button
                  type="submit"
                  className="text-slate-300 hover:text-rose-600 transition text-sm opacity-0 group-hover:opacity-100"
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
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm transition"
        />
        <input
          name="target_per_week"
          type="number"
          min={1}
          max={7}
          defaultValue={7}
          className="w-16 px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm transition"
        />
        <button className="px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition">
          Add
        </button>
      </form>
    </section>
  );
}
