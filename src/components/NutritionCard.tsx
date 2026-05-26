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
    <section className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 lg:col-span-2">
      <h2 className="text-lg font-semibold mb-4">Nutrition</h2>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <ProgressBar
          value={totals.calories}
          goal={profile.daily_calorie_goal}
          label="Calories"
          unit="kcal"
          color="bg-orange-500"
        />
        <ProgressBar
          value={totals.protein}
          goal={profile.daily_protein_goal_g}
          label="Protein"
          unit="g"
          color="bg-rose-500"
        />
        <ProgressBar
          value={totals.fiber}
          goal={profile.daily_fiber_goal_g}
          label="Fiber"
          unit="g"
          color="bg-amber-500"
        />
      </div>

      <div className="text-xs text-neutral-500 mb-3 flex gap-4">
        <span>Carbs: <b className="text-neutral-700">{totals.carbs.toFixed(0)}g</b></span>
        <span>Fat: <b className="text-neutral-700">{totals.fat.toFixed(0)}g</b></span>
      </div>

      <form action={addFood} className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4">
        <input
          name="name"
          placeholder="Food name"
          required
          className="col-span-2 px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
        />
        <input name="calories" type="number" min={0} placeholder="kcal" className="px-2 py-2 rounded-lg border border-neutral-200 text-sm" />
        <input name="protein_g" type="number" min={0} step="0.1" placeholder="protein" className="px-2 py-2 rounded-lg border border-neutral-200 text-sm" />
        <input name="fiber_g" type="number" min={0} step="0.1" placeholder="fiber" className="px-2 py-2 rounded-lg border border-neutral-200 text-sm" />
        <button className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium">
          Add
        </button>
      </form>

      <ul className="space-y-1 max-h-48 overflow-y-auto">
        {foods.length === 0 && (
          <li className="text-sm text-neutral-400 italic">No food logged today.</li>
        )}
        {foods.map((f) => (
          <li key={f.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg hover:bg-neutral-50">
            <span className="font-medium">{f.name}</span>
            <span className="text-neutral-500 text-xs flex items-center gap-3">
              <span>{f.calories} kcal</span>
              <span>{Number(f.protein_g).toFixed(0)}p</span>
              <span>{Number(f.fiber_g).toFixed(0)}f</span>
              <form action={deleteFood.bind(null, f.id)}>
                <button className="text-neutral-300 hover:text-red-500" aria-label="delete">✕</button>
              </form>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
