import { updateGoals } from "@/app/actions";
import type { Profile } from "@/lib/types";

export function GoalsCard({ profile }: { profile: Profile }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Daily goals</h2>
          <p className="text-xs text-slate-500 mt-0.5">Customize your targets</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center ring-1 ring-violet-100">
          <svg
            className="w-5 h-5 text-violet-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </div>
      </div>

      <form action={updateGoals} className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Calories
          </span>
          <div className="relative">
            <input
              name="daily_calorie_goal"
              type="number"
              min={0}
              defaultValue={profile.daily_calorie_goal}
              className="w-full px-3 py-2 pr-12 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
              kcal
            </span>
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Protein
          </span>
          <div className="relative">
            <input
              name="daily_protein_goal_g"
              type="number"
              min={0}
              defaultValue={profile.daily_protein_goal_g}
              className="w-full px-3 py-2 pr-8 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
              g
            </span>
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Fiber
          </span>
          <div className="relative">
            <input
              name="daily_fiber_goal_g"
              type="number"
              min={0}
              defaultValue={profile.daily_fiber_goal_g}
              className="w-full px-3 py-2 pr-8 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
              g
            </span>
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Water
          </span>
          <div className="relative">
            <input
              name="daily_water_goal_ml"
              type="number"
              min={0}
              defaultValue={profile.daily_water_goal_ml}
              className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
              ml
            </span>
          </div>
        </label>
        <button className="col-span-2 mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-sm transition">
          Save goals
        </button>
      </form>
    </section>
  );
}
