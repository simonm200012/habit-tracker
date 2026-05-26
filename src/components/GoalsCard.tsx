import { updateGoals } from "@/app/actions";
import type { Profile } from "@/lib/types";

export function GoalsCard({ profile }: { profile: Profile }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
      <h2 className="text-lg font-semibold mb-4">Daily goals</h2>
      <form action={updateGoals} className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-neutral-600">Calories (kcal)</span>
          <input
            name="daily_calorie_goal"
            type="number"
            min={0}
            defaultValue={profile.daily_calorie_goal}
            className="px-2 py-1.5 rounded-lg border border-neutral-200"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-600">Protein (g)</span>
          <input
            name="daily_protein_goal_g"
            type="number"
            min={0}
            defaultValue={profile.daily_protein_goal_g}
            className="px-2 py-1.5 rounded-lg border border-neutral-200"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-600">Fiber (g)</span>
          <input
            name="daily_fiber_goal_g"
            type="number"
            min={0}
            defaultValue={profile.daily_fiber_goal_g}
            className="px-2 py-1.5 rounded-lg border border-neutral-200"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-600">Water (ml)</span>
          <input
            name="daily_water_goal_ml"
            type="number"
            min={0}
            defaultValue={profile.daily_water_goal_ml}
            className="px-2 py-1.5 rounded-lg border border-neutral-200"
          />
        </label>
        <button className="col-span-2 mt-1 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium">
          Save goals
        </button>
      </form>
    </section>
  );
}
