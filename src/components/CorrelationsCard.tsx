import type { Correlation } from "@/lib/correlations";

export function CorrelationsCard({ correlations }: { correlations: Correlation[] }) {
  const top = correlations.filter((c) => Math.abs(c.phi) > 0.15).slice(0, 6);

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Habit correlations</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Which habits tend to be done (or skipped) together over the last 90 days.
        </p>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-slate-500 italic py-6 text-center">
          Need more co-occurrence data. Keep checking off and these will fill in.
        </p>
      ) : (
        <ul className="space-y-2">
          {top.map((c) => {
            const pct = Math.round(Math.abs(c.phi) * 100);
            const positive = c.phi > 0;
            return (
              <li
                key={`${c.habitA.id}-${c.habitB.id}`}
                className="p-3 rounded-xl bg-slate-50/60 ring-1 ring-slate-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm truncate">
                      {c.habitA.name}
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        positive ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {positive ? "↔ together" : "✗ apart"}
                    </span>
                    <span className="font-bold text-slate-900 text-sm truncate">
                      {c.habitB.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {c.jointDone} days both done · {c.daysOverlap} overlapping days
                  </p>
                </div>
                <div className="shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold tabular-nums ${
                      positive
                        ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                        : "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                    }`}
                  >
                    {positive ? "+" : "−"}
                    {pct}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
