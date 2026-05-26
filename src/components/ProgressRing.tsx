export function ProgressBar({
  value,
  goal,
  color = "from-emerald-500 to-emerald-600",
  label,
  unit,
}: {
  value: number;
  goal: number;
  color?: string;
  label: string;
  unit: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <span className="text-xs font-medium text-slate-600 tabular-nums">
          <span className="text-slate-900 font-semibold">{Math.round(value)}</span>
          <span className="text-slate-400"> / {goal} {unit}</span>
        </span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden ring-1 ring-inset ring-slate-200/60">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-500 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
