import { addWater } from "@/app/actions";
import { ProgressBar } from "./ProgressRing";

export function WaterCard({
  total,
  goal,
}: {
  total: number;
  goal: number;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Water</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {pct}% of daily goal
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center ring-1 ring-sky-100">
          <svg
            className="w-5 h-5 text-sky-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2.5s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z" />
          </svg>
        </div>
      </div>

      <ProgressBar
        value={total}
        goal={goal}
        label="Today"
        unit="ml"
        color="from-sky-500 to-cyan-500"
      />

      <div className="grid grid-cols-3 gap-2 mt-5">
        {[250, 500, 750].map((ml) => (
          <form key={ml} action={addWater}>
            <input type="hidden" name="amount_ml" value={ml} />
            <button className="w-full py-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-sm font-semibold ring-1 ring-sky-100 hover:ring-sky-200 transition">
              +{ml} ml
            </button>
          </form>
        ))}
      </div>

      <form action={addWater} className="flex gap-2 mt-2">
        <input
          name="amount_ml"
          type="number"
          min={1}
          placeholder="custom ml"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-sm transition"
        />
        <button className="px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition">
          Add
        </button>
      </form>
    </section>
  );
}
