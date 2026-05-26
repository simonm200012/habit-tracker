export function ProgressBar({
  value,
  goal,
  color = "bg-emerald-500",
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
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium text-neutral-700">{label}</span>
        <span className="text-xs text-neutral-500 tabular-nums">
          {Math.round(value)} / {goal} {unit}
        </span>
      </div>
      <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
