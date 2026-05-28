import Link from "next/link";
import type { LevelSnapshot } from "@/lib/leveling";

export function LevelWidget({ snapshot }: { snapshot: LevelSnapshot }) {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-sm p-5 text-white">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Level
          </p>
          <p className="text-3xl font-extrabold tracking-tight tabular-nums">
            {snapshot.level}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">XP</p>
          <p className="text-xl font-bold tabular-nums">{snapshot.xp.toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
          <span>
            {snapshot.xpThisLevel.toLocaleString()} / {snapshot.xpForNextLevel.toLocaleString()} XP
          </span>
          <span>Level {snapshot.level + 1}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all"
            style={{ width: `${Math.min(100, snapshot.progress * 100)}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3 mt-4 text-[11px]">
        <div>
          <span className="text-slate-400 font-semibold uppercase tracking-wider">Today</span>{" "}
          <span className="text-amber-400 font-bold">+{snapshot.streakBonusToday}</span>
        </div>
        <div>
          <span className="text-slate-400 font-semibold uppercase tracking-wider">Perfect</span>{" "}
          <span className="text-emerald-400 font-bold tabular-nums">{snapshot.perfectDays}</span>
        </div>
        <Link href="/levels" className="ml-auto text-slate-300 hover:text-white text-[10px] font-bold uppercase tracking-wider transition">
          See perks →
        </Link>
      </div>
    </div>
  );
}
