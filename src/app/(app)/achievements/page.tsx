import { createClient } from "@/lib/supabase/server";
import { AchievementCard } from "@/components/AchievementCard";
import { evaluateAchievements } from "@/lib/achievements";
import { addDays, groupLogs, isoDate } from "@/lib/habits";
import type { Habit } from "@/lib/types";

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const startWindow = addDays(today, -179);

  const [habitsRes, logsRes, vacRes] = await Promise.all([
    supabase.from("habits").select("*"),
    supabase.from("habit_logs").select("habit_id, logged_on").gte("logged_on", isoDate(startWindow)),
    supabase.from("vacation_days").select("day"),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const logsByHabit = groupLogs(logsRes.data ?? []);
  const vacationDays = new Set((vacRes.data ?? []).map((r) => r.day as string));

  const achievements = evaluateAchievements({ habits, logsByHabit, vacationDays, today });
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  const unlockedPct = achievements.length === 0
    ? 0
    : Math.round((unlocked.length / achievements.length) * 100);

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Achievements</h1>
          <p className="text-slate-600 text-sm mt-1">
            Milestones unlock as you build consistency.
          </p>
        </div>
        <div className="px-4 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Progress</p>
          <p className="text-sm font-bold text-slate-900 tabular-nums">
            {unlocked.length} <span className="text-slate-400">/ {achievements.length}</span>{" "}
            <span className="text-emerald-600">({unlockedPct}%)</span>
          </p>
        </div>
      </div>

      {unlocked.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
            Unlocked · {unlocked.length}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unlocked.map((a) => (
              <AchievementCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
            Up next · {locked.length}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locked.map((a) => (
              <AchievementCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
