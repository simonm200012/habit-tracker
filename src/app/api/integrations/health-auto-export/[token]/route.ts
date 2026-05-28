import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/cron";
import { isoDate } from "@/lib/habits";

/**
 * Endpoint for the "Health Auto Export" iOS app.
 *
 * Configure the app to POST to:
 *   https://<host>/api/integrations/health-auto-export/<your-token>
 *
 * It posts a JSON payload like:
 * {
 *   "data": {
 *     "metrics": [
 *       { "name": "step_count", "data": [{ "date": "2026-05-27 00:00:00 +0200", "qty": 9421 }] },
 *       { "name": "sleep_analysis", "data": [{ "sleepStart": "...", "sleepEnd": "...", "asleep": 7.8 }] },
 *       { "name": "active_energy", "data": [{ "date": "...", "qty": 412 }] }
 *     ]
 *   }
 * }
 *
 * We map metric names → habit "goal_unit" matchers and upsert a `value` into
 * habit_logs for habits the user has set up that look like a match.
 *
 * Examples of matching habits:
 *   • Goal unit "steps" → step_count
 *   • Goal unit "hrs"   → sleep_analysis (asleep hours)
 *   • Goal unit "kcal"  → active_energy
 *   • Goal unit "min"   → exercise_time
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16) return NextResponse.json({ error: "not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: pref } = await admin
    .from("notification_prefs")
    .select("user_id")
    .eq("health_token", token)
    .maybeSingle();
  if (!pref) return NextResponse.json({ error: "not found" }, { status: 404 });
  const userId = pref.user_id as string;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  // Defensive payload normalization — the iOS app sometimes wraps in {data:{metrics:[]}}
  // and sometimes flattens to {metrics:[]}.
  const metrics: Array<{ name?: string; data?: unknown[] }> = Array.isArray(body?.data?.metrics)
    ? body.data.metrics
    : Array.isArray(body?.metrics)
    ? body.metrics
    : [];

  const { data: habitsData } = await admin
    .from("habits")
    .select("id, name, goal_unit, goal_target")
    .eq("user_id", userId)
    .eq("status", "active");
  const habits = habitsData ?? [];

  if (habits.length === 0) {
    return NextResponse.json({ ok: true, imported: 0, note: "no active habits" });
  }

  // Group totals per (habit_id, isoDay)
  type Key = string; // `${habitId}|${isoDay}`
  const totals = new Map<Key, number>();

  function findHabit(unitGuess: string[], nameContains: string[] = []): { id: string }[] {
    const result: { id: string }[] = [];
    for (const h of habits) {
      const unit = ((h.goal_unit as string) ?? "").toLowerCase();
      const name = ((h.name as string) ?? "").toLowerCase();
      if (unitGuess.some((g) => unit === g)) result.push({ id: h.id as string });
      else if (nameContains.some((n) => name.includes(n))) result.push({ id: h.id as string });
    }
    return result;
  }

  function bump(habitIds: { id: string }[], iso: string, value: number) {
    if (!value || !iso) return;
    for (const h of habitIds) {
      const k: Key = `${h.id}|${iso}`;
      totals.set(k, (totals.get(k) ?? 0) + value);
    }
  }

  function isoFromMixed(s: unknown): string | null {
    if (typeof s !== "string") return null;
    // Accept "2026-05-27 00:00:00 +0200" or full ISO
    const d = new Date(s.replace(" ", "T"));
    if (isNaN(d.getTime())) return null;
    return isoDate(d);
  }

  for (const m of metrics) {
    const name = (m.name ?? "").toLowerCase();
    const data = Array.isArray(m.data) ? m.data : [];

    if (name === "step_count" || name === "steps") {
      const targets = findHabit(["steps", "step"], ["step"]);
      for (const row of data as Array<Record<string, unknown>>) {
        const iso = isoFromMixed(row.date);
        const qty = Number(row.qty ?? row.value ?? 0);
        if (iso && qty > 0) bump(targets, iso, qty);
      }
    } else if (name === "sleep_analysis" || name === "sleep_in_bed") {
      const targets = findHabit(["hrs", "hours", "h"], ["sleep"]);
      for (const row of data as Array<Record<string, unknown>>) {
        const iso = isoFromMixed(row.date ?? row.sleepEnd);
        const hours = Number(row.asleep ?? row.qty ?? 0);
        if (iso && hours > 0) bump(targets, iso, Math.round(hours * 10) / 10);
      }
    } else if (name === "active_energy" || name === "active_energy_burned") {
      const targets = findHabit(["kcal", "cal"], ["calorie", "burn"]);
      for (const row of data as Array<Record<string, unknown>>) {
        const iso = isoFromMixed(row.date);
        const qty = Number(row.qty ?? 0);
        if (iso && qty > 0) bump(targets, iso, Math.round(qty));
      }
    } else if (name === "apple_exercise_time" || name === "exercise_time") {
      const targets = findHabit(["min", "minutes"], ["exercise", "workout"]);
      for (const row of data as Array<Record<string, unknown>>) {
        const iso = isoFromMixed(row.date);
        const qty = Number(row.qty ?? 0);
        if (iso && qty > 0) bump(targets, iso, Math.round(qty));
      }
    } else if (name === "workout" || name === "workouts") {
      const targets = findHabit([], ["workout", "exercise", "gym"]);
      for (const row of data as Array<Record<string, unknown>>) {
        const iso = isoFromMixed(row.date ?? row.startDate);
        const qty = Number(row.duration ?? row.qty ?? 1);
        if (iso) bump(targets, iso, qty);
      }
    }
  }

  if (totals.size === 0) {
    return NextResponse.json({ ok: true, imported: 0, metrics: metrics.length });
  }

  // Upsert each (habit_id, logged_on)
  const rows = Array.from(totals.entries()).map(([k, value]) => {
    const [habit_id, logged_on] = k.split("|");
    return { habit_id, user_id: userId, logged_on, value: Math.round(value * 100) / 100 };
  });

  const { error } = await admin
    .from("habit_logs")
    .upsert(rows, { onConflict: "habit_id,logged_on" });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, imported: rows.length });
}
