export function StatCard({
  label,
  value,
  unit,
  hint,
  trend,
  icon,
  accent = "slate",
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  trend?: { value: number; positive: boolean };
  icon: React.ReactNode;
  accent?: "slate" | "emerald" | "sky" | "amber" | "rose" | "violet";
}) {
  const accents: Record<string, { bg: string; text: string; ring: string }> = {
    slate:   { bg: "bg-slate-50",   text: "text-slate-700",   ring: "ring-slate-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-200" },
    violet:  { bg: "bg-violet-50",  text: "text-violet-700",  ring: "ring-violet-200" },
  };
  const a = accents[accent];

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 ${a.bg} ${a.text} ${a.ring}`}>
          {icon}
        </div>
        {trend && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-md tabular-nums ${
              trend.positive
                ? "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200"
                : "text-rose-700 bg-rose-50 ring-1 ring-rose-200"
            }`}
          >
            {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1 tabular-nums">
        {value}
        {unit && <span className="text-lg text-slate-400 font-semibold ml-1">{unit}</span>}
      </p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
