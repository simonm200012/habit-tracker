import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/cron";
import { isoDate } from "@/lib/habits";

/**
 * Token-protected endpoint for iOS Shortcuts / Siri / Apple Watch automation.
 *
 * GET  /api/shortcut/<token>?action=today              → today's progress
 * GET  /api/shortcut/<token>?action=check&habit=NAME   → check off (or log value) a habit
 * GET  /api/shortcut/<token>?action=uncheck&habit=NAME → undo check-off
 * GET  /api/shortcut/<token>?action=skip-day           → mark today as vacation
 *
 * Habit lookup tolerates partial / case-insensitive names so users can
 * speak naturally to Siri.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return handle(req, await params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return handle(req, await params);
}

async function handle(req: NextRequest, { token }: { token: string }) {
  if (!token || token.length < 16) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("shortcut_tokens")
    .select("user_id, label")
    .eq("token", token)
    .maybeSingle();
  if (!tokenRow) {
    return NextResponse.json({ ok: false, error: "invalid token" }, { status: 401 });
  }

  // Record usage (best-effort)
  admin
    .from("shortcut_tokens")
    .update({ last_used_at: new Date().toISOString(), use_count: 1 })
    .eq("token", token)
    .then(() => {});

  const url = new URL(req.url);
  const action = (url.searchParams.get("action") ?? "today").toLowerCase();
  const userId = tokenRow.user_id as string;
  const todayIso = isoDate(new Date());

  try {
    switch (action) {
      case "today":
        return await today(admin, userId, todayIso);
      case "check":
      case "log": {
        const habitName = url.searchParams.get("habit");
        const value = url.searchParams.get("value");
        if (!habitName) return badReq("habit param required");
        return await check(admin, userId, habitName, value, todayIso);
      }
      case "uncheck": {
        const habitName = url.searchParams.get("habit");
        if (!habitName) return badReq("habit param required");
        return await uncheck(admin, userId, habitName, todayIso);
      }
      case "skip-day":
      case "vacation":
        return await skipDay(admin, userId, todayIso);
      default:
        return badReq(`unknown action: ${action}`);
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

function badReq(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

async function today(admin: ReturnType<typeof createAdminClient>, userId: string, todayIso: string) {
  const [{ data: habits }, { data: logs }] = await Promise.all([
    admin.from("habits").select("id, name, category, goal_target, goal_unit").eq("user_id", userId).eq("status", "active"),
    admin.from("habit_logs").select("habit_id, value").eq("user_id", userId).eq("logged_on", todayIso),
  ]);

  const doneMap = new Map<string, number | null>();
  for (const l of logs ?? []) doneMap.set(l.habit_id as string, (l as { value: number | null }).value);

  const items = (habits ?? []).map((h) => ({
    name: h.name,
    category: h.category,
    done: doneMap.has(h.id as string),
    value: doneMap.get(h.id as string) ?? null,
    goal: h.goal_target,
    unit: h.goal_unit,
  }));
  const doneCount = items.filter((i) => i.done).length;

  return NextResponse.json({
    ok: true,
    date: todayIso,
    total: items.length,
    done: doneCount,
    remaining: items.length - doneCount,
    summary: `${doneCount}/${items.length} habits done today.`,
    items,
  });
}

async function check(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  habitName: string,
  value: string | null,
  todayIso: string,
) {
  const habit = await resolveHabit(admin, userId, habitName);
  if (!habit) return notFoundHabit(habitName);

  const row: { habit_id: string; user_id: string; logged_on: string; value?: number } = {
    habit_id: habit.id,
    user_id: userId,
    logged_on: todayIso,
  };
  if (value !== null && value !== "") {
    const num = Number(value);
    if (Number.isFinite(num)) row.value = num;
  }

  const { error } = await admin.from("habit_logs").upsert(row, { onConflict: "habit_id,logged_on" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    summary: `✅ ${habit.name}${row.value !== undefined ? ` · ${row.value}${habit.goal_unit ?? ""}` : ""} logged.`,
    habit: habit.name,
    date: todayIso,
    value: row.value ?? null,
  });
}

async function uncheck(admin: ReturnType<typeof createAdminClient>, userId: string, habitName: string, todayIso: string) {
  const habit = await resolveHabit(admin, userId, habitName);
  if (!habit) return notFoundHabit(habitName);
  const { error } = await admin
    .from("habit_logs")
    .delete()
    .eq("habit_id", habit.id)
    .eq("user_id", userId)
    .eq("logged_on", todayIso);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, summary: `Unchecked ${habit.name} for today.`, habit: habit.name });
}

async function skipDay(admin: ReturnType<typeof createAdminClient>, userId: string, todayIso: string) {
  const { error } = await admin
    .from("vacation_days")
    .upsert({ user_id: userId, day: todayIso }, { onConflict: "user_id,day" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, summary: "Today marked as skip day — streaks paused." });
}

async function resolveHabit(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  nameQuery: string,
): Promise<{ id: string; name: string; goal_unit: string | null } | null> {
  const lower = nameQuery.toLowerCase().trim();
  const { data: habits } = await admin
    .from("habits")
    .select("id, name, goal_unit")
    .eq("user_id", userId)
    .eq("status", "active");
  if (!habits) return null;
  // Exact match first
  const exact = habits.find((h) => (h.name as string).toLowerCase() === lower);
  if (exact) return exact as { id: string; name: string; goal_unit: string | null };
  // Then starts-with
  const startsWith = habits.find((h) => (h.name as string).toLowerCase().startsWith(lower));
  if (startsWith) return startsWith as { id: string; name: string; goal_unit: string | null };
  // Then contains
  const contains = habits.find((h) => (h.name as string).toLowerCase().includes(lower));
  if (contains) return contains as { id: string; name: string; goal_unit: string | null };
  return null;
}

function notFoundHabit(name: string) {
  return NextResponse.json({ ok: false, error: `No active habit matching "${name}"` }, { status: 404 });
}
