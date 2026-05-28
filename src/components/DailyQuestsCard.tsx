import type { Quest } from "@/lib/leveling";

export function DailyQuestsCard({ quests, level }: { quests: Quest[]; level: number }) {
  if (level < 2) {
    return (
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Daily quests</p>
        <p className="text-sm text-slate-600">Reach level 2 to unlock daily quests.</p>
      </div>
    );
  }
  if (quests.length === 0) {
    return null;
  }

  const earned = quests.filter((q) => q.done).reduce((a, q) => a + q.xp, 0);
  const total = quests.reduce((a, q) => a + q.xp, 0);
  const doneCount = quests.filter((q) => q.done).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Daily quests
          </p>
          <p className="font-bold text-slate-900 text-sm">
            {doneCount} / {quests.length} ·{" "}
            <span className="text-amber-700 tabular-nums">+{earned}</span> /{" "}
            <span className="text-slate-500 tabular-nums">{total}</span> XP
          </p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {quests.map((q) => (
          <li
            key={q.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ring-1 ${
              q.done
                ? "bg-emerald-50 ring-emerald-200 text-emerald-900"
                : "bg-slate-50/60 ring-slate-200 text-slate-700"
            }`}
          >
            <span className="text-xs">{q.done ? "✅" : "⬜"}</span>
            <span className={`text-xs font-semibold flex-1 ${q.done ? "line-through opacity-70" : ""}`}>
              {q.label}
            </span>
            <span className="text-[10px] font-bold tabular-nums">+{q.xp}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
