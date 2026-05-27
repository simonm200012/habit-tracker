import { createClient } from "@/lib/supabase/server";
import { categoryMeta } from "@/lib/categories";
import { generateInsights } from "@/lib/insights";
import {
  addDays,
  currentStreak,
  dateRange,
  groupLogs,
  isScheduled,
  isoDate,
} from "@/lib/habits";
import type { Habit } from "@/lib/types";

/**
 * "Morning brief" — designed to look like a daily email digest.
 * Wire this into a Vercel Cron + Resend later to send it as a real email at e.g. 7am.
 */
export default async function DigestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const yesterday = addDays(today, -1);
  const yesterdayIso = isoDate(yesterday);
  const todayIso = isoDate(today);
  const startWindow = addDays(today, -29);

  const [habitsRes, logsRes, vacRes] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("status", "active")
      .order("display_order"),
    supabase.from("habit_logs").select("habit_id, logged_on").gte("logged_on", isoDate(startWindow)),
    supabase.from("vacation_days").select("day").gte("day", isoDate(startWindow)),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const logsByHabit = groupLogs(logsRes.data ?? []);
  const vacationDays = new Set((vacRes.data ?? []).map((r) => r.day as string));

  // Yesterday's recap
  const yScheduled = habits.filter((h) => isScheduled(h, yesterday) && !vacationDays.has(yesterdayIso));
  const yCompleted = yScheduled.filter((h) => logsByHabit.get(h.id)?.has(yesterdayIso));
  const yMissed = yScheduled.filter((h) => !logsByHabit.get(h.id)?.has(yesterdayIso));

  // Today's plan
  const todayHabits = habits.filter((h) => isScheduled(h, today));

  // Insights
  const insights = generateInsights({ habits, logsByHabit, vacationDays, today }, 3);

  // Top streaks
  const topStreaks = habits
    .map((h) => ({ h, s: currentStreak(h, logsByHabit.get(h.id) ?? new Set(), today, vacationDays) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  const userName = user.email?.split("@")[0] ?? "there";

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 text-center">
          Preview of your morning brief
        </p>

        {/* "Email" frame */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden ring-1 ring-slate-200">
          {/* From/Subject line */}
          <div className="px-7 pt-6 pb-4 border-b border-slate-100">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">From</p>
            <p className="text-sm font-bold text-slate-900">habit-tracker &lt;digest@habit-tracker.app&gt;</p>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-2">Subject</p>
            <p className="text-sm font-bold text-slate-900">
              Your morning brief — {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>

          {/* Hero */}
          <div className="px-7 py-6 bg-gradient-to-br from-slate-900 to-slate-700 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Good morning, {userName}
            </p>
            <h1 className="text-2xl font-bold tracking-tight mt-1">
              {todayHabits.length} {todayHabits.length === 1 ? "habit" : "habits"} on your plate today.
            </h1>
          </div>

          <div className="px-7 py-6 space-y-6">
            {/* Yesterday */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                Yesterday
              </h2>
              {yScheduled.length === 0 ? (
                <p className="text-sm text-slate-600 italic">Nothing scheduled.</p>
              ) : (
                <p className="text-sm text-slate-700 leading-relaxed">
                  You completed <b className="text-emerald-700">{yCompleted.length} of {yScheduled.length}</b>{" "}
                  {yScheduled.length === 1 ? "habit" : "habits"} (
                  {Math.round((yCompleted.length / yScheduled.length) * 100)}%).
                </p>
              )}
              {yMissed.length > 0 && (
                <p className="text-xs text-rose-700 mt-2 font-medium">
                  Missed: {yMissed.map((h) => h.name).join(", ")}
                </p>
              )}
            </section>

            {/* Top streaks */}
            {topStreaks.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Top streaks
                </h2>
                <ul className="space-y-2">
                  {topStreaks.map(({ h, s }) => {
                    const cat = categoryMeta(h.category);
                    return (
                      <li key={h.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/70 ring-1 ring-amber-100">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center ring-1 ${cat.bg} ${cat.ring}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
                            <path d={cat.icon} />
                          </svg>
                        </div>
                        <span className="font-semibold text-slate-900 flex-1">{h.name}</span>
                        <span className="text-amber-700 font-bold tabular-nums flex items-center gap-1">
                          🔥 {s}d
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Today's plan */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                Today
              </h2>
              {todayHabits.length === 0 ? (
                <p className="text-sm text-slate-600 italic">Rest day — nothing scheduled.</p>
              ) : (
                <ul className="space-y-1.5">
                  {todayHabits.map((h) => {
                    const done = logsByHabit.get(h.id)?.has(todayIso) ?? false;
                    const cat = categoryMeta(h.category);
                    return (
                      <li
                        key={h.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg ${
                          done ? "bg-emerald-50/60 ring-1 ring-emerald-100" : "bg-slate-50"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded shrink-0 ${
                            done ? "bg-emerald-600" : "bg-white border-2 border-slate-300"
                          } flex items-center justify-center`}
                        >
                          {done && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center ring-1 ${cat.bg} ${cat.ring}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
                            <path d={cat.icon} />
                          </svg>
                        </div>
                        <span className={`font-medium flex-1 ${done ? "text-slate-500 line-through" : "text-slate-900"}`}>
                          {h.name}
                        </span>
                        {h.reminder_time && (
                          <span className="text-xs font-bold tabular-nums text-slate-500">
                            {h.reminder_time.slice(0, 5)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Insights */}
            {insights.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Insights
                </h2>
                <ul className="space-y-2">
                  {insights.map((i) => (
                    <li
                      key={i.id}
                      className={`p-3 rounded-xl ring-1 ${
                        i.tone === "warning"
                          ? "bg-amber-50/70 ring-amber-200"
                          : i.tone === "positive"
                          ? "bg-emerald-50/70 ring-emerald-200"
                          : "bg-slate-50 ring-slate-200"
                      }`}
                    >
                      <p className="font-bold text-slate-900 text-sm tracking-tight">
                        {i.icon} {i.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{i.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Footer */}
            <div className="border-t border-slate-100 pt-5 text-center">
              <a
                href="/dashboard"
                className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition"
              >
                Open habit-tracker →
              </a>
              <p className="text-[10px] text-slate-400 mt-4">
                This is a preview. To receive this as a real email each morning, wire it up to a Vercel Cron + Resend / SendGrid.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
