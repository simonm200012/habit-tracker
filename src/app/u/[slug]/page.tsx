import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryMeta } from "@/lib/categories";
import { evaluateAchievements, TIER_CLASSES } from "@/lib/achievements";
import {
  addDays,
  bestStreak,
  completionRate,
  currentStreak,
  groupLogs,
  isoDate,
} from "@/lib/habits";
import type { Habit, PublicProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle<PublicProfile>();

  if (!profile) notFound();

  const today = new Date();
  const start = addDays(today, -89);

  const [habitsRes, logsRes] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", profile.user_id)
      .eq("status", "active")
      .order("display_order"),
    supabase
      .from("habit_logs")
      .select("habit_id, logged_on, value")
      .eq("user_id", profile.user_id)
      .gte("logged_on", isoDate(start)),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const logsByHabit = groupLogs(logsRes.data ?? []);

  // Top streaks
  const topStreaks = habits
    .map((h) => ({
      h,
      streak: currentStreak(h, logsByHabit.get(h.id) ?? new Set(), today),
      best: bestStreak(h, logsByHabit.get(h.id) ?? new Set()),
      rate30: completionRate(h, logsByHabit.get(h.id) ?? new Set(), 30),
    }))
    .filter((x) => profile.show_streaks)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 8);

  const totalCheckoffs = Array.from(logsByHabit.values()).reduce((s, set) => s + set.size, 0);
  const longestStreak = habits.reduce(
    (m, h) => Math.max(m, bestStreak(h, logsByHabit.get(h.id) ?? new Set())),
    0,
  );
  const activeStreaks = habits.reduce(
    (s, h) => s + currentStreak(h, logsByHabit.get(h.id) ?? new Set(), today),
    0,
  );

  const achievements = profile.show_achievements
    ? evaluateAchievements({ habits, logsByHabit, vacationDays: new Set(), today }).filter((a) => a.unlocked)
    : [];

  const displayName = profile.display_name?.trim() || profile.slug;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl shadow-lg p-7 mb-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-20 h-20 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center text-3xl font-black backdrop-blur">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Habit tracker
              </p>
              <h1 className="text-3xl font-bold tracking-tight mt-1">{displayName}</h1>
              <p className="text-sm text-slate-300 mt-1 font-medium">/u/{profile.slug}</p>
              {profile.bio && (
                <p className="text-sm text-slate-200 mt-3 max-w-xl leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>

          {profile.show_streaks && (
            <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-white/10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active streaks</p>
                <p className="text-3xl font-bold mt-1 tabular-nums">
                  🔥 {activeStreaks}<span className="text-base text-slate-400 font-semibold ml-1">d</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Longest streak</p>
                <p className="text-3xl font-bold mt-1 tabular-nums">
                  {longestStreak}<span className="text-base text-slate-400 font-semibold ml-1">d</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total check-offs</p>
                <p className="text-3xl font-bold mt-1 tabular-nums">{totalCheckoffs}</p>
              </div>
            </div>
          )}
        </div>

        {/* Top streaks */}
        {profile.show_streaks && topStreaks.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 mb-6">
            <h2 className="text-base font-bold text-slate-900 tracking-tight mb-4">
              Top habits
            </h2>
            <ul className="space-y-2">
              {topStreaks.map(({ h, streak, best, rate30 }) => {
                const cat = categoryMeta(h.category);
                return (
                  <li
                    key={h.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ${cat.bg} ${cat.ring}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
                        <path d={cat.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{h.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {h.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Streak</p>
                        <p className="text-sm font-bold text-amber-700 tabular-nums">🔥 {streak}d</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Best</p>
                        <p className="text-sm font-bold text-slate-700 tabular-nums">{best}d</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">30d</p>
                        <p className={`text-sm font-bold tabular-nums ${rate30 >= 80 ? "text-emerald-700" : rate30 >= 50 ? "text-amber-700" : "text-rose-700"}`}>
                          {rate30}%
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 mb-6">
            <h2 className="text-base font-bold text-slate-900 tracking-tight mb-4">
              Achievements · {achievements.length} unlocked
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {achievements.slice(0, 8).map((a) => {
                const t = TIER_CLASSES[a.tier];
                return (
                  <div
                    key={a.id}
                    className={`p-3 rounded-xl ring-1 ${t.bg} ${t.ring} text-center`}
                  >
                    <p className="text-2xl mb-1">{a.icon}</p>
                    <p className="font-bold text-xs text-slate-900 tracking-tight">{a.name}</p>
                    <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${t.text}`}>
                      {t.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="text-center mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            Build your own habit tracker →
          </Link>
        </div>
      </div>
    </main>
  );
}
