import { createClient } from "@/lib/supabase/server";
import { ALL_THEMES, computeLevel, perksForLevel, xpForLevel } from "@/lib/leveling";
import { groupLogs } from "@/lib/habits";
import type { Habit } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LevelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [habitsRes, logsRes, vacRes] = await Promise.all([
    supabase.from("habits").select("*"),
    supabase.from("habit_logs").select("habit_id, logged_on"),
    supabase.from("vacation_days").select("day"),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const allLogs = (logsRes.data ?? []) as Array<{ habit_id: string; logged_on: string }>;
  const vacationDays = new Set((vacRes.data ?? []).map((r) => r.day as string));
  const snapshot = computeLevel(habits, allLogs, vacationDays);

  const upcoming = [snapshot.level + 1, snapshot.level + 2, snapshot.level + 3, snapshot.level + 5, snapshot.level + 10];

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-4xl mx-auto">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Levels &amp; perks</h1>
        <p className="text-slate-600 text-sm mt-1">Earn XP by checking off habits, maintaining streaks, and hitting perfect days.</p>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-sm p-7 text-white mb-7">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">You&apos;re at</p>
        <p className="text-6xl font-extrabold tabular-nums tracking-tight bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent mb-3">
          Level {snapshot.level}
        </p>
        <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
          <span className="tabular-nums">{snapshot.xp.toLocaleString()} XP</span>
          <span className="tabular-nums">{xpForLevel(snapshot.level + 1).toLocaleString()} needed for L{snapshot.level + 1}</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all"
            style={{ width: `${Math.min(100, snapshot.progress * 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5 text-sm">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Check-offs</p>
            <p className="text-2xl font-bold tabular-nums">{snapshot.totalCheckoffs}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Perfect days</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-300">{snapshot.perfectDays}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Today bonus</p>
            <p className="text-2xl font-bold tabular-nums text-amber-300">+{snapshot.streakBonusToday}</p>
          </div>
        </div>
      </section>

      {/* Themes */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 mb-5">
        <h2 className="text-base font-bold text-slate-900 tracking-tight mb-1">Themes</h2>
        <p className="text-xs text-slate-500 mb-4">Unlocked by leveling up. Locked themes will swap in automatically once you reach the level.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ALL_THEMES.map((t) => {
            const unlocked = snapshot.level >= t.level;
            return (
              <div
                key={t.id}
                className={`p-4 rounded-2xl ring-1 ${
                  unlocked
                    ? "bg-white ring-slate-200"
                    : "bg-slate-50 ring-slate-200 opacity-60"
                }`}
              >
                <div className="w-full h-16 rounded-xl mb-3" style={{ background: t.accent }} />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-900">{t.name}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      unlocked
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {unlocked ? "Unlocked" : `L${t.level}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Perks unlocked */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 mb-5">
        <h2 className="text-base font-bold text-slate-900 tracking-tight mb-3">Perks you&apos;ve unlocked</h2>
        <ul className="space-y-1.5">
          {perksForLevel(snapshot.level).map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="text-emerald-600">✓</span>
              <span className="font-semibold">{p}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Upcoming */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 mb-5">
        <h2 className="text-base font-bold text-slate-900 tracking-tight mb-3">Coming up</h2>
        <ul className="space-y-2">
          {upcoming.slice(0, 5).map((lvl) => {
            const xp = xpForLevel(lvl);
            const remain = xp - snapshot.xp;
            const perks = perksForLevel(lvl).slice(perksForLevel(snapshot.level).length);
            return (
              <li key={lvl} className="p-3 rounded-xl bg-slate-50/60 ring-1 ring-slate-200">
                <div className="flex justify-between items-baseline mb-1">
                  <p className="font-bold text-slate-900 text-sm">Level {lvl}</p>
                  <p className="text-[11px] text-slate-500 font-bold tabular-nums">
                    {remain > 0 ? `${remain.toLocaleString()} XP to go` : "Unlocked"}
                  </p>
                </div>
                {perks.length > 0 ? (
                  <p className="text-xs text-slate-600">Unlocks: {perks.join(", ")}</p>
                ) : (
                  <p className="text-xs text-slate-500 italic">No new perks at this level.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="text-center mt-7">
        <Link href={`/wrapped/${new Date().getFullYear()}`} className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition">
          See your year in review →
        </Link>
      </div>
    </main>
  );
}
