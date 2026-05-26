import { addWater } from "@/app/actions";
import { ProgressBar } from "./ProgressRing";

export function WaterCard({
  total,
  goal,
}: {
  total: number;
  goal: number;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
      <h2 className="text-lg font-semibold mb-4">Water</h2>

      <ProgressBar value={total} goal={goal} label="Today" unit="ml" color="bg-sky-500" />

      <div className="grid grid-cols-3 gap-2 mt-4">
        {[250, 500, 750].map((ml) => (
          <form key={ml} action={addWater}>
            <input type="hidden" name="amount_ml" value={ml} />
            <button className="w-full py-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-sm font-medium transition">
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
          className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
        />
        <button className="px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium">
          Add
        </button>
      </form>
    </section>
  );
}
