import { TIER_CLASSES, type Achievement } from "@/lib/achievements";

export function AchievementCard({ a, compact }: { a: Achievement; compact?: boolean }) {
  const t = TIER_CLASSES[a.tier];
  return (
    <div
      className={`relative rounded-xl ring-1 p-4 transition ${
        a.unlocked ? `${t.bg} ${t.ring}` : "bg-slate-50/60 ring-slate-200/70"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ring-1 ${
            a.unlocked ? `bg-white ${t.ring}` : "bg-white ring-slate-200 grayscale opacity-40"
          }`}
        >
          {a.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold tracking-tight truncate ${a.unlocked ? "text-slate-900" : "text-slate-600"}`}>
              {a.name}
            </h3>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ring-1 ${
                a.unlocked ? `${t.bg} ${t.text} ${t.ring}` : "bg-slate-100 text-slate-500 ring-slate-200"
              }`}
            >
              {t.label}
            </span>
          </div>
          {!compact && (
            <p className={`text-xs mt-0.5 ${a.unlocked ? "text-slate-700" : "text-slate-500"}`}>
              {a.description}
            </p>
          )}

          {!a.unlocked && (
            <div className="mt-2">
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-500 rounded-full transition-all duration-500"
                  style={{ width: `${a.progress}%` }}
                />
              </div>
              {a.hint && (
                <p className="text-[10px] font-semibold text-slate-500 mt-1 tabular-nums">
                  {a.hint}
                </p>
              )}
            </div>
          )}
          {a.unlocked && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mt-1">
              ✓ Unlocked
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
