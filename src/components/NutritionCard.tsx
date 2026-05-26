import { addFood, deleteFood } from "@/app/actions";
import { ProgressBar } from "./ProgressRing";
import type { FoodLog, Profile } from "@/lib/types";

export function NutritionCard({
  foods,
  profile,
}: {
  foods: FoodLog[];
  profile: Profile;
}) {
  const totals = foods.reduce(
    (acc, f) => {
      acc.calories += f.calories;
      acc.protein += Number(f.protein_g);
      acc.fiber += Number(f.fiber_g);
      acc.carbs += Number(f.carbs_g);
      acc.fat += Number(f.fat_g);
      return acc;
    },
    { calories: 0, protein: 0, fiber: 0, carbs: 0, fat: 0 },
  );

  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Nutrition</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {foods.length} {foods.length === 1 ? "entry" : "entries"} logged today
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center ring-1 ring-amber-100">
          <svg
            className="w-5 h-5 text-amber-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 13a6 6 0 0 1 12 0v7H6v-7z" />
            <path d="M12 7V3M9 5l3-2 3 2" />
          </svg>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-5 mb-6">
        <ProgressBar
          value={totals.calories}
          goal={profile.daily_calorie_goal}
          label="Calories"
          unit="kcal"
          color="from-orange-500 to-amber-500"
        />
        <ProgressBar
          value={totals.protein}
          goal={profile.daily_protein_goal_g}
          label="Protein"
          unit="g"
          color="from-rose-500 to-rose-600"
        />
        <ProgressBar
          value={totals.fiber}
          goal={profile.daily_fiber_goal_g}
          label="Fiber"
          unit="g"
          color="from-amber-500 to-yellow-500"
        />
      </div>

      <div className="flex gap-4 mb-5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-slate-600">Carbs</span>
          <b className="text-slate-900 font-semibold tabular-nums">{totals.carbs.toFixed(0)}g</b>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-fuchsia-500" />
          <span className="text-slate-600">Fat</span>
          <b className="text-slate-900 font-semibold tabular-nums">{totals.fat.toFixed(0)}g</b>
        </div>
      </div>

      <form action={addFood} className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4">
        <input
          name="name"
          placeholder="Food name"
          required
          className="col-span-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm transition"
        />
        <input
          name="calories"
          type="number"
          min={0}
          placeholder="kcal"
          className="px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm transition"
        />
        <input
          name="protein_g"
          type="number"
          min={0}
          step="0.1"
          placeholder="protein"
          className="px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm transition"
        />
        <input
          name="fiber_g"
          type="number"
          min={0}
          step="0.1"
          placeholder="fiber"
          className="px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm transition"
        />
        <button className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition">
          Add
        </button>
      </form>

      <ul className="space-y-1 max-h-56 overflow-y-auto -mx-2">
        {foods.length === 0 && (
          <li className="text-sm text-slate-500 italic text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 mx-2">
            No food logged today.
          </li>
        )}
        {foods.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between text-sm py-2 px-3 rounded-lg hover:bg-slate-50 transition group mx-2"
          >
            <span className="font-semibold text-slate-900">{f.name}</span>
            <span className="text-slate-600 text-xs flex items-center gap-3 tabular-nums font-medium">
              <span>{f.calories} kcal</span>
              <span className="text-rose-600">{Number(f.protein_g).toFixed(0)}p</span>
              <span className="text-amber-600">{Number(f.fiber_g).toFixed(0)}f</span>
              <form action={deleteFood.bind(null, f.id)}>
                <button
                  className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
                  aria-label="delete"
                >
                  ✕
                </button>
              </form>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
